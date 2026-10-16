/**
 * Unit tests for the storage layer (src/store.ts): key stability, the
 * write/read/clear/list lifecycle, the mtime cache, size caps, and
 * per-directory write serialization.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  INJECT_LIMIT_BYTES, STORE_DIR_NAME, StoreError, WRITE_LIMIT_BYTES,
  clearPrompt, keyOf, listPrompts, readPromptSync, storeDir, withStoreWrite, writePrompt,
} from '../src/store.ts'

describe('keyOf', () => {
  it('derives a stable 16-hex-char key for one path', () => {
    const first = keyOf('D:/work/proj')
    expect(first).toMatch(/^[0-9a-f]{16}$/)
    expect(keyOf('D:/work/proj')).toBe(first)
  })

  it('derives distinct keys for distinct paths', () => {
    expect(keyOf('D:/work/a')).not.toBe(keyOf('D:/work/b'))
  })
})

describe('storeDir', () => {
  it('places the data directory under an explicit home override', () => {
    expect(storeDir('C:/base')).toBe(join('C:/base', STORE_DIR_NAME))
  })
})

describe('prompt persistence', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wls-store-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('reads empty for a missing prompt', () => {
    expect(readPromptSync(dir, keyOf('C:/nowhere'))).toBe('')
  })

  it('round-trips write → sync read → list with the meta path', async () => {
    const key = keyOf('C:/work/alpha')
    await writePrompt(dir, key, 'C:/work/alpha', 'hello\nworld')
    expect(readPromptSync(dir, key)).toBe('hello\nworld')
    expect(await listPrompts(dir)).toEqual([{ key, path: 'C:/work/alpha', text: 'hello\nworld' }])
  })

  it('clear removes both files and reads empty again', async () => {
    const key = keyOf('C:/work/alpha')
    await writePrompt(dir, key, 'C:/work/alpha', 'text')
    await clearPrompt(dir, key)
    expect(readPromptSync(dir, key)).toBe('')
    expect(await listPrompts(dir)).toEqual([])
  })

  it('rewriting one key replaces the text through the mtime cache', async () => {
    const key = keyOf('C:/work/alpha')
    await writePrompt(dir, key, 'C:/work/alpha', 'first')
    expect(readPromptSync(dir, key)).toBe('first')
    await writePrompt(dir, key, 'C:/work/alpha', 'second')
    expect(readPromptSync(dir, key)).toBe('second')
  })

  it('rejects text over the write cap with a coded StoreError', async () => {
    const big = 'x'.repeat(WRITE_LIMIT_BYTES + 1)
    await expect(writePrompt(dir, keyOf('C:/work/alpha'), 'C:/work/alpha', big))
      .rejects.toMatchObject({ code: 'text-too-large' })
    expect(readPromptSync(dir, keyOf('C:/work/alpha'))).toBe('')
  })

  it('lists empty for a missing directory', async () => {
    expect(await listPrompts(join(dir, 'missing'))).toEqual([])
  })

  it('lists a prompt whose meta file is missing with an empty path', async () => {
    const key = keyOf('C:/work/alpha')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, `${key}.md`), 'orphaned', 'utf8')
    expect(await listPrompts(dir)).toEqual([{ key, path: '', text: 'orphaned' }])
  })

  it('sorts the list by path', async () => {
    const beta = keyOf('C:/work/beta')
    const alpha = keyOf('C:/work/alpha')
    await writePrompt(dir, beta, 'C:/work/beta', 'b')
    await writePrompt(dir, alpha, 'C:/work/alpha', 'a')
    expect((await listPrompts(dir)).map(item => item.path)).toEqual(['C:/work/alpha', 'C:/work/beta'])
  })

  it('truncates an oversized stored file at the injection cap (external hand edit)', async () => {
    const key = keyOf('C:/work/alpha')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, `${key}.md`), 'x'.repeat(INJECT_LIMIT_BYTES + 100), 'utf8')
    expect(Buffer.byteLength(readPromptSync(dir, key), 'utf8')).toBe(INJECT_LIMIT_BYTES)
  })

  it('serializes concurrent writes to one directory through withStoreWrite', async () => {
    const order: string[] = []
    const slow = withStoreWrite(dir, async () => {
      await new Promise(resolve => { setTimeout(resolve, 20) })
      order.push('slow')
    })
    const fast = withStoreWrite(dir, async () => { order.push('fast') })
    await Promise.all([slow, fast])
    expect(order).toEqual(['slow', 'fast'])
  })

  it('keeps queuing after a failed write', async () => {
    const key = keyOf('C:/work/alpha')
    const failing = withStoreWrite(dir, async () => { throw new StoreError('text-too-large', 'boom') })
    await expect(failing).rejects.toMatchObject({ code: 'text-too-large' })
    await withStoreWrite(dir, () => writePrompt(dir, key, 'C:/work/alpha', 'after'))
    expect(readPromptSync(dir, key)).toBe('after')
  })

  it('writes the meta file as human-readable JSON with a trailing newline', async () => {
    const key = keyOf('C:/work/alpha')
    await writePrompt(dir, key, 'C:/work/alpha', 'text')
    const raw = await readFile(join(dir, `${key}.meta.json`), 'utf8')
    expect(raw).toBe(`${JSON.stringify({ path: 'C:/work/alpha' }, null, 2)}\n`)
  })
})
