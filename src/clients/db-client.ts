import { Pool } from 'pg'
import type { QueryResult, QueryResultRow } from 'pg'

/**
 * Thin wrapper around pg.Pool for test database operations:
 * seeding data, running assertions, and cleaning up between scenarios.
 */
export class DbClient {
  private pool: Pool

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
  }

  /** Execute a SQL query with optional parameters. */
  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params)
  }

  /** Truncate one or more tables with CASCADE. */
  async truncateTables(tables: string[]): Promise<void> {
    if (tables.length === 0) return
    await this.pool.query(`TRUNCATE ${tables.join(', ')} CASCADE`)
  }

  /**
   * Bulk insert rows into a table.
   * @param table - Table name
   * @param rows - Array of objects where keys are column names
   */
  async seed(table: string, rows: Record<string, unknown>[]): Promise<void> {
    if (rows.length === 0) return

    const columns = Object.keys(rows[0])
    const placeholders = rows.map(
      (_, rowIdx) =>
        `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`,
    )
    const values = rows.flatMap((row) => columns.map((col) => row[col]))

    await this.pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
      values,
    )
  }

  /** Close the connection pool. */
  async close(): Promise<void> {
    await this.pool.end()
  }
}
