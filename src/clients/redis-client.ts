import Redis from 'ioredis'

/**
 * Thin wrapper around ioredis for test cache operations:
 * flushing between scenarios and inspecting/setting values for assertions.
 */
export class RedisClient {
  private client: Redis

  constructor(url: string) {
    this.client = new Redis(url)
  }

  /** Flush the current database. Called between scenarios. */
  async flushDb(): Promise<void> {
    await this.client.flushdb()
  }

  /** Get a value by key. */
  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  /** Set a key-value pair with optional TTL in seconds. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  /** Delete a key. */
  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  /** Check if a key exists. */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }

  /** Close the connection. */
  async close(): Promise<void> {
    await this.client.quit()
  }
}
