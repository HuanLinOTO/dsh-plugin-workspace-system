/**
 * Storage layer for per-workspace system-prompt text.
 *
 * One workspace = one storage key = the first 16 hex chars of
 * `sha1(canonical cwd)`. Keying by path (not workspace id) keeps the
 * assembly-time read free of any service dependency, and gives unregistered
 * directories (Ungrouped sessions) their own prompt as a harmless superset.
 *
 * Layout under the data directory (`$DSH_HOME/workspace-level-system/`):
 *   - `<hash>.md`         the raw prompt text
 *   - `<hash>.meta.json`  `{ "path": "..." }` for human identification
 *
 * The assembly hot path reads synchronously (`readPromptSync`) behind an
 * mtime cache, so an edit saved through the gateway reaches the very next
 * model request. Reads fail soft (missing file or unreadable store ⇒ '');
 * writes (gateway path) fail loud. Host writes are serialized per data
 * directory through a promise chain.
 *
 * @module @huanlin/dsh-plugin-workspace-system/store
 */
/** Data-directory name under the resolved DSH home. */
export declare const STORE_DIR_NAME = "workspace-level-system";
/** Injection cap: text beyond this many bytes is truncated when assembled. */
export declare const INJECT_LIMIT_BYTES: number;
/** Write cap: the gateway rejects prompt text larger than this many bytes. */
export declare const WRITE_LIMIT_BYTES: number;
/** One stored prompt as the `list` route returns it. */
export interface StoredPrompt {
    /** Storage key (hash prefix). */
    key: string;
    /** Canonical workspace path recorded in the meta file. */
    path: string;
    /** Full prompt text. */
    text: string;
}
/** A store rejection carrying a stable machine-readable code. */
export declare class StoreError extends Error {
    /** Stable error code for the gateway envelope. */
    readonly code: string;
    constructor(code: string, message: string);
}
/**
 * Resolve the plugin's data directory.
 * @param dshHome - explicit DSH home override; omit to use the standard
 *   `$DSH_HOME` / `~/.dsh` resolution.
 * @returns the absolute data-directory path.
 */
export declare function storeDir(dshHome?: string): string;
/**
 * Compute the storage key for one directory path.
 * @param path - the canonical workspace path.
 * @returns the first 16 hex chars of the path's SHA-1 digest.
 */
export declare function keyOf(path: string): string;
/**
 * Read one prompt synchronously for prompt assembly. A missing file is an
 * empty prompt; any other read failure logs and contributes nothing, so a
 * broken data directory can never fail a session. Text beyond
 * {@link INJECT_LIMIT_BYTES} is truncated (with a warning).
 * @param dir - the data directory.
 * @param key - the storage key.
 * @returns the (possibly truncated) prompt text, or ''.
 */
export declare function readPromptSync(dir: string, key: string): string;
/**
 * Serialize one mutating store operation against other writes to the same
 * data directory. Later callers wait for earlier settlement, success or not.
 * @param dir - the data directory the operation writes.
 * @param op - the operation.
 * @returns the operation's settlement.
 */
export declare function withStoreWrite<T>(dir: string, op: () => Promise<T>): Promise<T>;
/**
 * Persist one workspace's prompt text (creates the data directory on demand)
 * and invalidate the read cache for that key.
 * @param dir - the data directory.
 * @param key - the storage key.
 * @param path - the canonical workspace path recorded in the meta file.
 * @param text - the prompt text; must be at most {@link WRITE_LIMIT_BYTES}.
 * @throws {@link StoreError} with code 'text-too-large' over the write cap.
 */
export declare function writePrompt(dir: string, key: string, path: string, text: string): Promise<void>;
/**
 * Remove one workspace's prompt and meta files (missing files are fine) and
 * invalidate the read cache for that key.
 * @param dir - the data directory.
 * @param key - the storage key.
 */
export declare function clearPrompt(dir: string, key: string): Promise<void>;
/**
 * List every stored prompt (any `<hash>.md` with its meta sibling). A missing
 * data directory is an empty list; a prompt without a meta file still lists
 * with an empty path.
 * @param dir - the data directory.
 * @returns the stored prompts sorted by path.
 */
export declare function listPrompts(dir: string): Promise<StoredPrompt[]>;
