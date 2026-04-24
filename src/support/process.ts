import { spawn, ChildProcess } from 'node:child_process'
import { createWriteStream, WriteStream, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Options for {@link spawnServiceUnderTest}.
 */
export interface SpawnServiceOptions {
  /** Human-readable name used in error messages and log prefixes. */
  name: string
  /** Working directory for the child process. */
  cwd: string
  /** Command to execute (e.g. "go" or a prebuilt binary path). */
  cmd: string
  /** Arguments to pass to the command. */
  args?: string[]
  /** Environment variables. */
  env?: NodeJS.ProcessEnv
  /**
   * Path to write stdout+stderr. Parent directories are created as needed.
   * Omit to discard output.
   */
  logFile?: string
  /**
   * Readiness check. Either an HTTP URL to poll for a 2xx response, or a
   * custom async predicate. Poll cadence is 250ms, total deadline is the
   * `healthTimeoutMs` option (default 60s).
   */
  readyCheck: { url: string } | { probe: () => Promise<boolean> }
  /** Readiness timeout. Default 60s. */
  healthTimeoutMs?: number
}

/**
 * Handle returned by {@link spawnServiceUnderTest}. Call `stop()` from the
 * consumer's AfterAll hook.
 */
export interface SpawnServiceHandle {
  /** The underlying child process. */
  process: ChildProcess
  /** Resolves once the service passes its readiness check. */
  ready: Promise<void>
  /** Send SIGINT to the process group and wait up to 5s before SIGKILL. */
  stop: () => Promise<void>
}

/**
 * Spawn a service-under-test (API, worker, sidecar) with the same lifecycle
 * guarantees we've found we actually need:
 *
 * - Detached process group so SIGINT/SIGKILL reaches every child the binary
 *   spawns itself (go-run chains are the motivating case).
 * - stdout+stderr piped to a log file so Cucumber's own console stays clean
 *   but crash output is recoverable post-hoc.
 * - Unexpected-exit logging: anything that dies before stop() is called gets
 *   a clear console error instead of a mysteriously hanging test run.
 * - Readiness gate: either HTTP poll or caller-supplied probe, same 250ms
 *   cadence as the DB/Redis waiters.
 */
export function spawnServiceUnderTest(opts: SpawnServiceOptions): SpawnServiceHandle {
  const timeoutMs = opts.healthTimeoutMs ?? 60_000
  let log: WriteStream | undefined
  if (opts.logFile) {
    mkdirSync(dirname(opts.logFile), { recursive: true })
    log = createWriteStream(opts.logFile, { flags: 'w' })
  }

  const proc = spawn(opts.cmd, opts.args ?? [], {
    cwd: opts.cwd,
    env: opts.env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (log) {
    proc.stdout?.pipe(log)
    proc.stderr?.pipe(log)
  }

  let stopping = false
  proc.on('exit', (code) => {
    if (!stopping) {
      console.error(`[${opts.name}] exited unexpectedly with code ${code}`)
    }
  })

  const ready = waitReady(opts, timeoutMs)

  return {
    process: proc,
    ready,
    async stop() {
      stopping = true
      if (!proc.pid) return
      try {
        process.kill(-proc.pid, 'SIGINT')
      } catch {
        /* already dead */
      }
      const deadline = Date.now() + 5_000
      while (proc.exitCode === null && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100))
      }
      if (proc.exitCode === null) {
        try {
          process.kill(-proc.pid, 'SIGKILL')
        } catch {
          /* ignore */
        }
      }
      log?.end()
    },
  }
}

async function waitReady(opts: SpawnServiceOptions, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  const probe =
    'url' in opts.readyCheck
      ? async () => {
          try {
            const res = await fetch((opts.readyCheck as { url: string }).url)
            return res.ok
          } catch {
            return false
          }
        }
      : opts.readyCheck.probe

  while (Date.now() < deadline) {
    if (await probe()) return
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`${opts.name} did not become ready within ${timeoutMs}ms`)
}
