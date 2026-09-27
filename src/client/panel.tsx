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

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconFolderCloseRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { css } from './panel.css.ts'
import type { WorkspaceSystemApi, WorkspaceSystemEntry } from './api.ts'

/** Locale namespace owned by this panel (registered in client/index.ts). */
type NS = 'panel.workspace-system'

/** Injected dependencies of the panel body (slot `inject`). */
export type WorkspaceSystemPanelInjected = {
  /** Read/write channel against the host store. */
  api: WorkspaceSystemApi
}

/** Props the renderer binds for the panel body. */
export type WorkspaceSystemPanelProps =
  PropsRuntime<'main'>
  & PropsLocale<NS>
  & InjectFace<WorkspaceSystemPanelInjected>

/** Final line segment of a path, for orphan rows without a title. */
function pathBasename(path: string): string {
  const segments = path.split(/[\\/]/).filter(segment => segment !== '')
  return segments.at(-1) ?? path
}

/**
 * The panel's navigation-row icon (`sidebar.panellist` seat): the folder
 * glyph at the row's current size.
 * @param props - the panel-list seat props (size, active).
 * @returns the icon element.
 */
export function WorkspaceSystemPanelIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <IconFolderCloseRegular size={size} />
}

/** Status of the last save/clear action. */
type ApplyStatus =
  | { kind: 'idle' }
  | { kind: 'saved' }
  | { kind: 'cleared' }
  | { kind: 'error', message: string }

/**
 * Render the workspace-level-system panel.
 * @param props - the locale seat, the global `useWorkspaces` hook, and the API.
 * @returns the panel body.
 */
export function WorkspaceSystemPanel(props: WorkspaceSystemPanelProps): ReactNode {
  const { t } = props
  const api = props.api
  const workspaces = props.useWorkspaces(snapshot => snapshot.items)
  const [entries, setEntries] = useState<WorkspaceSystemEntry[] | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<ApplyStatus>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    api.list()
      .then(items => { if (!cancelled) setEntries(items) })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setEntries([])
        setStatus({ kind: 'error', message })
      })
    return () => { cancelled = true }
  }, [api])

  const textByPath = new Map((entries ?? []).map(entry => [entry.path, entry]))
  const registeredPaths = new Set(workspaces.map(workspace => workspace.path))
  const orphans = (entries ?? []).filter(entry => entry.path !== '' && !registeredPaths.has(entry.path))
  const effectiveSelected = selectedPath
    ?? (workspaces[0]?.path ?? orphans[0]?.path ?? null)
  const selectedEntry = effectiveSelected !== null ? textByPath.get(effectiveSelected) : undefined
  const selectedText = selectedEntry?.text ?? ''
  const dirty = draft !== selectedText

  // While no row was explicitly selected (initial auto-selection), the
  // editor follows the stored text once the list arrives; after an explicit
  // selection, select() owns the draft.
  useEffect(() => {
    if (selectedPath === null) setDraft(selectedText)
  }, [selectedPath, selectedText])

  const select = (path: string): void => {
    setSelectedPath(path)
    setDraft(textByPath.get(path)?.text ?? '')
    setStatus({ kind: 'idle' })
  }

  const refresh = async (): Promise<void> => {
    setEntries(await api.list())
  }

  const save = async (): Promise<void> => {
    if (effectiveSelected === null || saving) return
    setSaving(true)
    setStatus({ kind: 'idle' })
    try {
      await api.set(effectiveSelected, draft)
      await refresh()
      setStatus({ kind: 'saved' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus({ kind: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const clear = async (): Promise<void> => {
    if (effectiveSelected === null || saving) return
    setSaving(true)
    setStatus({ kind: 'idle' })
    try {
      await api.clear(effectiveSelected)
      await refresh()
      setDraft('')
      setStatus({ kind: 'cleared' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus({ kind: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const statusText = status.kind === 'saved'
    ? t('saved')
    : status.kind === 'cleared'
      ? t('cleared')
      : status.kind === 'error'
        ? `${t('saveFailed')} ${status.message}`
        : null

  return (
    <div className={css.panel}>
      <header className={css.header}>
        <h2 className={css.heading}>{t('heading')}</h2>
        <p className={css.description}>{t('description')}</p>
      </header>
      <div className={css.columns}>
        <nav className={css.list} aria-label={t('heading')}>
          {workspaces.length === 0 && orphans.length === 0
            ? <p className={css.hint}>{entries === null ? t('loading') : t('empty')}</p>
            : (
              <>
                {workspaces.length > 0
                  ? (
                    <div className={css.listGroup}>
                      <p className={css.listTitle}>{t('workspaceGroup')}</p>
                      {workspaces.map(workspace => (
                        <button
                          type="button"
                          key={workspace.workspaceId}
                          className={clsx(css.row, effectiveSelected === workspace.path && css.rowActive)}
                          aria-current={effectiveSelected === workspace.path ? 'true' : undefined}
                          onClick={() => { select(workspace.path) }}
                        >
                          <span className={css.rowTitle}>{workspace.title || pathBasename(workspace.path)}</span>
                          <span className={css.badges}>
                            {(textByPath.get(workspace.path)?.text ?? '') !== ''
                              ? <span className={css.badge}>{t('configured')}</span>
                              : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                  : null}
                {orphans.length > 0
                  ? (
                    <div className={css.listGroup}>
                      <p className={css.listTitle}>{t('orphanGroup')}</p>
                      {orphans.map(entry => (
                        <button
                          type="button"
                          key={entry.key}
                          className={clsx(css.row, effectiveSelected === entry.path && css.rowActive)}
                          aria-current={effectiveSelected === entry.path ? 'true' : undefined}
                          onClick={() => { select(entry.path) }}
                        >
                          <span className={css.rowTitle}>{pathBasename(entry.path)}</span>
                          <span className={css.badges}>
                            <span className={clsx(css.badge, css.badgeMuted)}>{t('orphan')}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                  : null}
              </>
            )}
        </nav>
        {effectiveSelected === null
          ? <p className={css.hint}>{t('emptyEditor')}</p>
          : (
            <section className={css.editor}>
              <div className={css.editorHead}>
                <label className={css.label} htmlFor="workspace-system-prompt">{t('promptLabel')}</label>
                <span className={css.path}>{t('promptPath')} {effectiveSelected}</span>
              </div>
              <textarea
                id="workspace-system-prompt"
                className={css.textarea}
                value={draft}
                placeholder={t('promptPlaceholder')}
                disabled={saving}
                onChange={(event) => { setDraft(event.target.value) }}
              />
              <p className={css.hint}>{t('promptHint')}</p>
              <div className={css.footer}>
                {statusText !== null
                  ? (
                    <p
                      className={clsx(css.status, status.kind === 'error' && css.statusError)}
                      role="status"
                    >
                      {statusText}
                    </p>
                  )
                  : null}
                {dirty ? <span className={clsx(css.badge, css.badgeMuted)}>{t('unsaved')}</span> : null}
                <button
                  type="button"
                  className={css.clear}
                  disabled={saving || selectedText === ''}
                  onClick={() => { void clear() }}
                >
                  {t('clear')}
                </button>
                <button
                  type="button"
                  className={css.save}
                  disabled={saving || !dirty}
                  onClick={() => { void save() }}
                >
                  {t(saving ? 'saving' : 'save')}
                </button>
              </div>
            </section>
          )}
      </div>
    </div>
  )
}
