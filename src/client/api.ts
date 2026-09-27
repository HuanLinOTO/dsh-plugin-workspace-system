/**
 * Browser-side client for the host's `/wls/api` gateway. Every method
 * posts JSON and unwraps the `{ok, value}` / `{ok, error}` envelope;
 * transport or application failures reject with an `Error`.
 *
 * @module @huanlin/dsh-plugin-workspace-system/client/api
 */

/** One stored prompt as the `list` route returns it. */
export interface WorkspaceSystemEntry {
  /** Storage key (hash prefix). */
  key: string
  /** Canonical workspace path. */
  path: string
  /** Stored prompt text. */
  text: string
}

/** The panel's read/write channel against the host store. */
export interface WorkspaceSystemApi {
  /** List every stored prompt. */
  list(): Promise<WorkspaceSystemEntry[]>
  /** Save one workspace's prompt (empty text clears). */
  set(path: string, text: string): Promise<{ key: string }>
  /** Remove one workspace's prompt. */
  clear(path: string): Promise<{ key: string }>
}

/** Envelope shapes the gateway answers with. */
interface Envelope<T> {
  ok: boolean
  value?: T
  error?: { code?: string, message?: string }
}

/**
 * Create the HTTP-backed API client.
 * @param prefix - route prefix; defaults to the gateway's `/wls/api`.
 * @returns the API surface used by the panel.
 */
export function createHttpApi(prefix = '/wls/api'): WorkspaceSystemApi {
  const call = async <T>(method: string, body: Record<string, string>): Promise<T> => {
    let response: Response
    try {
      response = await fetch(`${prefix}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (error) {
      throw new Error(`workspace-level-system: ${method} unreachable`, { cause: error })
    }
    let parsed: Envelope<T>
    try {
      parsed = await response.json() as Envelope<T>
    } catch (error) {
      throw new Error(`workspace-level-system: ${method} returned malformed JSON (HTTP ${response.status})`, { cause: error })
    }
    if (!response.ok || parsed.ok !== true || parsed.value === undefined) {
      throw new Error(parsed.error?.message ?? `workspace-level-system: ${method} failed (HTTP ${response.status})`)
    }
    return parsed.value
  }
  return {
    list: async () => (await call<{ items: WorkspaceSystemEntry[] }>('list', {})).items,
    set: (path, text) => call<{ key: string }>('set', { path, text }),
    clear: (path) => call<{ key: string }>('clear', { path }),
  }
}
