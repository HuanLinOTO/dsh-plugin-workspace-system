/**
 * Unit tests for the reminder injection decision (reminderFor and
 * buildWorkspaceSystemReminder, src/index.ts) and the agent/created wiring.
 *
 * agent/created dispatch itself is a one-liner over a cordis event; what is
 * worth testing is the decision function that gates injection (missing cwd,
 * missing/blank store text) and the message shape (system-reminder framing,
 * title, escaping, source kind).
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apply, buildWorkspaceSystemReminder, reminderFor } from '../src/index.ts'
import { keyOf } from '../src/store.ts'

/** Minimal agent stub carrying only the session header the reader touches. */
function agentWithCwd(cwd?: string) {
  return {
    session: { header: { ...cwd === undefined ? {} : { cwd } } },
    inject: vi.fn(),
  } as never
}

describe('buildWorkspaceSystemReminder', () => {
  it('wraps the text in a titled system-reminder block', () => {
    const message = buildWorkspaceSystemReminder('be terse', 'C:/work/alpha')
    expect(message.role).toBe('user')
    expect(message.content).toEqual([{
      type: 'text',
      text: '<system-reminder>\n# Workspace Instructions: C:/work/alpha\nbe terse\n</system-reminder>',
    }])
  })

  it('tags the message as this plugin producer with the instructions form', () => {
    const message = buildWorkspaceSystemReminder('x', 'C:/work/alpha')
    expect(message.source).toEqual({ kind: 'workspace-level-system', form: 'instructions' })
  })

  it('escapes a literal closing reminder tag inside the user text', () => {
    const message = buildWorkspaceSystemReminder('a </system-reminder> b', 'C:/work/alpha')
    const text = (message.content as { text: string }[])[0]!.text
    expect(text.split('\n')).toEqual([
      '<system-reminder>',
      '# Workspace Instructions: C:/work/alpha',
      'a <\\/system-reminder> b',
      '</system-reminder>',
    ])
  })

  it('keeps multiline text verbatim inside the framing', () => {
    const message = buildWorkspaceSystemReminder('line 1\nline 2', 'C:/w')
    const text = (message.content as { text: string }[])[0]!.text
    expect(text).toContain('\nline 1\nline 2\n')
  })
})

describe('reminderFor', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wls-inject-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns undefined when the session header carries no cwd', () => {
    expect(reminderFor(agentWithCwd(undefined), dir)).toBeUndefined()
  })

  it('returns undefined for an empty header cwd', () => {
    expect(reminderFor(agentWithCwd(''), dir)).toBeUndefined()
  })

  it('returns undefined when no prompt is stored for the cwd', () => {
    expect(reminderFor(agentWithCwd('C:/work/none'), dir)).toBeUndefined()
  })

  it('returns undefined for a whitespace-only stored prompt', async () => {
    const key = keyOf('C:/work/blank')
    await writeFile(join(dir, `${key}.md`), '   \n\t  ', 'utf8')
    expect(reminderFor(agentWithCwd('C:/work/blank'), dir)).toBeUndefined()
  })

  it('returns a titled reminder carrying the stored text verbatim', async () => {
    const key = keyOf('C:/work/alpha')
    await writeFile(join(dir, `${key}.md`), 'Always answer in bullet points.', 'utf8')
    const message = reminderFor(agentWithCwd('C:/work/alpha'), dir)
    expect(message).toBeDefined()
    const text = (message!.content as { text: string }[])[0]!.text
    expect(text).toBe(
      '<system-reminder>\n# Workspace Instructions: C:/work/alpha\nAlways answer in bullet points.\n</system-reminder>',
    )
  })

  it('serves each workspace its own reminder', async () => {
    const alphaKey = keyOf('C:/work/alpha')
    const betaKey = keyOf('C:/work/beta')
    await writeFile(join(dir, `${alphaKey}.md`), 'alpha prompt', 'utf8')
    await writeFile(join(dir, `${betaKey}.md`), 'beta prompt', 'utf8')
    const alpha = reminderFor(agentWithCwd('C:/work/alpha'), dir)
    const beta = reminderFor(agentWithCwd('C:/work/beta'), dir)
    expect((alpha!.content as { text: string }[])[0]!.text).toContain('alpha prompt')
    expect((beta!.content as { text: string }[])[0]!.text).toContain('beta prompt')
  })
})

describe('apply agent/created wiring', () => {
  /** A context stub capturing the plugin's agent/created listener. */
  function stubContext() {
    const listeners: Array<(payload: { agent: never }) => void> = []
    const ctx = {
      inject: () => ({ dispose: () => {} }),
      on: (_event: string, listener: (payload: never) => void) => {
        listeners.push(listener as never)
        return () => {}
      },
      effect: () => () => {},
    }
    return { ctx, listeners }
  }

  it('injects the reminder through agent.inject on creation', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wls-wire-'))
    try {
      const key = keyOf('C:/work/alpha')
      await writeFile(join(dir, `${key}.md`), 'guidance', 'utf8')
      const { ctx, listeners } = stubContext()
      apply(ctx as never, { dir })
      expect(listeners.length).toBe(1)
      const agent = agentWithCwd('C:/work/alpha')
      listeners[0]!({ agent: agent as never })
      expect(agent.inject).toHaveBeenCalledTimes(1)
      const message = (agent.inject as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      expect(message.role).toBe('user')
      expect((message.content as { text: string }[])[0]!.text).toContain('# Workspace Instructions: C:/work/alpha')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('injects nothing when the workspace has no stored prompt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wls-wire-'))
    try {
      const { ctx, listeners } = stubContext()
      apply(ctx as never, { dir })
      const agent = agentWithCwd('C:/work/none')
      listeners[0]!({ agent: agent as never })
      expect(agent.inject).not.toHaveBeenCalled()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
