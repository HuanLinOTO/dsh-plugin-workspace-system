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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type WorkspaceSystemLocaleKey } from './locales.ts';
export type { WorkspaceSystemPanelProps } from './panel.tsx';
export type { WorkspaceSystemLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The workspace-level-system panel copy. */
        'panel.workspace-system': WorkspaceSystemLocaleKey;
    }
}
/**
 * Required services (cordis fiber inject): `slots` is the composition root
 * and `locale` serves the panel copy. The panel's slot owners (ui-layout
 * for `main`, ui-sidebar for `sidebar.panellist`) are awaited through
 * `slots.inject`, never through this declaration.
 */
export declare const inject: string[];
/**
 * Register the panel body and its sidebar navigation row, the locale
 * dictionary, and the panel stylesheet.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
