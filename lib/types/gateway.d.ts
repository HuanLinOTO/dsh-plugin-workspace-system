/**
 * Host-side HTTP gateway exposing the workspace-level-system store to the
 * browser through a self-hosted `/wls/api` prefix route (the
 * ego-browser / better-sidebar / sidebar-brand-text pattern).
 *
 * Route shape (POST only, JSON envelopes `{ok, value}` / `{ok, error}`):
 *   POST /wls/api/list            → { ok: true, value: { items: StoredPrompt[] } }
 *   POST /wls/api/set  {path, text} → { ok: true, value: { key } }
 *        (empty/whitespace text runs the clear semantics)
 *   POST /wls/api/clear {path}      → { ok: true, value: { key } }
 *
 * `set`/`clear` canonicalize the path with `realpathNormalize` (the same
 * canon workspace membership uses), so a UI-supplied spelling always lands
 * on the storage key the assembly hot path computes from the session
 * `header.cwd`.
 *
 * @module @huanlin/dsh-plugin-workspace-system/gateway
 */
import type { Context } from '@deepseek-ai/cordis';
interface NodeRequest {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<unknown>;
}
interface NodeResponse {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body: string): void;
}
/**
 * Create the request handler (dependency-injected data directory, for tests).
 * @param resolveDir - resolves the data directory to read and write.
 * @returns the prefix-route handler.
 */
export declare function createGatewayHandler(resolveDir: () => string): (req: NodeRequest, res: NodeResponse) => Promise<void>;
/**
 * Register the `/wls/api` HTTP route on the host's web server.
 * @param ctx - host context carrying `webServer`.
 */
export declare function registerWorkspaceSystemGateway(ctx: Context): void;
export {};
