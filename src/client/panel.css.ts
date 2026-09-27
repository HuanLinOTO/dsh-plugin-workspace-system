/**
 * Panel styles + runtime style injection for the workspace-level-system
 * sidebar panel. The DSH client loader never serves `.css` artifacts —
 * every style is injected inside the bundle's factory closure as one tagged
 * `<style data-plugin-css>` element, removed when the plugin unloads.
 * Static prefixed class names (`dsh-wls-*`) replace CSS modules; colors
 * resolve through `--dsw-alias-*` tokens so the panel adapts to the
 * light/dark theme.
 *
 * @module @huanlin/dsh-plugin-workspace-system/client/panel.css
 */

/** Class-name map consumed by the panel component. */
export const css = {
  panel: 'dsh-wls-panel',
  header: 'dsh-wls-header',
  heading: 'dsh-wls-heading',
  description: 'dsh-wls-description',
  columns: 'dsh-wls-columns',
  list: 'dsh-wls-list',
  listGroup: 'dsh-wls-list-group',
  listTitle: 'dsh-wls-list-title',
  row: 'dsh-wls-row',
  rowActive: 'dsh-wls-row--active',
  rowTitle: 'dsh-wls-row-title',
  badges: 'dsh-wls-badges',
  badge: 'dsh-wls-badge',
  badgeMuted: 'dsh-wls-badge--muted',
  hint: 'dsh-wls-hint',
  editor: 'dsh-wls-editor',
  editorHead: 'dsh-wls-editor-head',
  label: 'dsh-wls-label',
  path: 'dsh-wls-path',
  textarea: 'dsh-wls-textarea',
  footer: 'dsh-wls-footer',
  status: 'dsh-wls-status',
  statusError: 'dsh-wls-status--error',
  clear: 'dsh-wls-clear',
  save: 'dsh-wls-save',
} as const

/** `data-plugin-css` tag id of the injected stylesheet. */
const STYLE_TAG_ID = '@huanlin/dsh-plugin-workspace-system/panel.css'

/** The panel stylesheet (injected as one tagged `<style>` at activation). */
const CSS = `
.dsh-wls-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 20px 24px;
  box-sizing: border-box;
  gap: 12px;
}

.dsh-wls-header {
  flex: none;
}

.dsh-wls-heading {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.dsh-wls-description {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-columns {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  gap: 16px;
}

.dsh-wls-list {
  flex: 0 0 264px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3, transparent);
}

.dsh-wls-list-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-wls-list-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
  padding: 6px 8px 2px;
}

.dsh-wls-row {
  display: flex;
  align-items: center;
  gap: 8px;
  appearance: none;
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  background: transparent;
}

.dsh-wls-row:hover {
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
}

.dsh-wls-row--active {
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.18));
}

.dsh-wls-row-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-wls-badges {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.dsh-wls-badge {
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, inherit);
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
}

.dsh-wls-badge--muted {
  opacity: 0.7;
}

.dsh-wls-hint {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-editor {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
}

.dsh-wls-editor-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-wls-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, inherit);
}

.dsh-wls-path {
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
  word-break: break-all;
}

.dsh-wls-textarea {
  flex: 1 1 auto;
  min-height: 120px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  padding: 10px 12px;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-layer-3, transparent);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  border-radius: 10px;
}

.dsh-wls-textarea:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary, #0a84ff);
}

.dsh-wls-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dsh-wls-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.dsh-wls-status {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-status--error {
  color: var(--dsw-alias-label-error, #ff453a);
}

.dsh-wls-clear,
.dsh-wls-save {
  appearance: none;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  padding: 5px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
  transition: background 0.16s, opacity 0.16s;
}

.dsh-wls-save {
  background: var(--dsw-alias-brand-primary, #0a84ff);
  color: var(--dsw-alias-bg-layer-1, #fff);
}

.dsh-wls-clear:disabled,
.dsh-wls-save:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
`

/**
 * Install the panel stylesheet as one tagged `<style>` element.
 * @returns the disposer removing the tag (idempotent outside a document).
 */
export function installPanelStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.querySelector(`style[data-plugin-css='${STYLE_TAG_ID}']`) !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = '@huanlin/dsh-plugin-workspace-system'
  style.dataset.pluginCss = STYLE_TAG_ID
  style.textContent = CSS
  document.head.appendChild(style)
  return () => { style.remove() }
}
