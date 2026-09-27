/**
 * dsh-plugin-workspace-system — a workspace-scoped instruction reminder.
 *
 * Every session whose canonical `header.cwd` matches a workspace shares one
 * user-edited instruction paragraph. The host half listens to `agent/created`
 * and injects the workspace's text as a plugin-sourced `user/message`
 * wrapped in a `<system-reminder>` with a title, queued on the next-step
 * boundary — the inbox claim order places it BEFORE the first turn's user
 * message, so it reaches the model as leading instructions context of turn 1
 * (the agent-instructions / preface-context pattern). The browser half
 * registers a sidebar global panel (a `main` keyed body + a
 * `sidebar.panellist` row) that edits the text through the self-hosted
 * `/wls/api` gateway.
 *
 * Data lives under `$DSH_HOME/workspace-level-system/` (host-owned, outside
 * settings.yaml); the row therefore carries no Config. The injection is
 * decided once per session creation — `agent/created` fires on create,
 * resume, clear, and compaction — so an edit saved from the panel reaches
 * the NEXT session (already-open sessions keep what they got).
 *
 * @module @huanlin/dsh-plugin-workspace-system
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage, type ContextFormed } from '@deepseek-ai/dsh-llm'
import { registerWorkspaceSystemGateway } from './gateway.ts'
import { keyOf, readPromptSync, storeDir } from './store.ts'

export const name = 'dsh-plugin-workspace-system'

/** Services the plugin consumes; the row loads once all are available. */
export const inject = ['webServer']

/**
 * This producer's own message source kind. `@deepseek-ai/dsh-llm`'s
 * `MessageSourceMap` is merge-extensible and carries no shared catch-all
 * `plugin` kind, so each plugin declares its own.
 */
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'workspace-level-system': { kind: 'workspace-level-system' } & ContextFormed
  }
}

/** The `<system-reminder>` framing baked around the workspace text. */
const SYSTEM_REMINDER_OPEN = '<system-reminder>'
const SYSTEM_REMINDER_CLOSE = '</system-reminder>'

/** The title heading inside the reminder framing. */
const TITLE = '# Workspace Instructions'

/**
 * Build the user-role reminder message injected for one session.
 *
 * The text is wrapped as
 * `<system-reminder>\n# Workspace Instructions: <path>\n<text>\n</system-reminder>`;
 * any literal `</system-reminder>` inside the user text is escaped so the
 * framing stays unambiguous (the agent-instructions convention).
 * @param text - the workspace's stored prompt text (non-empty).
 * @param path - the workspace's canonical path, shown in the heading.
 * @returns the message to inject.
 */
export function buildWorkspaceSystemReminder(text: string, path: string): ReturnType<typeof createUserMessage> {
  const escaped = text.replaceAll(SYSTEM_REMINDER_CLOSE, '<\\/system-reminder>')
  const body = [SYSTEM_REMINDER_OPEN, `${TITLE}: ${path}`, escaped, SYSTEM_REMINDER_CLOSE].join('\n')
  return createUserMessage({
    content: [{ type: 'text', text: body }],
    source: { kind: 'workspace-level-system', form: 'instructions' },
  })
}

/**
 * Resolve the message to inject for one agent creation.
 *
 * No session cwd, no stored text, or whitespace-only text ⇒ `undefined`
 * (nothing injected). The store read is fail-soft: a missing store file is
 * an empty prompt and any other read failure logs and injects nothing.
 * @param agent - the newly created agent.
 * @param dir - the data directory to read from.
 * @returns the message to inject, or `undefined`.
 */
export function reminderFor(agent: Agent, dir: string): ReturnType<typeof createUserMessage> | undefined {
  const cwd = agent.session.header.cwd
  if (cwd === undefined || cwd === '') return undefined
  const text = readPromptSync(dir, keyOf(cwd))
  if (text.trim() === '') return undefined
  return buildWorkspaceSystemReminder(text, cwd)
}

/** Test seam: overrides the data directory apply reads from. */
export interface ApplyOptions {
  /** Explicit data directory; defaults to the resolved store directory. */
  dir?: string
}

/**
 * Plugin entry: inject the workspace reminder on every agent creation, then
 * serve the `/wls/api` gateway behind the panel.
 *
 * `agent/created` fires for create (`'startup'`), resume, clear, and
 * compaction. `agent.inject()` queues on the next-step boundary without
 * waking the driver; the inbox claim order emits it before the turn's user
 * message, so on turn 1 the reminder precedes the first user input.
 * @param ctx - the plugin's cordis context.
 * @param options - data-directory override (tests only; cordis passes none).
 */
export function apply(ctx: Context, options: ApplyOptions = {}): void {
  const dir = options.dir ?? storeDir()

  ctx.on('agent/created', ({ agent }: { agent: Agent }): undefined => {
    const message = reminderFor(agent, dir)
    if (message === undefined) return
    agent.inject(message)
  })

  registerWorkspaceSystemGateway(ctx)
}
