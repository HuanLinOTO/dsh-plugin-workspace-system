/**
 * Unit tests for the /wls/api gateway handler (createGatewayHandler,
 * src/gateway.ts): transport guards, envelope shapes, and the set/clear/list
 * semantics against a real temporary store directory.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createGatewayHandler } from '../src/gateway.ts'
import { keyOf, listPrompts } from '../src/store.ts'

/** Minimal node:http request stub over an in-memory JSON body. */
function makeRequest(options: {
  method?: string
  pathname?: string
  body?: unknown
  headers?: Record<string, string | undefined>
}) {
  const chunks = options.body === undefined
    ? []
    : [Buffer.from(JSON.stringify(options.body), 'utf8')]
  return {
    method: options.method ?? 'POST',
    url: options.pathname ?? '/wls/api/list',
    headers: {
      'content-type': 'application/json',
      host: '127.0.0.1:3080',
      ...options.headers,
    },
    async *[Symbol.asyncIterator]() {
      yield* chunks
    },
  }
}

/** Response stub capturing status, headers, and body. */
function makeResponse() {
  let status = 0
  let body = ''
  return {
    res: {
      writeHead(code: number, headers?: Record<string, string>) {
        status = code
        expect(headers?.['content-type']).toBe('application/json')
      },
      end(payload: string) {
        body = payload
      },
    },
    get status() { return status },
    json(): { ok: boolean, value?: unknown, error?: { code: string, message: string } } {
      return JSON.parse(body)
    },
  }
}

describe('gateway handler', () => {
  let dir: string
  let handler: ReturnType<typeof createGatewayHandler>
  let realWorkspace: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wls-gateway-'))
    realWorkspace = await mkdtemp(join(tmpdir(), 'wls-ws-'))
    handler = createGatewayHandler(() => dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
    await rm(realWorkspace, { recursive: true, force: true })
  })

  it('rejects non-POST methods with 405', async () => {
    const captured = makeResponse()
    await handler(makeRequest({ method: 'GET' }) as never, captured.res as never)
    expect(captured.status).toBe(405)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'method-not-allowed' } })
  })

  it('rejects a cross-origin request with 403', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ headers: { origin: 'http://evil.example' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(403)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'origin-not-allowed' } })
  })

  it('accepts a same-origin request', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ headers: { origin: 'http://127.0.0.1:3080' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(200)
  })

  it('rejects a non-JSON content type with 415', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ headers: { 'content-type': 'text/plain' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(415)
  })

  it('answers an unknown method with 404', async () => {
    const captured = makeResponse()
    await handler(makeRequest({ pathname: '/wls/api/nope' }) as never, captured.res as never)
    expect(captured.status).toBe(404)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'not-found' } })
  })

  it('lists empty for an empty store', async () => {
    const captured = makeResponse()
    await handler(makeRequest({ pathname: '/wls/api/list', body: {} }) as never, captured.res as never)
    expect(captured.status).toBe(200)
    expect(captured.json()).toEqual({ ok: true, value: { items: [] } })
  })

  it('set writes the prompt under the canonical path key and lists it', async () => {
    const set = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: realWorkspace, text: 'be terse' } }) as never,
      set.res as never,
    )
    expect(set.status).toBe(200)
    expect(set.json()).toEqual({ ok: true, value: { key: keyOf(realWorkspace) } })
    expect(await listPrompts(dir)).toEqual([
      { key: keyOf(realWorkspace), path: realWorkspace, text: 'be terse' },
    ])
    const list = makeResponse()
    await handler(makeRequest({ pathname: '/wls/api/list', body: {} }) as never, list.res as never)
    expect(list.json()).toEqual({
      ok: true,
      value: { items: [{ key: keyOf(realWorkspace), path: realWorkspace, text: 'be terse' }] },
    })
  })

  it('set with empty text clears the stored prompt', async () => {
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: realWorkspace, text: 'temp' } }) as never,
      makeResponse().res as never,
    )
    const clear = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: realWorkspace, text: '' } }) as never,
      clear.res as never,
    )
    expect(clear.status).toBe(200)
    expect(await listPrompts(dir)).toEqual([])
  })

  it('clear removes a stored prompt', async () => {
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: realWorkspace, text: 'temp' } }) as never,
      makeResponse().res as never,
    )
    const clear = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/clear', body: { path: realWorkspace } }) as never,
      clear.res as never,
    )
    expect(clear.status).toBe(200)
    expect(await listPrompts(dir)).toEqual([])
  })

  it('set rejects text over the write cap with 413 text-too-large', async () => {
    const captured = makeResponse()
    const big = 'x'.repeat(1024 * 1024 + 1)
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: realWorkspace, text: big } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(413)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'text-too-large' } })
  })

  it('set rejects a missing path with 400 invalid-body', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { text: 'x' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(400)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'invalid-body' } })
  })

  it('set rejects a relative path with 400 invalid-path', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: 'relative/path', text: 'x' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(400)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'invalid-path' } })
  })

  it('set rejects a nonexistent absolute path with 400 invalid-path', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/set', body: { path: 'C:/definitely/not/here', text: 'x' } }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(400)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'invalid-path' } })
  })

  it('clear rejects a missing path with 400 invalid-body', async () => {
    const captured = makeResponse()
    await handler(
      makeRequest({ pathname: '/wls/api/clear', body: {} }) as never,
      captured.res as never,
    )
    expect(captured.status).toBe(400)
    expect(captured.json()).toMatchObject({ ok: false, error: { code: 'invalid-body' } })
  })
})
