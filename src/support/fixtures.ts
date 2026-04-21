import * as fs from 'fs'
import * as path from 'path'

/**
 * Load a JSON fixture file from the consumer's fixtures directory.
 *
 * @param category - Top-level category directory (e.g. "requests", "responses")
 * @param name - Slash-separated fixture name without .json extension (e.g. "auth/login-valid")
 * @param fixturesDir - Root fixtures directory path
 * @returns Parsed JSON content
 */
export function loadFixture(category: string, name: string, fixturesDir: string): unknown {
  const filePath = path.resolve(fixturesDir, category, `${name}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`)
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)
}

/**
 * List all JSON fixture files in a directory (recursive).
 */
export function listFixtures(dir: string): string[] {
  if (!fs.existsSync(dir)) return []

  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listFixtures(fullPath))
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath)
    }
  }
  return results
}
