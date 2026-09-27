window.__ModuleLoader__.load({ id: "@huanlin/dsh-plugin-workspace-system", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let __deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
__deepseek_ai_dsh_client_ui_primitives = __toESM(__deepseek_ai_dsh_client_ui_primitives);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
	var t, f, n = "";
	if ("string" == typeof e || "number" == typeof e) n += e;
	else if ("object" == typeof e) if (Array.isArray(e)) {
		var o = e.length;
		for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
	} else for (f in e) e[f] && (n && (n += " "), n += f);
	return n;
}
function clsx() {
	for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
	return n;
}
var clsx_default = clsx;

//#endregion
//#region src/client/panel.css.ts
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
const css = {
	panel: "dsh-wls-panel",
	header: "dsh-wls-header",
	heading: "dsh-wls-heading",
	description: "dsh-wls-description",
	columns: "dsh-wls-columns",
	list: "dsh-wls-list",
	listGroup: "dsh-wls-list-group",
	listTitle: "dsh-wls-list-title",
	row: "dsh-wls-row",
	rowActive: "dsh-wls-row--active",
	rowTitle: "dsh-wls-row-title",
	badges: "dsh-wls-badges",
	badge: "dsh-wls-badge",
	badgeMuted: "dsh-wls-badge--muted",
	hint: "dsh-wls-hint",
	editor: "dsh-wls-editor",
	editorHead: "dsh-wls-editor-head",
	label: "dsh-wls-label",
	path: "dsh-wls-path",
	textarea: "dsh-wls-textarea",
	footer: "dsh-wls-footer",
	status: "dsh-wls-status",
	statusError: "dsh-wls-status--error",
	clear: "dsh-wls-clear",
	save: "dsh-wls-save"
};
/** `data-plugin-css` tag id of the injected stylesheet. */
const STYLE_TAG_ID = "@huanlin/dsh-plugin-workspace-system/panel.css";
/** The panel stylesheet (injected as one tagged `<style>` at activation). */
const CSS = `
.dsh-wls-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 20px 24px;
  box-sizing: border-box;
  gap: 12px;
}

.dsh-wls-header {
  flex: none;
}

.dsh-wls-heading {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.dsh-wls-description {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-columns {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  gap: 16px;
}

.dsh-wls-list {
  flex: 0 0 264px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3, transparent);
}

.dsh-wls-list-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-wls-list-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
  padding: 6px 8px 2px;
}

.dsh-wls-row {
  display: flex;
  align-items: center;
  gap: 8px;
  appearance: none;
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  background: transparent;
}

.dsh-wls-row:hover {
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
}

.dsh-wls-row--active {
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.18));
}

.dsh-wls-row-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-wls-badges {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.dsh-wls-badge {
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary, inherit);
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
}

.dsh-wls-badge--muted {
  opacity: 0.7;
}

.dsh-wls-hint {
  margin: 0;
  padding: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-editor {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
}

.dsh-wls-editor-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dsh-wls-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary, inherit);
}

.dsh-wls-path {
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
  word-break: break-all;
}

.dsh-wls-textarea {
  flex: 1 1 auto;
  min-height: 120px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  padding: 10px 12px;
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-layer-3, transparent);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  border-radius: 10px;
}

.dsh-wls-textarea:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary, #0a84ff);
}

.dsh-wls-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dsh-wls-footer {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.dsh-wls-status {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary, rgba(128, 128, 128, 0.7));
}

.dsh-wls-status--error {
  color: var(--dsw-alias-label-error, #ff453a);
}

.dsh-wls-clear,
.dsh-wls-save {
  appearance: none;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  padding: 5px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary, inherit);
  background: var(--dsw-alias-bg-module-platform, rgba(128, 128, 128, 0.12));
  transition: background 0.16s, opacity 0.16s;
}

.dsh-wls-save {
  background: var(--dsw-alias-brand-primary, #0a84ff);
  color: var(--dsw-alias-bg-layer-1, #fff);
}

.dsh-wls-clear:disabled,
.dsh-wls-save:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
`;
/**
* Install the panel stylesheet as one tagged `<style>` element.
* @returns the disposer removing the tag (idempotent outside a document).
*/
function installPanelStyles() {
	if (typeof document === "undefined") return () => {};
	if (document.querySelector(`style[data-plugin-css='${STYLE_TAG_ID}']`) !== null) return () => {};
	const style = document.createElement("style");
	style.dataset.plugin = "@huanlin/dsh-plugin-workspace-system";
	style.dataset.pluginCss = STYLE_TAG_ID;
	style.textContent = CSS;
	document.head.appendChild(style);
	return () => {
		style.remove();
	};
}

//#endregion
//#region src/client/panel.tsx
/** Final line segment of a path, for orphan rows without a title. */
function pathBasename(path) {
	return path.split(/[\\/]/).filter((segment) => segment !== "").at(-1) ?? path;
}
/**
* The panel's navigation-row icon (`sidebar.panellist` seat): the folder
* glyph at the row's current size.
* @param props - the panel-list seat props (size, active).
* @returns the icon element.
*/
function WorkspaceSystemPanelIcon({ size }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, { size });
}
/**
* Render the workspace-level-system panel.
* @param props - the locale seat, the global `useWorkspaces` hook, and the API.
* @returns the panel body.
*/
function WorkspaceSystemPanel(props) {
	const { t } = props;
	const api = props.api;
	const workspaces = props.useWorkspaces((snapshot) => snapshot.items);
	const [entries, setEntries] = (0, react.useState)(null);
	const [selectedPath, setSelectedPath] = (0, react.useState)(null);
	const [draft, setDraft] = (0, react.useState)("");
	const [saving, setSaving] = (0, react.useState)(false);
	const [status, setStatus] = (0, react.useState)({ kind: "idle" });
	(0, react.useEffect)(() => {
		let cancelled = false;
		api.list().then((items) => {
			if (!cancelled) setEntries(items);
		}).catch((error) => {
			if (cancelled) return;
			const message = error instanceof Error ? error.message : String(error);
			setEntries([]);
			setStatus({
				kind: "error",
				message
			});
		});
		return () => {
			cancelled = true;
		};
	}, [api]);
	const textByPath = new Map((entries ?? []).map((entry) => [entry.path, entry]));
	const registeredPaths = new Set(workspaces.map((workspace) => workspace.path));
	const orphans = (entries ?? []).filter((entry) => entry.path !== "" && !registeredPaths.has(entry.path));
	const effectiveSelected = selectedPath ?? workspaces[0]?.path ?? orphans[0]?.path ?? null;
	const selectedText = (effectiveSelected !== null ? textByPath.get(effectiveSelected) : void 0)?.text ?? "";
	const dirty = draft !== selectedText;
	(0, react.useEffect)(() => {
		if (selectedPath === null) setDraft(selectedText);
	}, [selectedPath, selectedText]);
	const select = (path) => {
		setSelectedPath(path);
		setDraft(textByPath.get(path)?.text ?? "");
		setStatus({ kind: "idle" });
	};
	const refresh = async () => {
		setEntries(await api.list());
	};
	const save = async () => {
		if (effectiveSelected === null || saving) return;
		setSaving(true);
		setStatus({ kind: "idle" });
		try {
			await api.set(effectiveSelected, draft);
			await refresh();
			setStatus({ kind: "saved" });
		} catch (error) {
			setStatus({
				kind: "error",
				message: error instanceof Error ? error.message : String(error)
			});
		} finally {
			setSaving(false);
		}
	};
	const clear = async () => {
		if (effectiveSelected === null || saving) return;
		setSaving(true);
		setStatus({ kind: "idle" });
		try {
			await api.clear(effectiveSelected);
			await refresh();
			setDraft("");
			setStatus({ kind: "cleared" });
		} catch (error) {
			setStatus({
				kind: "error",
				message: error instanceof Error ? error.message : String(error)
			});
		} finally {
			setSaving(false);
		}
	};
	const statusText = status.kind === "saved" ? t("saved") : status.kind === "cleared" ? t("cleared") : status.kind === "error" ? `${t("saveFailed")} ${status.message}` : null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: css.panel,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
			className: css.header,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
				className: css.heading,
				children: t("heading")
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: css.description,
				children: t("description")
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: css.columns,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				className: css.list,
				"aria-label": t("heading"),
				children: workspaces.length === 0 && orphans.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: css.hint,
					children: entries === null ? t("loading") : t("empty")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [workspaces.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.listGroup,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: css.listTitle,
						children: t("workspaceGroup")
					}), workspaces.map((workspace) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: clsx_default(css.row, effectiveSelected === workspace.path && css.rowActive),
						"aria-current": effectiveSelected === workspace.path ? "true" : void 0,
						onClick: () => {
							select(workspace.path);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.rowTitle,
							children: workspace.title || pathBasename(workspace.path)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.badges,
							children: (textByPath.get(workspace.path)?.text ?? "") !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: css.badge,
								children: t("configured")
							}) : null
						})]
					}, workspace.workspaceId))]
				}) : null, orphans.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.listGroup,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: css.listTitle,
						children: t("orphanGroup")
					}), orphans.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: clsx_default(css.row, effectiveSelected === entry.path && css.rowActive),
						"aria-current": effectiveSelected === entry.path ? "true" : void 0,
						onClick: () => {
							select(entry.path);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.rowTitle,
							children: pathBasename(entry.path)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.badges,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx_default(css.badge, css.badgeMuted),
								children: t("orphan")
							})
						})]
					}, entry.key))]
				}) : null] })
			}), effectiveSelected === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: css.hint,
				children: t("emptyEditor")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: css.editor,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.editorHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: css.label,
							htmlFor: "workspace-system-prompt",
							children: t("promptLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: css.path,
							children: [
								t("promptPath"),
								" ",
								effectiveSelected
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						id: "workspace-system-prompt",
						className: css.textarea,
						value: draft,
						placeholder: t("promptPlaceholder"),
						disabled: saving,
						onChange: (event) => {
							setDraft(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: css.hint,
						children: t("promptHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.footer,
						children: [
							statusText !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: clsx_default(css.status, status.kind === "error" && css.statusError),
								role: "status",
								children: statusText
							}) : null,
							dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx_default(css.badge, css.badgeMuted),
								children: t("unsaved")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: css.clear,
								disabled: saving || selectedText === "",
								onClick: () => {
									clear();
								},
								children: t("clear")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: css.save,
								disabled: saving || !dirty,
								onClick: () => {
									save();
								},
								children: t(saving ? "saving" : "save")
							})
						]
					})
				]
			})]
		})]
	});
}

