// Restore package.json from the backup created by
// scripts/prepare-snapshot-publish.mjs. Invoked from scripts/publish.mjs in
// its finally block, and also exposed as `npm run publish:restore` for
// manual recovery when a publish aborts. Idempotent: no-op if no backup.
import { existsSync, renameSync } from 'node:fs'
import { resolve } from 'node:path'

const PKG = resolve(process.cwd(), 'package.json')
const BACKUP = resolve(process.cwd(), 'package.json.orig')

if (!existsSync(BACKUP)) {
  process.exit(0)
}

renameSync(BACKUP, PKG)
console.log('[publish] restored package.json from backup')
