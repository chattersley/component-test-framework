import * as fs from 'fs'
import * as path from 'path'

/**
 * Client for WireMock's Admin API (/__admin/).
 * Manages stub mappings, resets state, and verifies request counts.
 */
export class WireMockClient {
  constructor(private baseUrl: string) {}

  /** Reset all stubs and request logs. */
  async resetAll(): Promise<void> {
    await fetch(`${this.baseUrl}/__admin/reset`, { method: 'POST' })
  }

  /** Reset only the request journal (keep stubs). */
  async resetRequests(): Promise<void> {
    await fetch(`${this.baseUrl}/__admin/requests`, { method: 'DELETE' })
  }

  /**
   * Load all WireMock mapping files from a directory and register them.
   * Expects the standard WireMock layout: {dir}/mappings/*.json
   */
  async loadMappingsFromDir(mappingsDir: string): Promise<void> {
    const dir = path.resolve(mappingsDir, 'mappings')
    if (!fs.existsSync(dir)) return

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8')
      const mapping = JSON.parse(content)
      await this.addStub(mapping)
    }
  }

  /** Register a single stub mapping. */
  async addStub(mapping: Record<string, unknown>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/__admin/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`WireMock addStub failed (${res.status}): ${body}`)
    }
  }

  /** Remove a stub mapping by its UUID. */
  async removeStub(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/__admin/mappings/${id}`, { method: 'DELETE' })
  }

  /** Get the count of requests matching a URL path pattern. */
  async getRequestCount(urlPathPattern: string): Promise<number> {
    const res = await fetch(`${this.baseUrl}/__admin/requests/count`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlPathPattern }),
    })
    if (!res.ok) {
      throw new Error(`WireMock request count failed: ${res.status}`)
    }
    const data = (await res.json()) as { count: number }
    return data.count
  }

  /** Verify that a URL path pattern was called exactly N times. */
  async verifyCallCount(urlPathPattern: string, expectedCount: number): Promise<void> {
    const actual = await this.getRequestCount(urlPathPattern)
    if (actual !== expectedCount) {
      throw new Error(`Expected ${expectedCount} calls to ${urlPathPattern}, got ${actual}`)
    }
  }

  /** Find all requests matching a URL path pattern. */
  async findRequests(urlPathPattern: string): Promise<unknown[]> {
    const res = await fetch(`${this.baseUrl}/__admin/requests/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlPathPattern }),
    })
    if (!res.ok) {
      throw new Error(`WireMock find requests failed: ${res.status}`)
    }
    const data = (await res.json()) as { requests: unknown[] }
    return data.requests
  }
}
