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
export declare const css: {
    readonly panel: "dsh-wls-panel";
    readonly header: "dsh-wls-header";
    readonly heading: "dsh-wls-heading";
    readonly description: "dsh-wls-description";
    readonly columns: "dsh-wls-columns";
    readonly list: "dsh-wls-list";
    readonly listGroup: "dsh-wls-list-group";
    readonly listTitle: "dsh-wls-list-title";
    readonly row: "dsh-wls-row";
    readonly rowActive: "dsh-wls-row--active";
    readonly rowTitle: "dsh-wls-row-title";
    readonly badges: "dsh-wls-badges";
    readonly badge: "dsh-wls-badge";
    readonly badgeMuted: "dsh-wls-badge--muted";
    readonly hint: "dsh-wls-hint";
    readonly editor: "dsh-wls-editor";
    readonly editorHead: "dsh-wls-editor-head";
    readonly label: "dsh-wls-label";
    readonly path: "dsh-wls-path";
    readonly textarea: "dsh-wls-textarea";
    readonly footer: "dsh-wls-footer";
    readonly status: "dsh-wls-status";
    readonly statusError: "dsh-wls-status--error";
    readonly clear: "dsh-wls-clear";
    readonly save: "dsh-wls-save";
};
/**
 * Install the panel stylesheet as one tagged `<style>` element.
 * @returns the disposer removing the tag (idempotent outside a document).
 */
export declare function installPanelStyles(): () => void;
