import { Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { loadFixture } from '../../support/fixtures'
import type { ComponentTestWorld } from '../../support/world'

Then(
  'the response status should be {int}',
  function (this: ComponentTestWorld, expectedStatus: number) {
    assert.ok(this.lastResponse, 'No response recorded')
    assert.equal(this.lastResponse.status, expectedStatus)
  },
)

Then(
  'the response body should match {word}',
  function (this: ComponentTestWorld, fixtureFile: string) {
    assert.ok(this.lastResponse, 'No response recorded')
    const expected = loadFixture('responses', fixtureFile, this.config.fixturesDir) as Record<
      string,
      unknown
    >
    assertPartialMatch(this.lastResponse.body as Record<string, unknown>, expected)
  },
)

Then(
  'the response body at {word} should equal {string}',
  function (this: ComponentTestWorld, jsonPath: string, expected: string) {
    assert.ok(this.lastResponse, 'No response recorded')
    const actual = resolvePath(this.lastResponse.body as Record<string, unknown>, jsonPath)
    assert.equal(String(actual), expected)
  },
)

Then(
  'the response body at {word} should be an integer',
  function (this: ComponentTestWorld, jsonPath: string) {
    assert.ok(this.lastResponse, 'No response recorded')
    const actual = resolvePath(this.lastResponse.body as Record<string, unknown>, jsonPath)
    assert.ok(
      Number.isInteger(actual),
      `Expected integer at ${jsonPath}, got ${typeof actual}: ${actual}`,
    )
  },
)

Then(
  'the response body at {word} should contain {int} items',
  function (this: ComponentTestWorld, jsonPath: string, count: number) {
    assert.ok(this.lastResponse, 'No response recorded')
    const actual = resolvePath(this.lastResponse.body as Record<string, unknown>, jsonPath)
    assert.ok(Array.isArray(actual), `Expected array at ${jsonPath}`)
    assert.equal(actual.length, count)
  },
)

Then(
  'the response should contain header {word} with value {string}',
  function (this: ComponentTestWorld, header: string, expected: string) {
    assert.ok(this.lastResponse, 'No response recorded')
    const actual = this.lastResponse.headers[header.toLowerCase()]
    assert.equal(actual, expected)
  },
)

Then(
  'the response should contain header {word}',
  function (this: ComponentTestWorld, header: string) {
    assert.ok(this.lastResponse, 'No response recorded')
    const actual = this.lastResponse.headers[header.toLowerCase()]
    assert.ok(actual !== undefined, `Expected header "${header}" to be present`)
  },
)

/**
 * Deep partial match: every key in `expected` must exist in `actual` with the same value.
 * Extra keys in `actual` are ignored.
 */
function assertPartialMatch(actual: unknown, expected: unknown, path = ''): void {
  if (expected === null || expected === undefined) {
    assert.equal(actual, expected, `Mismatch at ${path || 'root'}`)
    return
  }

  if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `Expected array at ${path || 'root'}`)
    assert.equal(
      (actual as unknown[]).length,
      expected.length,
      `Array length mismatch at ${path || 'root'}`,
    )
    for (let i = 0; i < expected.length; i++) {
      assertPartialMatch((actual as unknown[])[i], expected[i], `${path}[${i}]`)
    }
    return
  }

  if (typeof expected === 'object') {
    assert.ok(
      typeof actual === 'object' && actual !== null,
      `Expected object at ${path || 'root'}, got ${typeof actual}`,
    )
    for (const key of Object.keys(expected as Record<string, unknown>)) {
      assertPartialMatch(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      )
    }
    return
  }

  assert.equal(actual, expected, `Mismatch at ${path || 'root'}`)
}

/** Resolve a dot-separated JSON path against an object. */
function resolvePath(obj: Record<string, unknown>, jsonPath: string): unknown {
  const parts = jsonPath.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      throw new Error(`Cannot resolve path "${jsonPath}" — hit ${typeof current} at "${part}"`)
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