//#endregion
//#region src/client/api.ts
/**
* Create the HTTP-backed API client.
* @param prefix - route prefix; defaults to the gateway's `/wls/api`.
* @returns the API surface used by the panel.
*/
function createHttpApi(prefix = "/wls/api") {
	const call = async (method, body) => {
		let response;
		try {
			response = await fetch(`${prefix}/${method}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
		} catch (error) {
			throw new Error(`workspace-level-system: ${method} unreachable`, { cause: error });
		}
		let parsed;
		try {
			parsed = await response.json();
		} catch (error) {
			throw new Error(`workspace-level-system: ${method} returned malformed JSON (HTTP ${response.status})`, { cause: error });
		}
		if (!response.ok || parsed.ok !== true || parsed.value === void 0) throw new Error(parsed.error?.message ?? `workspace-level-system: ${method} failed (HTTP ${response.status})`);
		return parsed.value;
	};
	return {
		list: async () => (await call("list", {})).items,
		set: (path, text) => call("set", {
			path,
			text
		}),
		clear: (path) => call("clear", { path })
	};
}

//#endregion
//#region src/client/locales.ts
/** English copy. */
const en = {
	panelTitle: "Workspace prompts",
	heading: "Workspace system prompts",
	description: "One instruction paragraph shared by every session whose working directory belongs to the workspace. Saved text is injected as a titled <system-reminder> before the first message of each NEW session; empty text injects nothing.",
	workspaceGroup: "Workspaces",
	orphanGroup: "Stored without a workspace",
	empty: "No workspaces yet. Register a workspace first, then edit its prompt here.",
	emptyEditor: "Select a workspace to edit its prompt.",
	loading: "Loading stored prompts…",
	promptLabel: "Prompt text",
	promptPath: "Stored under the workspace path:",
	promptPlaceholder: "Enter the system-prompt text injected for every session in this workspace…",
	promptHint: "Injected as a titled system-reminder right before the first user message of each new session. Edits apply to the NEXT session; clear or empty text removes it.",
	save: "Save",
	saving: "Saving…",
	saved: "Saved. Applied to the next new session.",
	clear: "Clear",
	cleared: "Cleared. No longer injected.",
	saveFailed: "Saving failed.",
	unsaved: "Unsaved",
	configured: "prompt set",
	orphan: "orphan"
};
/** Simplified Chinese copy. */
const zh = {
	panelTitle: "Workspace 提示词",
	heading: "Workspace 级提示词",
	description: "同一 workspace 下所有会话共享一段指令文本。保存后以带标题的 <system-reminder> 注入每个新会话的首条消息之前；文本为空则不注入。",
	workspaceGroup: "Workspaces",
	orphanGroup: "已存储但未对应 workspace",
	empty: "还没有 workspace。先注册一个 workspace，再在这里编辑它的提示词。",
	emptyEditor: "选择一个 workspace 来编辑它的提示词。",
	loading: "正在加载已存储的提示词…",
	promptLabel: "提示词文本",
	promptPath: "存储对应的 workspace 路径：",
	promptPlaceholder: "输入要为该 workspace 所有会话注入的 system 提示词文本…",
	promptHint: "以带标题的 system-reminder 注入每个新会话首条用户消息之前。编辑对下一个新会话生效；清空后不再注入。",
	save: "保存",
	saving: "保存中…",
	saved: "已保存，下一个新会话生效。",
	clear: "清空",
	cleared: "已清空，不再注入。",
	saveFailed: "保存失败。",
	unsaved: "未保存",
	configured: "已配置",
	orphan: "孤儿"
};

//#endregion
//#region src/client/index.ts
/** Dictionary namespace owned by this plugin. */
const NS = "panel.workspace-system";
/** The panel's identity: the `main` keyed slot key and the panellist row id. */
const PANEL_ID = "workspace-system";
/**
* Required services (cordis fiber inject): `slots` is the composition root
* and `locale` serves the panel copy. The panel's slot owners (ui-layout
* for `main`, ui-sidebar for `sidebar.panellist`) are awaited through
* `slots.inject`, never through this declaration.
*/
const inject = ["slots", "locale"];
/**
* Register the panel body and its sidebar navigation row, the locale
* dictionary, and the panel stylesheet.
* @param ctx - client root context.
*/
function apply(ctx) {
	const t = ctx.locale.bind(NS);
	ctx.effect(installPanelStyles, "workspace-system: panel styles");
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "workspace-system: dictionaries");
	ctx.slots.inject("main", () => ctx.slots.register({
		name: "main",
		key: PANEL_ID,
		locale: NS,
		inject: () => ({ api: createHttpApi() })
	}, WorkspaceSystemPanel));
	ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
		name: "sidebar.panellist",
		id: PANEL_ID,
		order: 40,
		locale: NS,
		label: () => t("panelTitle")
	}, WorkspaceSystemPanelIcon));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map