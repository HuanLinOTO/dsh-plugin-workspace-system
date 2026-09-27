/**
 * Host-side HTTP gateway exposing the workspace-level-system store to the
 * browser through a self-hosted `/wls/api` prefix route (the
 * ego-browser / better-sidebar / sidebar-brand-text pattern).
 *
 * Route shape (POST only, JSON envelopes `{ok, value}` / `{ok, error}`):
 *   POST /wls/api/list            → { ok: true, value: { items: StoredPrompt[] } }
 *   POST /wls/api/set  {path, text} → { ok: true, value: { key } }
 *        (empty/whitespace text runs the clear semantics)
 *   POST /wls/api/clear {path}      → { ok: true, value: { key } }
 *
 * `set`/`clear` canonicalize the path with `realpathNormalize` (the same
 * canon workspace membership uses), so a UI-supplied spelling always lands
 * on the storage key the assembly hot path computes from the session
 * `header.cwd`.
 *
 * @module @huanlin/dsh-plugin-workspace-system/gateway
 */

import type { Context } from '@deepseek-ai/cordis'
import { realpathNormalize } from '@deepseek-ai/dsh-workspace'
import {
  StoreError, WRITE_LIMIT_BYTES, clearPrompt, keyOf, listPrompts, storeDir, withStoreWrite, writePrompt,
} from './store.ts'

/** HTTP route prefix owning every workspace-level-system API request. */
const API_PREFIX = '/wls/api'

/**
 * Body byte cap for the `set` route: the 1 MiB text limit plus JSON and
 * path overhead. Larger raw bodies reject before parsing.
 */
const SET_BODY_LIMIT_BYTES = 2 * 1024 * 1024

/** Body byte cap for the small `list` / `clear` routes. */
const SMALL_BODY_LIMIT_BYTES = 64 * 1024

/** HTTP status for each StoreError code (validation 4xx, size 413). */
const STATUS_FOR_CODE: Record<string, number> = {
  'invalid-body': 400,
  'invalid-path': 400,
  'text-too-large': 413,
  'body-too-large': 413,
}

/** Minimal type for the host's webServer service. */
interface WebServerLike {
  register(options: {
    kind: 'prefix'
    path: string
    handler: (req: NodeRequest, res: NodeResponse) => Promise<void> | void
  }): () => void
}

interface NodeRequest {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  [Symbol.asyncIterator](): AsyncIterator<unknown>
}

interface NodeResponse {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body: string): void
}

/**
 * Create the request handler (dependency-injected data directory, for tests).
 * @param resolveDir - resolves the data directory to read and write.
 * @returns the prefix-route handler.
 */
