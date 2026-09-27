import { realpathNormalize } from "@deepseek-ai/dsh-workspace";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";

//#region src/store.ts
/** Data-directory name under the resolved DSH home. */
const STORE_DIR_NAME = "workspace-level-system";
/** Injection cap: text beyond this many bytes is truncated when assembled. */
const INJECT_LIMIT_BYTES = 256 * 1024;
/** Write cap: the gateway rejects prompt text larger than this many bytes. */
const WRITE_LIMIT_BYTES = 1024 * 1024;
/** A store rejection carrying a stable machine-readable code. */
var StoreError = class extends Error {
	/** Stable error code for the gateway envelope. */
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
	}
};
/**
* Resolve the plugin's data directory.
* @param dshHome - explicit DSH home override; omit to use the standard
*   `$DSH_HOME` / `~/.dsh` resolution.
* @returns the absolute data-directory path.
*/
function storeDir(dshHome) {
	return join(resolveDshHome(dshHome), STORE_DIR_NAME);
}
/**
* Compute the storage key for one directory path.
* @param path - the canonical workspace path.
* @returns the first 16 hex chars of the path's SHA-1 digest.
*/
function keyOf(path) {
	return createHash("sha1").update(path).digest("hex").slice(0, 16);
}
const readCache = /* @__PURE__ */ new Map();
function cacheKey(dir, key) {
	return `${dir}\u0000${key}`;
}
/**
* Read one prompt synchronously for prompt assembly. A missing file is an
* empty prompt; any other read failure logs and contributes nothing, so a
* broken data directory can never fail a session. Text beyond
* {@link INJECT_LIMIT_BYTES} is truncated (with a warning).
* @param dir - the data directory.
* @param key - the storage key.
* @returns the (possibly truncated) prompt text, or ''.
*/
function readPromptSync(dir, key) {
	const file = join(dir, `${key}.md`);
	let mtimeMs;
	try {
		mtimeMs = statSync(file).mtimeMs;
	} catch (error) {
		if (error.code === "ENOENT") {
			readCache.delete(cacheKey(dir, key));
			return "";
		}
		console.error(`workspace-level-system: cannot stat ${file}:`, error);
		return "";
	}
	const cached = cacheKey(dir, key);
	const hit = readCache.get(cached);
	if (hit !== void 0 && hit.mtimeMs === mtimeMs) return capForInjection(hit.text, file);
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch (error) {
		console.error(`workspace-level-system: cannot read ${file}:`, error);
		return "";
	}
	readCache.set(cached, {
		mtimeMs,
		text
	});
	return capForInjection(text, file);
}
/** Truncate prompt text to the injection byte cap (UTF-8 boundary safe). */
function capForInjection(text, file) {
	const bytes = Buffer.byteLength(text, "utf8");
	if (bytes <= INJECT_LIMIT_BYTES) return text;
	console.warn(`workspace-level-system: ${file} is ${bytes} bytes; injecting only the first ${INJECT_LIMIT_BYTES} bytes`);
	return Buffer.from(text, "utf8").subarray(0, INJECT_LIMIT_BYTES).toString("utf8");
}
/** Per-directory write serialization queues (promise chains). */
const writeQueues = /* @__PURE__ */ new Map();
/**
* Serialize one mutating store operation against other writes to the same
* data directory. Later callers wait for earlier settlement, success or not.
* @param dir - the data directory the operation writes.
* @param op - the operation.
* @returns the operation's settlement.
*/
function withStoreWrite(dir, op) {
	const next = (writeQueues.get(dir) ?? Promise.resolve()).then(op, op);
	writeQueues.set(dir, next.catch(() => {}));
	return next;
}
/** Write one file through a `.tmp` sibling + rename (atomic replace). */
async function writeAtomic(file, content) {
	const tmp = `${file}.tmp`;
	await writeFile(tmp, content, "utf8");
	await rename(tmp, file);
}
/**
* Persist one workspace's prompt text (creates the data directory on demand)
* and invalidate the read cache for that key.
* @param dir - the data directory.
* @param key - the storage key.
* @param path - the canonical workspace path recorded in the meta file.
* @param text - the prompt text; must be at most {@link WRITE_LIMIT_BYTES}.
* @throws {@link StoreError} with code 'text-too-large' over the write cap.
*/
async function writePrompt(dir, key, path, text) {
	const bytes = Buffer.byteLength(text, "utf8");
	if (bytes > WRITE_LIMIT_BYTES) throw new StoreError("text-too-large", `prompt text is ${bytes} bytes; the limit is ${WRITE_LIMIT_BYTES}`);
	await mkdir(dir, { recursive: true });
	await writeAtomic(join(dir, `${key}.md`), text);
	await writeAtomic(join(dir, `${key}.meta.json`), `${JSON.stringify({ path }, null, 2)}\n`);
	readCache.delete(cacheKey(dir, key));
}
/**
* Remove one workspace's prompt and meta files (missing files are fine) and
* invalidate the read cache for that key.
* @param dir - the data directory.
* @param key - the storage key.
*/
async function clearPrompt(dir, key) {
	await rm(join(dir, `${key}.md`), { force: true });
	await rm(join(dir, `${key}.meta.json`), { force: true });
	readCache.delete(cacheKey(dir, key));
}
/**
* List every stored prompt (any `<hash>.md` with its meta sibling). A missing
* data directory is an empty list; a prompt without a meta file still lists
* with an empty path.
* @param dir - the data directory.
* @returns the stored prompts sorted by path.
*/
async function listPrompts(dir) {
	let names;
	try {
		names = await readdir(dir);
	} catch (error) {
		if (error.code === "ENOENT") return [];
		throw error;
	}
	const items = [];
	for (const name$1 of names) {
		if (!name$1.endsWith(".md")) continue;
		const key = name$1.slice(0, -3);
		const mdPath = join(dir, name$1);
		const metaPath = join(dir, `${key}.meta.json`);
		let path = "";
		if (existsSync(metaPath)) try {
			const meta = JSON.parse(await readFile(metaPath, "utf8"));
			if (typeof meta.path === "string") path = meta.path;
		} catch (error) {
			console.error(`workspace-level-system: cannot parse ${metaPath}:`, error);
		}
		items.push({
			key,
			path,
			text: await readFile(mdPath, "utf8")
		});
	}
	return items.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

//#endregion
//#region src/gateway.ts
/** HTTP route prefix owning every workspace-level-system API request. */
const API_PREFIX = "/wls/api";
/**
* Body byte cap for the `set` route: the 1 MiB text limit plus JSON and
* path overhead. Larger raw bodies reject before parsing.
*/
const SET_BODY_LIMIT_BYTES = 2 * 1024 * 1024;
/** Body byte cap for the small `list` / `clear` routes. */
const SMALL_BODY_LIMIT_BYTES = 64 * 1024;
/** HTTP status for each StoreError code (validation 4xx, size 413). */
const STATUS_FOR_CODE = {
	"invalid-body": 400,
	"invalid-path": 400,
	"text-too-large": 413,
	"body-too-large": 413
};
/**
* Create the request handler (dependency-injected data directory, for tests).
* @param resolveDir - resolves the data directory to read and write.
* @returns the prefix-route handler.
*/
function createGatewayHandler(resolveDir) {
	return async (req, res) => {
		if ((req.method ?? "") !== "POST") {
			writeJson(res, 405, envelopeError("method-not-allowed", "POST only"));
			return;
		}
		const origin = req.headers.origin;
		if (typeof origin === "string" && origin !== "") {
			let originHost;
			try {
				originHost = new URL(origin).host;
			} catch {
				writeJson(res, 400, envelopeError("invalid-origin", "invalid Origin header"));
				return;
			}
			const reqHost = req.headers.host;
			if (typeof reqHost === "string" && originHost !== reqHost) {
				writeJson(res, 403, envelopeError("origin-not-allowed", "same-origin requests only"));
				return;
			}
		}
		if (!String(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
			writeJson(res, 415, envelopeError("content-type-not-supported", "application/json required"));
			return;
		}
		const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
		const method = pathname.startsWith(`${API_PREFIX}/`) ? pathname.slice(`${API_PREFIX}/`.length) : void 0;
		if (method === void 0 || method.includes("/")) {
			writeJson(res, 404, envelopeError("not-found", "unknown workspace-level-system API method"));
			return;
		}
		try {
			const body = await readJsonBody(req, method === "set" ? SET_BODY_LIMIT_BYTES : SMALL_BODY_LIMIT_BYTES);
			const dir = resolveDir();
			if (method === "list") writeJson(res, 200, envelopeOk({ items: await listPrompts(dir) }));
			else if (method === "set") writeJson(res, 200, envelopeOk(await handleSet(body, dir)));
			else if (method === "clear") writeJson(res, 200, envelopeOk(await handleClear(body, dir)));
			else writeJson(res, 404, envelopeError("not-found", `unknown workspace-level-system API method "${method}"`));
		} catch (error) {
			if (error instanceof StoreError) {
				writeJson(res, STATUS_FOR_CODE[error.code] ?? 500, envelopeError(error.code, error.message));
				return;
			}
			writeJson(res, 500, envelopeError("internal", error instanceof Error ? error.message : String(error)));
		}
	};
}
/** Handle the `set` method: validate body, canonicalize path, write or clear. */
async function handleSet(body, dir) {
	const { path, text } = extractPathAndText(body);
	if (path === void 0) throw new StoreError("invalid-body", "set expects { path: string, text?: string }");
	const canonical = await canonicalize(path);
	const key = keyOf(canonical);
	if (text === void 0 || text.trim() === "") {
		await withStoreWrite(dir, () => clearPrompt(dir, key));
		return { key };
	}
	const bytes = Buffer.byteLength(text, "utf8");
	if (bytes > WRITE_LIMIT_BYTES) throw new StoreError("text-too-large", `prompt text is ${bytes} bytes; the limit is ${WRITE_LIMIT_BYTES}`);
	await withStoreWrite(dir, () => writePrompt(dir, key, canonical, text));
	return { key };
}
/** Handle the `clear` method: validate body, canonicalize path, clear. */
async function handleClear(body, dir) {
	const { path } = extractPathAndText(body);
	if (path === void 0) throw new StoreError("invalid-body", "clear expects { path: string }");
	const key = keyOf(await canonicalize(path));
	await withStoreWrite(dir, () => clearPrompt(dir, key));
	return { key };
}
/** Canonicalize one workspace path through the workspace canon. */
async function canonicalize(path) {
	try {
		return await realpathNormalize(path);
	} catch (error) {
		throw new StoreError("invalid-path", `cannot canonicalize workspace path: ${error instanceof Error ? error.message : String(error)}`);
	}
}
/** Extract the string `path` / `text` fields from a parsed request body. */
function extractPathAndText(body) {
	if (typeof body !== "object" || body === null) return {};
	const record = body;
	const path = typeof record.path === "string" ? record.path : void 0;
	const text = typeof record.text === "string" ? record.text : void 0;
	return {
		...path !== void 0 ? { path } : {},
		...text !== void 0 ? { text } : {}
	};
}
/** Read and parse a JSON body from a node:http request. */
async function readJsonBody(req, maxBytes) {
	const chunks = [];
	let bytes = 0;
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		bytes += buffer.length;
		if (bytes > maxBytes) throw new StoreError("body-too-large", "request body too large");
		chunks.push(buffer);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return {};
	return JSON.parse(text);
}
/** Write a JSON response envelope. */
function writeJson(res, status, body) {
	const json = JSON.stringify(body);
	res.writeHead(status, { "content-type": "application/json" });
	res.end(json);
}
/** Build a success envelope. */
function envelopeOk(value) {
	return {
		ok: true,
		value
	};
}
/** Build an error envelope. */
function envelopeError(code, message) {
	return {
		ok: false,
		error: {
			code,
			message
		}
	};
}
/**
* Register the `/wls/api` HTTP route on the host's web server.
* @param ctx - host context carrying `webServer`.
*/
function registerWorkspaceSystemGateway(ctx) {
	ctx.effect(() => {
		const webServer = ctx.webServer;
		if (webServer === void 0 || typeof webServer.register !== "function") return () => {};
		return webServer.register({
			kind: "prefix",
			path: API_PREFIX,
			handler: createGatewayHandler(() => storeDir())
		});
	}, "workspace-level-system: /wls/api routes");
}

//#endregion
//#region src/index.ts
const name = "dsh-plugin-workspace-system";
/** Services the plugin consumes; the row loads once all are available. */
const inject = ["systemPrompt", "webServer"];
/** The registered prompt section's unique name. */
const SECTION_NAME = "workspace-level-system";
/**
* Section placement: inside the persona band (PERSONA_PREFIX = 0 comes
* first, PLAN_POLICY = 500 follows), after the deployment persona prefix so
* workspace guidance reads as persona-level context.
*/
const SECTION_ORDER = 100;
/**
* Resolve this section's contribution for one assembly.
*
* No agent scope (diagnostics assembly) or no session cwd ⇒ ''. The read
* itself is fail-soft: a missing store file is an empty prompt and any other
* read failure logs and contributes nothing.
* @param context - the assembly context (carries the agent when one drove it).
* @param dir - the data directory to read from.
* @returns the workspace's prompt text, or ''.
*/
function sectionTextFor(context, dir) {
	const cwd = context.agent?.session.header.cwd;
	if (cwd === void 0 || cwd === "") return "";
	const text = readPromptSync(dir, keyOf(cwd));
	return text.trim() === "" ? "" : text;
}
/**
* Plugin entry: register the prompt section and the HTTP gateway.
* @param ctx - the plugin's cordis context.
*/
function apply(ctx) {
	ctx.systemPrompt.section({
		name: SECTION_NAME,
		order: SECTION_ORDER,
		text: (context) => sectionTextFor(context, storeDir())
	});
	registerWorkspaceSystemGateway(ctx);
}

//#endregion
export { SECTION_NAME, SECTION_ORDER, apply, inject, name, sectionTextFor };