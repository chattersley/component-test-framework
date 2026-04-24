import { Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { ComponentTestWorld } from '../../support/world'

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

function requireDb(world: ComponentTestWorld): NonNullable<ComponentTestWorld['db']> {
  if (!world.db) {
    throw new Error('DbClient is not configured — set databaseUrl on FrameworkConfig')
  }
  return world.db
}

/**
 * Assert that `table` contains exactly `expected` rows matching the SQL
 * predicate. The predicate is interpolated verbatim into the WHERE clause,
 * so callers must not pass untrusted input — this step is intended for
 * feature files authored by the project, not for data-driven parameters.
 *
 * Table names are validated against a strict identifier pattern before
 * interpolation as defence-in-depth.
 */
Then(
  'the {word} table contains {int} row(s) matching {string}',
  async function (this: ComponentTestWorld, table: string, expected: number, predicate: string) {
    if (!IDENTIFIER.test(table)) {
      throw new Error(`unsafe table name: ${table}`)
    }
    const result = await requireDb(this).query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${table} WHERE ${predicate}`,
    )
    const actual = Number(result.rows[0]?.count ?? '0')
    assert.equal(
      actual,
      expected,
      `expected ${expected} row(s) in ${table} matching "${predicate}", got ${actual}`,
    )
  },
)
