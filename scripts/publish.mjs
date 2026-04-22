// Publish entry point. On main, delegates to `npm publish` unchanged (which
// release-please/CI uses to push to GitHub Packages). On any other branch,
// mutates package.json to a snapshot version and publishes to the local
// Verdaccio at http://localhost:4873 with the dist-tag `snapshot`.
//
// Why a wrapper: a scoped package's publish target is resolved from
// `@scope:registry` in .npmrc / publishConfig, neither of which a lifecycle
// hook can reliably override mid-flight. CLI `--@<scope>:registry=<url>`
// does override both, so we drive the publish from here.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCAL_REGISTRY = 'http://localhost:4873'
const SNAPSHOT_TAG = 'snapshot'

function scopeOf(pkgName) {
  const m = /^(@[^/]+)\//.exec(pkgName)
  return m ? m[1] : null
}
const HERE = new URL('.', import.meta.url).pathname
const PREPARE = resolve(HERE, 'prepare-snapshot-publish.mjs')
const RESTORE = resolve(HERE, 'restore-after-publish.mjs')

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with status ${result.status}`)
  }
}

function currentBranch() {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME
  const res = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' })
  return (res.stdout ?? '').trim()
}

const branch = currentBranch()

if (branch === 'main') {
  console.log('[publish] main branch — delegating to plain `npm publish`')
  run('npm', ['publish'])
  process.exit(0)
}

console.log(`[publish] branch=${branch} — snapshot publish to ${LOCAL_REGISTRY}`)

if (existsSync(resolve(process.cwd(), 'package.json.orig'))) {
  console.error('[publish] package.json.orig exists — run `npm run publish:restore` first.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
const scope = scopeOf(pkg.name)
const args = ['publish', '--tag', SNAPSHOT_TAG, '--registry', LOCAL_REGISTRY]
if (scope) args.push(`--${scope}:registry=${LOCAL_REGISTRY}`)

run('node', [PREPARE])
try {
  run('npm', args)
} finally {
  run('node', [RESTORE])
}
