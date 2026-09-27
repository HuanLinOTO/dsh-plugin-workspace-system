/**
 * Unit tests for the section provider decision (sectionTextFor,
 * src/index.ts): the fail-soft empty-contribution paths and the verbatim
 * pass-through for a stored prompt.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { keyOf, storeDir } from '../src/store.ts'
import { sectionTextFor } from '../src/index.ts'
import type { AssembleContext } from '@deepseek-ai/dsh-system-prompt'

/** Minimal agent stub carrying only the session header the provider reads. */
function contextWithCwd(cwd?: string): AssembleContext {
  if (cwd === undefined) return {}
  return { agent: { session: { header: { cwd } } } as never }
}

describe('sectionTextFor', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wls-section-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns empty text without an agent', () => {
    expect(sectionTextFor({}, dir)).toBe('')
  })

  it('returns empty text when the session header carries no cwd', () => {
    expect(sectionTextFor(contextWithCwd(undefined), dir)).toBe('')
  })

  it('returns empty text for an empty header cwd', () => {
    expect(sectionTextFor(contextWithCwd(''), dir)).toBe('')
  })

  it('returns empty text when no prompt is stored for the cwd', () => {
    expect(sectionTextFor(contextWithCwd('C:/work/none'), dir)).toBe('')
  })

  it('returns empty text for a whitespace-only stored prompt', async () => {
    const key = keyOf('C:/work/blank')
    await writeFile(join(dir, `${key}.md`), '   \n\t  ', 'utf8')
    expect(sectionTextFor(contextWithCwd('C:/work/blank'), dir)).toBe('')
  })

  it('returns the stored text verbatim for the session workspace', async () => {
    const key = keyOf('C:/work/alpha')
    const text = 'Always answer in bullet points.\nKeep code in TypeScript.'
    await writeFile(join(dir, `${key}.md`), text, 'utf8')
    expect(sectionTextFor(contextWithCwd('C:/work/alpha'), dir)).toBe(text)
  })

  it('serves each workspace its own prompt', async () => {
    const alphaKey = keyOf('C:/work/alpha')
    const betaKey = keyOf('C:/work/beta')
    await writeFile(join(dir, `${alphaKey}.md`), 'alpha prompt', 'utf8')
    await writeFile(join(dir, `${betaKey}.md`), 'beta prompt', 'utf8')
    expect(sectionTextFor(contextWithCwd('C:/work/alpha'), dir)).toBe('alpha prompt')
    expect(sectionTextFor(contextWithCwd('C:/work/beta'), dir)).toBe('beta prompt')
  })
})

describe('storeDir default resolution', () => {
  it('resolves under the DSH home without an override', () => {
    expect(storeDir()).toContain('workspace-level-system')
  })
})
