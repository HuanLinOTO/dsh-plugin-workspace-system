import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { IconFolderCloseRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { css } from "./panel.css.js";
/** Final line segment of a path, for orphan rows without a title. */
function pathBasename(path) {
    const segments = path.split(/[\\/]/).filter(segment => segment !== '');
    return segments.at(-1) ?? path;
}
/**
 * The panel's navigation-row icon (`sidebar.panellist` seat): the folder
 * glyph at the row's current size.
 * @param props - the panel-list seat props (size, active).
 * @returns the icon element.
 */
export function WorkspaceSystemPanelIcon({ size }) {
    return _jsx(IconFolderCloseRegular, { size: size });
}
/**
 * Render the workspace-level-system panel.
 * @param props - the locale seat, the global `useWorkspaces` hook, and the API.
 * @returns the panel body.
 */
export function WorkspaceSystemPanel(props) {
    const { t } = props;
    const api = props.api;
    const workspaces = props.useWorkspaces(snapshot => snapshot.items);
    const [entries, setEntries] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ kind: 'idle' });
    useEffect(() => {
        let cancelled = false;
        api.list()
            .then(items => { if (!cancelled)
            setEntries(items); })
            .catch((error) => {
            if (cancelled)
                return;
            const message = error instanceof Error ? error.message : String(error);
            setEntries([]);
            setStatus({ kind: 'error', message });
        });
        return () => { cancelled = true; };
    }, [api]);
    const textByPath = new Map((entries ?? []).map(entry => [entry.path, entry]));
    const registeredPaths = new Set(workspaces.map(workspace => workspace.path));
    const orphans = (entries ?? []).filter(entry => entry.path !== '' && !registeredPaths.has(entry.path));
    const effectiveSelected = selectedPath
        ?? (workspaces[0]?.path ?? orphans[0]?.path ?? null);
    const selectedEntry = effectiveSelected !== null ? textByPath.get(effectiveSelected) : undefined;
    const selectedText = selectedEntry?.text ?? '';
    const dirty = draft !== selectedText;
    // While no row was explicitly selected (initial auto-selection), the
    // editor follows the stored text once the list arrives; after an explicit
    // selection, select() owns the draft.
    useEffect(() => {
        if (selectedPath === null)
            setDraft(selectedText);
    }, [selectedPath, selectedText]);
    const select = (path) => {
        setSelectedPath(path);
        setDraft(textByPath.get(path)?.text ?? '');
        setStatus({ kind: 'idle' });
    };
    const refresh = async () => {
        setEntries(await api.list());
    };
    const save = async () => {
        if (effectiveSelected === null || saving)
            return;
        setSaving(true);
        setStatus({ kind: 'idle' });
        try {
            await api.set(effectiveSelected, draft);
            await refresh();
            setStatus({ kind: 'saved' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setStatus({ kind: 'error', message });
        }
        finally {
            setSaving(false);
        }
    };
    const clear = async () => {
        if (effectiveSelected === null || saving)
            return;
        setSaving(true);
        setStatus({ kind: 'idle' });
        try {
            await api.clear(effectiveSelected);
            await refresh();
            setDraft('');
            setStatus({ kind: 'cleared' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setStatus({ kind: 'error', message });
        }
        finally {
            setSaving(false);
        }
    };
    const statusText = status.kind === 'saved'
        ? t('saved')
        : status.kind === 'cleared'
            ? t('cleared')
            : status.kind === 'error'
                ? `${t('saveFailed')} ${status.message}`
                : null;
    return (_jsxs("div", { className: css.panel, children: [_jsxs("header", { className: css.header, children: [_jsx("h2", { className: css.heading, children: t('heading') }), _jsx("p", { className: css.description, children: t('description') })] }), _jsxs("div", { className: css.columns, children: [_jsx("nav", { className: css.list, "aria-label": t('heading'), children: workspaces.length === 0 && orphans.length === 0
                            ? _jsx("p", { className: css.hint, children: entries === null ? t('loading') : t('empty') })
                            : (_jsxs(_Fragment, { children: [workspaces.length > 0
                                        ? (_jsxs("div", { className: css.listGroup, children: [_jsx("p", { className: css.listTitle, children: t('workspaceGroup') }), workspaces.map(workspace => (_jsxs("button", { type: "button", className: clsx(css.row, effectiveSelected === workspace.path && css.rowActive), "aria-current": effectiveSelected === workspace.path ? 'true' : undefined, onClick: () => { select(workspace.path); }, children: [_jsx("span", { className: css.rowTitle, children: workspace.title || pathBasename(workspace.path) }), _jsx("span", { className: css.badges, children: (textByPath.get(workspace.path)?.text ?? '') !== ''
                                                                ? _jsx("span", { className: css.badge, children: t('configured') })
                                                                : null })] }, workspace.workspaceId)))] }))
                                        : null, orphans.length > 0
                                        ? (_jsxs("div", { className: css.listGroup, children: [_jsx("p", { className: css.listTitle, children: t('orphanGroup') }), orphans.map(entry => (_jsxs("button", { type: "button", className: clsx(css.row, effectiveSelected === entry.path && css.rowActive), "aria-current": effectiveSelected === entry.path ? 'true' : undefined, onClick: () => { select(entry.path); }, children: [_jsx("span", { className: css.rowTitle, children: pathBasename(entry.path) }), _jsx("span", { className: css.badges, children: _jsx("span", { className: clsx(css.badge, css.badgeMuted), children: t('orphan') }) })] }, entry.key)))] }))
                                        : null] })) }), effectiveSelected === null
                        ? _jsx("p", { className: css.hint, children: t('emptyEditor') })
                        : (_jsxs("section", { className: css.editor, children: [_jsxs("div", { className: css.editorHead, children: [_jsx("label", { className: css.label, htmlFor: "workspace-system-prompt", children: t('promptLabel') }), _jsxs("span", { className: css.path, children: [t('promptPath'), " ", effectiveSelected] })] }), _jsx("textarea", { id: "workspace-system-prompt", className: css.textarea, value: draft, placeholder: t('promptPlaceholder'), disabled: saving, onChange: (event) => { setDraft(event.target.value); } }), _jsx("p", { className: css.hint, children: t('promptHint') }), _jsxs("div", { className: css.footer, children: [statusText !== null
                                            ? (_jsx("p", { className: clsx(css.status, status.kind === 'error' && css.statusError), role: "status", children: statusText }))
                                            : null, dirty ? _jsx("span", { className: clsx(css.badge, css.badgeMuted), children: t('unsaved') }) : null, _jsx("button", { type: "button", className: css.clear, disabled: saving || selectedText === '', onClick: () => { void clear(); }, children: t('clear') }), _jsx("button", { type: "button", className: css.save, disabled: saving || !dirty, onClick: () => { void save(); }, children: t(saving ? 'saving' : 'save') })] })] }))] })] }));
}
