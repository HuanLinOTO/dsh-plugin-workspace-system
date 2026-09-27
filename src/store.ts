/**
 * Storage layer for per-workspace system-prompt text.
 *
 * One workspace = one storage key = the first 16 hex chars of
 * `sha1(canonical cwd)`. Keying by path (not workspace id) keeps the
 * assembly-time read free of any service dependency, and gives unregistered
 * directories (Ungrouped sessions) their own prompt as a harmless superset.
 *
 * Layout under the data directory (`$DSH_HOME/workspace-level-system/`):
 *   - `<hash>.md`         the raw prompt text
 *   - `<hash>.meta.json`  `{ "path": "..." }` for human identification
 *
 * The assembly hot path reads synchronously (`readPromptSync`) behind an
 * mtime cache, so an edit saved through the gateway reaches the very next
 * model request. Reads fail soft (missing file or unreadable store ⇒ '');
 * writes (gateway path) fail loud. Host writes are serialized per data
 * directory through a promise chain.
 *
 * @module @huanlin/dsh-plugin-workspace-system/store
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** Data-directory name under the resolved DSH home. */
export const STORE_DIR_NAME = 'workspace-level-system'

/** Injection cap: text beyond this many bytes is truncated when assembled. */
export const INJECT_LIMIT_BYTES = 256 * 1024

/** Write cap: the gateway rejects prompt text larger than this many bytes. */
export const WRITE_LIMIT_BYTES = 1024 * 1024

/** One stored prompt as the `list` route returns it. */
export interface StoredPrompt {
  /** Storage key (hash prefix). */
  key: string
  /** Canonical workspace path recorded in the meta file. */
  path: string
  /** Full prompt text. */
  text: string
}

/** A store rejection carrying a stable machine-readable code. */
export class StoreError extends Error {
  /** Stable error code for the gateway envelope. */
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * Resolve the plugin's data directory.
 * @param dshHome - explicit DSH home override; omit to use the standard
 *   `$DSH_HOME` / `~/.dsh` resolution.
 * @returns the absolute data-directory path.
 */
export function storeDir(dshHome?: string): string {
  return join(resolveDshHome(dshHome), STORE_DIR_NAME)
}

/**
 * Compute the storage key for one directory path.
 * @param path - the canonical workspace path.
 * @returns the first 16 hex chars of the path's SHA-1 digest.
 */
export function keyOf(path: string): string {
  return createHash('sha1').update(path).digest('hex').slice(0, 16)
}

/** mtime cache entry: the file's mtime plus its last-read text. */
interface CacheEntry {
  mtimeMs: number
  text: string
}

const readCache = new Map<string, CacheEntry>()

function cacheKey(dir: string, key: string): string {
  return `${dir}\u0000${key}`
}

/**
 * Read one prompt synchronously for prompt assembly. A missing file is an
 * empty prompt; any other read failure logs and contributes nothing, so a
 * broken data directory can never fail a session. Text beyond
 * {@link INJECT_LIMIT_BYTES} is truncated (with a warning).
 * @param dir - the data directory.
 * @param key - the storage key.
 * @returns the (possibly truncated) prompt text, or ''.
 */
export function readPromptSync(dir: string, key: string): string {
  const file = join(dir, `${key}.md`)
  let mtimeMs: number
  try {
    mtimeMs = statSync(file).mtimeMs
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      readCache.delete(cacheKey(dir, key))
      return ''
    }
    console.error(`workspace-level-system: cannot stat ${file}:`, error)
    return ''
  }
  const cached = cacheKey(dir, key)
  const hit = readCache.get(cached)
  if (hit !== undefined && hit.mtimeMs === mtimeMs) return capForInjection(hit.text, file)
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (error) {
    console.error(`workspace-level-system: cannot read ${file}:`, error)
    return ''
  }
  readCache.set(cached, { mtimeMs, text })
  return capForInjection(text, file)
}

/** Truncate prompt text to the injection byte cap (UTF-8 boundary safe). */
function capForInjection(text: string, file: string): string {
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes <= INJECT_LIMIT_BYTES) return text
  console.warn(
    `workspace-level-system: ${file} is ${bytes} bytes; injecting only the first ${INJECT_LIMIT_BYTES} bytes`,
  )
  return Buffer.from(text, 'utf8').subarray(0, INJECT_LIMIT_BYTES).toString('utf8')
}

/** Per-directory write serialization queues (promise chains). */
const writeQueues = new Map<string, Promise<unknown>>()

/**
 * Serialize one mutating store operation against other writes to the same
 * data directory. Later callers wait for earlier settlement, success or not.
 * @param dir - the data directory the operation writes.
 * @param op - the operation.
 * @returns the operation's settlement.
 */
export function withStoreWrite<T>(dir: string, op: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(dir) ?? Promise.resolve()
  const next = previous.then(op, op)
  writeQueues.set(dir, next.catch(() => {}))
  return next
}

/** Write one file through a `.tmp` sibling + rename (atomic replace). */
async function writeAtomic(file: string, content: string): Promise<void> {
  const tmp = `${file}.tmp`
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, file)
}

/**
 * Persist one workspace's prompt text (creates the data directory on demand)
 * and invalidate the read cache for that key.
 * @param dir - the data directory.
 * @param key - the storage key.
 * @param path - the canonical workspace path recorded in the meta file.
 * @param text - the prompt text; must be at most {@link WRITE_LIMIT_BYTES}.
 * @throws {@link StoreError} with code 'text-too-large' over the write cap.
 */
export async function writePrompt(dir: string, key: string, path: string, text: string): Promise<void> {
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > WRITE_LIMIT_BYTES) {
    throw new StoreError('text-too-large', `prompt text is ${bytes} bytes; the limit is ${WRITE_LIMIT_BYTES}`)
  }
  await mkdir(dir, { recursive: true })
  await writeAtomic(join(dir, `${key}.md`), text)
  await writeAtomic(join(dir, `${key}.meta.json`), `${JSON.stringify({ path }, null, 2)}\n`)
  readCache.delete(cacheKey(dir, key))
}

/**
 * Remove one workspace's prompt and meta files (missing files are fine) and
 * invalidate the read cache for that key.
 * @param dir - the data directory.
 * @param key - the storage key.
 */
export async function clearPrompt(dir: string, key: string): Promise<void> {
  await rm(join(dir, `${key}.md`), { force: true })
  await rm(join(dir, `${key}.meta.json`), { force: true })
  readCache.delete(cacheKey(dir, key))
}

/**
 * List every stored prompt (any `<hash>.md` with its meta sibling). A missing
 * data directory is an empty list; a prompt without a meta file still lists
 * with an empty path.
 * @param dir - the data directory.
 * @returns the stored prompts sorted by path.
 */
export async function listPrompts(dir: string): Promise<StoredPrompt[]> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const items: StoredPrompt[] = []
  for (const name of names) {
    if (!name.endsWith('.md')) continue
    const key = name.slice(0, -3)
    const mdPath = join(dir, name)
    const metaPath = join(dir, `${key}.meta.json`)
    let path = ''
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await readFile(metaPath, 'utf8')) as { path?: unknown }
        if (typeof meta.path === 'string') path = meta.path
      } catch (error) {
        console.error(`workspace-level-system: cannot parse ${metaPath}:`, error)
      }
    }
    items.push({ key, path, text: await readFile(mdPath, 'utf8') })
  }
  return items.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
