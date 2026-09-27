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
import { WorkspaceSystemPanel, WorkspaceSystemPanelIcon, } from "./panel.js";
import { installPanelStyles } from "./panel.css.js";
import { createHttpApi } from "./api.js";
import { en, zh } from "./locales.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'panel.workspace-system';
/** The panel's identity: the `main` keyed slot key and the panellist row id. */
const PANEL_ID = 'workspace-system';
/**
 * Required services (cordis fiber inject): `slots` is the composition root
 * and `locale` serves the panel copy. The panel's slot owners (ui-layout
 * for `main`, ui-sidebar for `sidebar.panellist`) are awaited through
 * `slots.inject`, never through this declaration.
 */
export const inject = ['slots', 'locale'];
/**
 * Register the panel body and its sidebar navigation row, the locale
 * dictionary, and the panel stylesheet.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    const t = ctx.locale.bind(NS);
    ctx.effect(installPanelStyles, 'workspace-system: panel styles');
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'workspace-system: dictionaries');
    ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ api: createHttpApi() }),
    }, WorkspaceSystemPanel));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 40,
        locale: NS,
        label: () => t('panelTitle'),
    }, WorkspaceSystemPanelIcon));
}
