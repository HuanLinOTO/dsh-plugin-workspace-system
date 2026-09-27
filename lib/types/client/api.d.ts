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
    key: string;
    /** Canonical workspace path. */
    path: string;
    /** Stored prompt text. */
    text: string;
}
/** The panel's read/write channel against the host store. */
export interface WorkspaceSystemApi {
    /** List every stored prompt. */
    list(): Promise<WorkspaceSystemEntry[]>;
    /** Save one workspace's prompt (empty text clears). */
    set(path: string, text: string): Promise<{
        key: string;
    }>;
    /** Remove one workspace's prompt. */
    clear(path: string): Promise<{
        key: string;
    }>;
}
/**
 * Create the HTTP-backed API client.
 * @param prefix - route prefix; defaults to the gateway's `/wls/api`.
 * @returns the API surface used by the panel.
 */
export declare function createHttpApi(prefix?: string): WorkspaceSystemApi;
