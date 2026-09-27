/**
 * Browser-side client for the host's `/wls/api` gateway. Every method
 * posts JSON and unwraps the `{ok, value}` / `{ok, error}` envelope;
 * transport or application failures reject with an `Error`.
 *
 * @module @huanlin/dsh-plugin-workspace-system/client/api
 */
/**
 * Create the HTTP-backed API client.
 * @param prefix - route prefix; defaults to the gateway's `/wls/api`.
 * @returns the API surface used by the panel.
 */
export function createHttpApi(prefix = '/wls/api') {
    const call = async (method, body) => {
        let response;
        try {
            response = await fetch(`${prefix}/${method}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
        }
        catch (error) {
            throw new Error(`workspace-level-system: ${method} unreachable`, { cause: error });
        }
        let parsed;
        try {
            parsed = await response.json();
        }
        catch (error) {
            throw new Error(`workspace-level-system: ${method} returned malformed JSON (HTTP ${response.status})`, { cause: error });
        }
        if (!response.ok || parsed.ok !== true || parsed.value === undefined) {
            throw new Error(parsed.error?.message ?? `workspace-level-system: ${method} failed (HTTP ${response.status})`);
        }
        return parsed.value;
    };
    return {
        list: async () => (await call('list', {})).items,
        set: (path, text) => call('set', { path, text }),
        clear: (path) => call('clear', { path }),
    };
}
