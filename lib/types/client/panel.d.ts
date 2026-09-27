/**
 * The workspace-level-system sidebar panel body (the `main` keyed slot's
 * `workspace-system` panel).
 *
 * Left column: every registered workspace (the global `useWorkspaces`
 * hook), each badged when a stored prompt exists, plus a trailing group for
 * stored prompts whose path no longer matches any workspace (orphans —
 * a deleted workspace leaves its data files behind). Right column: the
 * selected workspace's prompt textarea with Save / Clear, talking to the
 * host store through the injected {@link WorkspaceSystemApi}.
 *
 * Selection and drafts are panel-local state; switching workspaces discards
 * the draft (the unsaved badge marks one before that). All product copy is
 * locale-owned; styles come from the injected `panel.css` stylesheet.
 */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { WorkspaceSystemApi } from './api.ts';
/** Locale namespace owned by this panel (registered in client/index.ts). */
type NS = 'panel.workspace-system';
/** Injected dependencies of the panel body (slot `inject`). */
export type WorkspaceSystemPanelInjected = {
    /** Read/write channel against the host store. */
    api: WorkspaceSystemApi;
};
/** Props the renderer binds for the panel body. */
export type WorkspaceSystemPanelProps = PropsRuntime<'main'> & PropsLocale<NS> & InjectFace<WorkspaceSystemPanelInjected>;
/**
 * The panel's navigation-row icon (`sidebar.panellist` seat): the folder
 * glyph at the row's current size.
 * @param props - the panel-list seat props (size, active).
 * @returns the icon element.
 */
export declare function WorkspaceSystemPanelIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode;
/**
 * Render the workspace-level-system panel.
 * @param props - the locale seat, the global `useWorkspaces` hook, and the API.
 * @returns the panel body.
 */
export declare function WorkspaceSystemPanel(props: WorkspaceSystemPanelProps): ReactNode;
export {};
