// Rewrite package.json to a snapshot version. Called by scripts/publish.mjs
// before spawning `npm publish --registry=... --tag=snapshot`. Registry and
// tag are passed via CLI (which trumps publishConfig), so this script only
// has to touch the version. The original package.json is backed up to
// package.json.orig and restored by scripts/restore-after-publish.mjs.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PKG = resolve(process.cwd(), 'package.json')
const BACKUP = resolve(process.cwd(), 'package.json.orig')

function gitBranch() {
  // GitHub Actions runs in detached HEAD; prefer GITHUB_REF_NAME there.
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'nogit'
  }
}

function slug(branch) {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function utcStamp() {
  // 20260422-114530 — SemVer prerelease identifiers allow [0-9A-Za-z-].
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  )
}

if (existsSync(BACKUP)) {
  console.error(
    `[publish] ${BACKUP} already exists — a previous publish may have aborted.\n` +
      `         Run: npm run publish:restore, then retry.`,
  )
  process.exit(1)
}

const branch = gitBranch()
const pkg = JSON.parse(readFileSync(PKG, 'utf8'))
const base = String(pkg.version).split('-')[0]
const snapshot = `${base}-snapshot.${slug(branch)}.${utcStamp()}.${gitShortSha()}`

copyFileSync(PKG, BACKUP)
pkg.version = snapshot
writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n')

console.log(`[publish] snapshot ${pkg.name}@${snapshot}`)