export function createGatewayHandler(resolveDir: () => string): (req: NodeRequest, res: NodeResponse) => Promise<void> {
  return async (req, res): Promise<void> => {
    if ((req.method ?? '') !== 'POST') {
      writeJson(res, 405, envelopeError('method-not-allowed', 'POST only'))
      return
    }
    const origin = req.headers.origin
    if (typeof origin === 'string' && origin !== '') {
      let originHost: string
      try {
        originHost = new URL(origin).host
      } catch {
        writeJson(res, 400, envelopeError('invalid-origin', 'invalid Origin header'))
        return
      }
      const reqHost = req.headers.host
      if (typeof reqHost === 'string' && originHost !== reqHost) {
        writeJson(res, 403, envelopeError('origin-not-allowed', 'same-origin requests only'))
        return
      }
    }
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
    if (!contentType.startsWith('application/json')) {
      writeJson(res, 415, envelopeError('content-type-not-supported', 'application/json required'))
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
    const method = pathname.startsWith(`${API_PREFIX}/`) ? pathname.slice(`${API_PREFIX}/`.length) : undefined
    if (method === undefined || method.includes('/')) {
      writeJson(res, 404, envelopeError('not-found', 'unknown workspace-level-system API method'))
      return
    }
    try {
      const maxBytes = method === 'set' ? SET_BODY_LIMIT_BYTES : SMALL_BODY_LIMIT_BYTES
      const body = await readJsonBody(req, maxBytes)
      const dir = resolveDir()
      if (method === 'list') {
        writeJson(res, 200, envelopeOk({ items: await listPrompts(dir) }))
      } else if (method === 'set') {
        writeJson(res, 200, envelopeOk(await handleSet(body, dir)))
      } else if (method === 'clear') {
        writeJson(res, 200, envelopeOk(await handleClear(body, dir)))
      } else {
        writeJson(res, 404, envelopeError('not-found', `unknown workspace-level-system API method "${method}"`))
      }
    } catch (error) {
      if (error instanceof StoreError) {
        writeJson(res, STATUS_FOR_CODE[error.code] ?? 500, envelopeError(error.code, error.message))
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      writeJson(res, 500, envelopeError('internal', message))
    }
  }
}

/** Handle the `set` method: validate body, canonicalize path, write or clear. */
async function handleSet(body: unknown, dir: string): Promise<{ key: string }> {
  const { path, text } = extractPathAndText(body)
  if (path === undefined) {
    throw new StoreError('invalid-body', 'set expects { path: string, text?: string }')
  }
  const canonical = await canonicalize(path)
  const key = keyOf(canonical)
  if (text === undefined || text.trim() === '') {
    await withStoreWrite(dir, () => clearPrompt(dir, key))
    return { key }
  }
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > WRITE_LIMIT_BYTES) {
    throw new StoreError('text-too-large', `prompt text is ${bytes} bytes; the limit is ${WRITE_LIMIT_BYTES}`)
  }
  await withStoreWrite(dir, () => writePrompt(dir, key, canonical, text))
  return { key }
}

/** Handle the `clear` method: validate body, canonicalize path, clear. */
async function handleClear(body: unknown, dir: string): Promise<{ key: string }> {
  const { path } = extractPathAndText(body)
  if (path === undefined) {
    throw new StoreError('invalid-body', 'clear expects { path: string }')
  }
  const canonical = await canonicalize(path)
  const key = keyOf(canonical)
  await withStoreWrite(dir, () => clearPrompt(dir, key))
  return { key }
}

/** Canonicalize one workspace path through the workspace canon. */
async function canonicalize(path: string): Promise<string> {
  try {
    return await realpathNormalize(path)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new StoreError('invalid-path', `cannot canonicalize workspace path: ${message}`)
  }
}

/** Extract the string `path` / `text` fields from a parsed request body. */
function extractPathAndText(body: unknown): { path?: string, text?: string } {
  if (typeof body !== 'object' || body === null) return {}
  const record = body as Record<string, unknown>
  const path = typeof record.path === 'string' ? record.path : undefined
  const text = typeof record.text === 'string' ? record.text : undefined
  return { ...path !== undefined ? { path } : {}, ...text !== undefined ? { text } : {} }
}

/** Read and parse a JSON body from a node:http request. */
async function readJsonBody(req: NodeRequest, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer)
    bytes += buffer.length
    if (bytes > maxBytes) throw new StoreError('body-too-large', 'request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text === '') return {}
  return JSON.parse(text)
}

/** Write a JSON response envelope. */
function writeJson(res: NodeResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(json)
}

/** Build a success envelope. */
function envelopeOk<T>(value: T): { ok: true, value: T } {
  return { ok: true, value }
}

/** Build an error envelope. */
function envelopeError(code: string, message: string): { ok: false, error: { code: string, message: string } } {
  return { ok: false, error: { code, message } }
}

/**
 * Register the `/wls/api` HTTP route on the host's web server.
 * @param ctx - host context carrying `webServer`.
 */
export function registerWorkspaceSystemGateway(ctx: Context): void {
  ctx.effect(() => {
    const webServer = (ctx as unknown as { webServer?: WebServerLike }).webServer
    if (webServer === undefined || typeof webServer.register !== 'function') return () => {}
    return webServer.register({
      kind: 'prefix',
      path: API_PREFIX,
      handler: createGatewayHandler(() => storeDir()),
    })
  }, 'workspace-level-system: /wls/api routes')
}
