// @vitest-environment jsdom
/**
 * Component tests for the workspace-level-system panel body
 * (src/client/panel.tsx). Props are fed directly (the sanctioned
 * zero-machinery path): a stubbed useWorkspaces hook over registry items and
 * a stubbed WorkspaceSystemApi. Specs assert user-visible behavior — list
 * contents, selection, draft/save/clear flows, orphan grouping, empty and
 * error states.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceSystemPanel } from '../src/client/panel.tsx'
import type { WorkspaceSystemApi, WorkspaceSystemEntry } from '../src/client/api.ts'
import { en } from '../src/client/locales.ts'

/** Minimal WorkspaceView rows (the fields the panel reads). */
interface WorkspaceRow {
  workspaceId: string
  path: string
  title: string
}

/** The api stub plus test helpers. */
type ApiStub = WorkspaceSystemApi & {
  setMock: ReturnType<typeof vi.fn>
  clearMock: ReturnType<typeof vi.fn>
  apply(path: string, text: string): void
}

function makeApi(entries: WorkspaceSystemEntry[] = []): ApiStub {
  const setMock = vi.fn(async (_path: string, _text: string): Promise<{ key: string }> => ({ key: 'k' }))
  const clearMock = vi.fn(async (_path: string): Promise<{ key: string }> => ({ key: 'k' }))
  let stored = [...entries]
  const api: WorkspaceSystemApi = {
    list: vi.fn(async () => stored.map(item => ({ ...item }))),
    set: setMock,
    clear: clearMock,
  }
  return Object.assign(api, {
    setMock,
    clearMock,
    /** Test helper: simulate the host applying a write. */
    apply(path: string, text: string): void {
      stored = text === ''
        ? stored.filter(item => item.path !== path)
        : [...stored.filter(item => item.path !== path), { key: `key-${path}`, path, text }]
    },
  })
}

function makeProps(options: {
  api: WorkspaceSystemApi
  workspaces?: WorkspaceRow[]
}) {
  const items = (options.workspaces ?? [
    { workspaceId: 'w1', path: 'C:/work/alpha', title: 'Alpha' },
    { workspaceId: 'w2', path: 'C:/work/beta', title: 'Beta' },
  ]).map(workspace => ({ ...workspace, sessionIds: [], createdAt: '', updatedAt: '' }))
  return {
    t: (key: keyof typeof en) => en[key],
    api: options.api,
    useWorkspaces: vi.fn((selector: (state: { items: typeof items }) => unknown) => selector({ items })),
  } as never
}

afterEach(cleanup)

describe('WorkspaceSystemPanel', () => {
  it('renders every workspace row and no configured badge without stored prompts', async () => {
    const api = makeApi()
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    expect(await screen.findByRole('button', { name: /Alpha/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Beta/ })).toBeTruthy()
    expect(screen.queryByText(en.configured)).toBeNull()
    expect(screen.queryByText(en.orphanGroup)).toBeNull()
  })

  it('badges workspaces with a stored prompt', async () => {
    const api = makeApi([{ key: 'k1', path: 'C:/work/alpha', text: 'be terse' }])
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByRole('button', { name: /Alpha/ })
    expect(screen.getByText(en.configured)).toBeTruthy()
  })

  it('loads the selected workspace text and switches selection on click', async () => {
    const api = makeApi([
      { key: 'k1', path: 'C:/work/alpha', text: 'alpha prompt' },
      { key: 'k2', path: 'C:/work/beta', text: 'beta prompt' },
    ])
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    const editor = await screen.findByLabelText(en.promptLabel)
    expect((editor as HTMLTextAreaElement).value).toBe('alpha prompt')
    fireEvent.click(screen.getByRole('button', { name: /Beta/ }))
    expect((screen.getByLabelText(en.promptLabel) as HTMLTextAreaElement).value).toBe('beta prompt')
  })

  it('marks the draft dirty and saves through the api', async () => {
    const api = makeApi()
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByRole('button', { name: /Alpha/ })
    const editor = screen.getByLabelText(en.promptLabel) as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: 'new guidance' } })
    expect(screen.getByText(en.unsaved)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(api.set).toHaveBeenCalledWith('C:/work/alpha', 'new guidance') })
  })

  it('shows the saved status after a successful save', async () => {
    const api = makeApi()
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByRole('button', { name: /Alpha/ })
    fireEvent.change(screen.getByLabelText(en.promptLabel), { target: { value: 'next' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    expect(await screen.findByText(en.saved)).toBeTruthy()
  })

  it('shows an error status when the api rejects', async () => {
    const api = makeApi()
    api.set = vi.fn(async () => { throw new Error('boom') })
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByRole('button', { name: /Alpha/ })
    fireEvent.change(screen.getByLabelText(en.promptLabel), { target: { value: 'next' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    expect(await screen.findByText(new RegExp(en.saveFailed))).toBeTruthy()
  })

  it('clears through the api and empties the editor', async () => {
    const api = makeApi([{ key: 'k1', path: 'C:/work/alpha', text: 'stale' }])
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByDisplayValue('stale')
    fireEvent.click(screen.getByRole('button', { name: en.clear }))
    await waitFor(() => { expect(api.clear).toHaveBeenCalledWith('C:/work/alpha') })
  })

  it('groups stored prompts without a matching workspace as orphans', async () => {
    const api = makeApi([
      { key: 'k-gone', path: 'C:/work/gone', text: 'leftover' },
    ])
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    expect(await screen.findByText(en.orphanGroup)).toBeTruthy()
    expect(screen.getByRole('button', { name: /gone/ })).toBeTruthy()
  })

  it('lets an orphan row be selected and edited', async () => {
    const api = makeApi([{ key: 'k-gone', path: 'C:/work/gone', text: 'leftover' }])
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    await screen.findByText(en.orphanGroup)
    fireEvent.click(screen.getByRole('button', { name: /gone/ }))
    expect((screen.getByLabelText(en.promptLabel) as HTMLTextAreaElement).value).toBe('leftover')
  })

  it('shows the empty hint when no workspaces and no stored prompts exist', async () => {
    const api = makeApi()
    render(<WorkspaceSystemPanel {...makeProps({ api, workspaces: [] })} />)
    expect(await screen.findByText(en.empty)).toBeTruthy()
    expect(screen.getByText(en.emptyEditor)).toBeTruthy()
  })

  it('shows an error status when the initial list fails', async () => {
    const api = makeApi()
    api.list = vi.fn(async () => { throw new Error('unreachable') })
    render(<WorkspaceSystemPanel {...makeProps({ api })} />)
    expect(await screen.findByText(/unreachable/)).toBeTruthy()
  })
})
