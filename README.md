<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-workspace-system"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-workspace-system?lang=zh" alt="dsh-plugin-workspace-system card"></a>
</p>

# dsh-plugin-workspace-system

按 workspace 注入一段用户编辑的 system 提示词段落：同一 workspace（canonical cwd 相同）下的所有会话（含 subagent）共享这段文本，sidebar 面板内编辑，保存后下一轮模型请求即生效，无需重启。

> Injects a user-edited system-prompt section per workspace: every session (subagents included) whose working directory belongs to the workspace shares one paragraph, edited from a sidebar panel and effective on the next model request after save.

## 功能

- **workspace 级注入**：注册 `workspace-level-system` system prompt section（order 100，persona 区内）。provider 在每次请求组装时从会话 `header.cwd` 推导存储键并读取文本——空文本不贡献，目录缺失/读失败静默为空（fail-soft，不影响会话热路径）。
- **sidebar 面板**：注册官方 sidebar 全局面板（`main` keyed 槽 + `sidebar.panellist` 列表槽，id `workspace-system`、order 40）。面板左侧列出全部 workspace（有已存提示词的带徽标）与孤儿条目（workspace 已删但数据残留），右侧为选中 workspace 的 textarea + 保存/清空。
- **数据落盘**：`$DSH_HOME/workspace-level-system/`（即 `~/.dsh/workspace-level-system/`），每 workspace 两个文件：`<hash>.md`（原文）+ `<hash>.meta.json`（`{ "path": ... }` 供人工辨识）。host 侧自管，不进 settings.yaml。
- **写通道**：自托管 `/wls/api` HTTP 路由（POST only，JSON envelope），`set` 经 `realpathNormalize` 规范化路径后落盘（空文本即清除），拒绝 > 1 MiB 文本；同源校验。
- **大小护栏**：注入上限 256 KiB（超出截断并告警）；写入上限 1 MiB。

## 开发

### 仓库结构

```
src/
├── index.ts          # host 入口: name/inject/apply + section 注册 + gateway 接线
├── store.ts          # 存储层: dir/keyOf/读写清列 + mtime 缓存 + 写串行化 + 大小上限
├── gateway.ts        # POST /wls/api/{list,set,clear}: origin 校验 + JSON envelope
└── client/
    ├── index.ts      # client 入口: main 面板体 + sidebar.panellist 图标注册
    ├── panel.tsx     # 面板: workspace 列表 + textarea + Save/Clear
    ├── panel.css.ts  # <style data-plugin-css> 注入式样式
    ├── api.ts        # /wls/api fetch 客户端（envelope 解包）
    └── locales.ts    # zh/en 词典
tests/
├── store.test.ts     # hash 稳定、读写清列、meta 同步、大小上限、mtime 缓存、写串行化
├── section.test.ts   # provider 决策: 无 agent/无 cwd/无存储/空白→''，有内容→原文
├── gateway.test.ts   # 405/origin/content-type/404 校验 + set/clear/list 语义
└── panel.spec.tsx    # jsdom: 列表渲染、选择、编辑、save/clear、孤儿、空态/错误态
```

### 前置依赖

- Node.js >= 22、pnpm
- 本机 DSH 源码 checkout（tsconfig `paths` 指向 `D:/Projects/deepseek-harness/dsh` 的 `lib/types`，cohort `0.1.7-rc.x`；checkout 变更路径时同步改三个 tsconfig）

### 三件套

```sh
pnpm install --ignore-workspace --config.auto-install-peers=false   # 见下：junction
pnpm run typecheck   # tsc --noEmit (host + client)
pnpm test            # vitest run
pnpm run build       # tsdown 双 bundle (host ESM + client __ModuleLoader__ CJS) + tsc 类型产物
```

`pnpm install` 后需手工建立 vitest 运行时解析用的 junction（tsc 走 tsconfig paths 不需要）：

```powershell
$nm = ".\node_modules\@deepseek-ai"
New-Item -ItemType Junction -Force -Path "$nm\dsh-home-paths" -Target "D:\Projects\deepseek-harness\dsh\packages\util\home-paths" | Out-Null
New-Item -ItemType Junction -Force -Path "$nm\dsh-workspace"  -Target "D:\Projects\deepseek-harness\dsh\packages\workspace\workspace" | Out-Null
```

### 构建策略

**预构建 `lib/` 入库**（不含 `prepare` 脚本）。client 半部依赖 `@deepseek-ai/dsh-client-*` private peer deps，pnpm 在 git install 的 `prepare` 阶段会在临时目录拉不到这些包，所以 `lib/` 必须预构建并提交。改源码后需 `pnpm run build` + commit `lib/`。

## 运行

### 安装到 profile

```sh
# 本地开发（热更新）
dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-plugin-workspace-system"

# 从 GitHub 安装
dsh plugin --profile web add "github:huanlinoto/dsh-plugin-workspace-system"
```

安装后重启 `dsh web`，浏览器硬刷新（`Ctrl+Shift+R`）。sidebar 面板列表出现「Workspace 提示词」入口，点击进入编辑面板。

### 使用

1. 面板左侧选中一个 workspace，右侧 textarea 输入提示词（例如团队编码规范、领域术语表）。
2. 点「保存」——数据写入 `~/.dsh/workspace-level-system/<hash>.md`，该 workspace 下所有会话（含 subagent）下一轮请求的 system prompt 即包含此段（聊天顶部 SystemPromptRow 折叠行可见）。
3. 点「清空」或保存空文本——删除数据文件，不再注入。
4. 未注册 workspace 的目录（Ungrouped 会话）同样可用：其会话的 cwd 有独立存储键，只是不出现在面板列表里，可手工按 hash 建文件。

## 检查

```sh
pnpm run typecheck   # 类型门禁
pnpm test            # 单元 + 组件测试
pnpm run build       # 产物: lib/index.js, lib/client.js (+ types)
```

### 为何不发布 `./invariant`

本插件没有独立可分歧的观察：section 注册与 gateway 都是 cordis effect，随插件 fiber 自动 dispose；注入内容直接来自落盘文件（单一事实源，SystemPromptRow 与模型读到的是同一段组装产物）。按上游收紧的 invariant 规则，不发布 `./invariant` 子路径导出。

### 合规自检

- [x] 零源码 patch：未修改 DSH checkout 任何文件
- [x] B1: `package.json` 声明 `dsh.bundle.patch`
- [x] B2: 自带 `cordis.patch.yml`（insert 行 id/name；无部署可变配置，故无 config 块）
- [x] B3: patch 行 `name` 用包名
- [x] F1: `files` 含 `lib/` + `cordis.patch.yml`
- [x] F2: `peerDependencies` 含 cordis + 用到的 `@deepseek-ai/*`（全部 optional）
- [x] F3: typecheck/test/build 三 script 齐全
- [x] A6: 不导出 default
- [x] G: Unit（store/section/gateway）+ Component（panel.spec）测试分层
- [x] UI: `main` keyed 槽位 + `sidebar.panellist` list 槽位
- [x] 预构建策略：`lib/` 不在 `.gitignore`，无 `prepare` 脚本

## License

AGPL-3.0
