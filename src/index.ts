/**
 * dsh-plugin-workspace-system — a workspace-scoped system-prompt section.
 *
 * Every session whose canonical `header.cwd` matches a workspace shares one
 * user-edited prompt paragraph: the host half registers a
 * `workspace-level-system` prompt section whose provider resolves the
 * session cwd to a storage key and reads the workspace's prompt text at each
 * assembly, so an edit saved from the panel reaches the very next model
 * request without a restart. The browser half registers a sidebar global
 * panel (a `main` keyed body + a `sidebar.panellist` row) that edits the
 * text through the self-hosted `/wls/api` gateway.
 *
 * Data lives under `$DSH_HOME/workspace-level-system/` (host-owned, outside
 * settings.yaml); the row therefore carries no Config.
 *
 * @module @huanlin/dsh-plugin-workspace-system
 */

import type { Context } from '@deepseek-ai/cordis'
import type { AssembleContext } from '@deepseek-ai/dsh-system-prompt'
// Type-only: pulls the AssembleContext.agent merge (dsh-agent) and the
// ctx.systemPrompt Context merge (the system-prompt service itself).
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { registerWorkspaceSystemGateway } from './gateway.ts'
import { keyOf, readPromptSync, storeDir } from './store.ts'

export const name = 'dsh-plugin-workspace-system'

/** Services the plugin consumes; the row loads once all are available. */
export const inject = ['systemPrompt', 'webServer']

/** The registered prompt section's unique name. */
export const SECTION_NAME = 'workspace-level-system'

/**
 * Section placement: inside the persona band (PERSONA_PREFIX = 0 comes
 * first, PLAN_POLICY = 500 follows), after the deployment persona prefix so
 * workspace guidance reads as persona-level context.
 */
export const SECTION_ORDER = 100

/**
 * Resolve this section's contribution for one assembly.
 *
 * No agent scope (diagnostics assembly) or no session cwd ⇒ ''. The read
 * itself is fail-soft: a missing store file is an empty prompt and any other
 * read failure logs and contributes nothing.
 * @param context - the assembly context (carries the agent when one drove it).
 * @param dir - the data directory to read from.
 * @returns the workspace's prompt text, or ''.
 */
export function sectionTextFor(context: AssembleContext, dir: string): string {
  const cwd = context.agent?.session.header.cwd
  if (cwd === undefined || cwd === '') return ''
  const text = readPromptSync(dir, keyOf(cwd))
  return text.trim() === '' ? '' : text
}

/**
 * Plugin entry: register the prompt section and the HTTP gateway.
 * @param ctx - the plugin's cordis context.
 */
export function apply(ctx: Context): void {
  ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    text: (context) => sectionTextFor(context, storeDir()),
  })

  registerWorkspaceSystemGateway(ctx)
}
