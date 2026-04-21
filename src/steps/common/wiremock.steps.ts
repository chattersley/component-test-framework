import { Given, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import * as path from 'path'
import type { ComponentTestWorld } from '../../support/world'

Given(
  'the {word} API is stubbed from {word}',
  async function (this: ComponentTestWorld, _provider: string, stubDir: string) {
    const fullPath = path.resolve(this.config.fixturesDir, stubDir)
    await this.wiremock.loadMappingsFromDir(fullPath)
  },
)

Given(
  'the {word} API returns HTTP {int}',
  async function (this: ComponentTestWorld, provider: string, status: number) {
    await this.wiremock.addStub({
      name: `${provider}-override-${status}`,
      request: { urlPathPattern: `.*` },
      response: {
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Stubbed ${status} for ${provider}` }),
      },
      priority: 1,
    })
  },
)

Given(
  'the {word} API at {string} returns HTTP {int}',
  async function (this: ComponentTestWorld, _provider: string, urlPath: string, status: number) {
    await this.wiremock.addStub({
      request: { urlPath },
      response: {
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Stubbed ${status}` }),
      },
      priority: 1,
    })
  },
)

Given(
  'the {word} API at {string} returns the response {word}',
  async function (
    this: ComponentTestWorld,
    _provider: string,
    urlPath: string,
    responseFixture: string,
  ) {
    const { loadFixture } = await import('../../support/fixtures')
    const body = loadFixture('responses', responseFixture, this.config.fixturesDir)
    await this.wiremock.addStub({
      request: { urlPath },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: body,
      },
      priority: 1,
    })
  },
)

Then(
  'the {word} API at {string} was called {int} time(s)',
  async function (
    this: ComponentTestWorld,
    _provider: string,
    urlPathPattern: string,
    count: number,
  ) {
    const actual = await this.wiremock.getRequestCount(urlPathPattern)
    assert.equal(actual, count, `Expected ${count} calls to ${urlPathPattern}, got ${actual}`)
  },
)

Then(
  'the {word} API was called {int} time(s)',
  async function (this: ComponentTestWorld, provider: string, count: number) {
    const actual = await this.wiremock.getRequestCount(`/${provider}/.*`)
    assert.equal(actual, count, `Expected ${count} calls to /${provider}/.*, got ${actual}`)
  },
)
