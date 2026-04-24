import type { FrameworkConfig } from '../types'

/**
 * Load framework configuration from environment variables.
 * Consumer can override any field by passing partial config.
 */
export function loadConfig(overrides?: Partial<FrameworkConfig>): FrameworkConfig {
  return {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8080',
    webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
    wiremockUrl: process.env.WIREMOCK_URL ?? 'http://localhost:8443',
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    fixturesDir: process.env.FIXTURES_DIR ?? './fixtures',
    wiremockStubsDir: process.env.WIREMOCK_STUBS_DIR,
    ...overrides,
  }
}
