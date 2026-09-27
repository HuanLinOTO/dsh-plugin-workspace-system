/**
 * workspace-level-system — browser half.
 *
 * Two registrations composing one sidebar global panel:
 *   - `main` keyed slot (key `workspace-system`) — the panel body: the
 *     workspace list plus the selected workspace's prompt editor, talking to
 *     the host store through the `/wls/api` gateway.
 *   - `sidebar.panellist` list slot (id `workspace-system`, order 40) —
 *     the panel's navigation row (folder icon + localized label).
 *
 * Export discipline: value-imports ONLY the frozen platform module table
 * (React / cordis / ui-primitives); every other `@deepseek-ai/*` import is
 * type-only (erased at build) — values arrive via cordis injection and the
 * module table.
 *
 * @module @huanlin/dsh-plugin-workspace-system/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the 'main' keyed-slot SlotMap merge (ui-layout) and the
// 'sidebar.panellist' list-slot merge (ui-sidebar).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the GlobalStandardProps.useWorkspaces merge (ui-workspace).
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import {
  WorkspaceSystemPanel, WorkspaceSystemPanelIcon, type WorkspaceSystemPanelInjected,
} from './panel.tsx'
import { installPanelStyles } from './panel.css.ts'
import { createHttpApi } from './api.ts'
import { en, zh, type WorkspaceSystemLocaleKey } from './locales.ts'

export type { WorkspaceSystemPanelProps } from './panel.tsx'
export type { WorkspaceSystemLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The workspace-level-system panel copy. */
    'panel.workspace-system': WorkspaceSystemLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'panel.workspace-system'

/** The panel's identity: the `main` keyed slot key and the panellist row id. */
const PANEL_ID = 'workspace-system' as MainPanelId

/**
 * Required services (cordis fiber inject): `slots` is the composition root
 * and `locale` serves the panel copy. The panel's slot owners (ui-layout
 * for `main`, ui-sidebar for `sidebar.panellist`) are awaited through
 * `slots.inject`, never through this declaration.
 */
export const inject = ['slots', 'locale']

/**
 * Register the panel body and its sidebar navigation row, the locale
 * dictionary, and the panel stylesheet.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS)

  ctx.effect(installPanelStyles, 'workspace-system: panel styles')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'workspace-system: dictionaries')

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: (): WorkspaceSystemPanelInjected => ({ api: createHttpApi() }),
  }, WorkspaceSystemPanel))

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 40,
    locale: NS,
    label: () => t('panelTitle'),
  }, WorkspaceSystemPanelIcon))
}
