# Project Guardian Run 可视化层

`Run/` 是 Project Guardian 的可选可视化运行层。它和核心插件代码分开存放，但仍属于插件的一部分，方便后续继续扩展网页界面、桌面窗口或其它可视化入口。

## 当前能力

- 启动一个本地网页控制台。
- 左侧侧边栏选择功能，支持平滑展开和收起；首页只显示插件状态概览，不把所有功能挤在一个页面。
- `知识查询` 模块拥有独立输出记录，查询结果不会再混入通用命令输出。
- `命令操作` 模块集中展示 CLI 全量指令目录和通用命令输出记录；命令会按专用模块、只读检查、写入维护和终端服务分组；需要参数或确认词的命令会先打开弹窗，在弹窗里填写参数后再确定运行或取消。
- 查看当前项目根目录、Node 版本、CLI 是否可用。
- 查看核心记忆文件是否存在，并点击预览文件内容；预览会把常见 Markdown 标题、列表、代码块和表格渲染成文档样式。
- 在新项目中通过界面运行 `guardian init`，初始化语言和适配器范围由固定选项控制。
- 按预设模板手动追加一段新记忆到核心记忆文件，用户只填写任务、状态、验证、风险、下一步等关键字段；如果没有加载到专用模板，界面仍会保留“自定义完整记录”兜底模板；写入前必须输入确认词。
- 运行 `guardian brief` 和 `guardian query`，其中 `query` 输出留在知识查询模块。
- 通过受控入口查看和调用所有 CLI 指令：只读命令可直接运行，写入命令必须输入 `RUN_COMMAND`，`init`、`brief`、`query` 使用专用模块，`mcp` 提示到终端或 AI IDE 配置中运行。

当前版本仍然不开放任意 shell。可视化写入入口全部由后端固定参数构造，不接受用户输入任意命令。

## 写入确认

Run 控制台的写入能力必须手动确认：

| 操作 | 确认词 | 说明 |
| --- | --- | --- |
| 插件初始化 | `RUN_INIT` | 调用固定的 `guardian init --language ...` 参数，不覆盖已有记忆文件。 |
| 手动追加记忆 | `APPEND_MEMORY` | 只能追加到核心记忆文件白名单，不能指定任意路径；模板字段和 `guardian append-memory` 使用同一套规则。 |
| 命令操作里的写入类 CLI | `RUN_COMMAND` | 只允许固定命令目录里的写入命令，例如 `update`、`handover`、`decision add`、`install-hooks` 和 `install-ci`，不开放任意 shell。 |

手动追加记忆会做基础敏感词拦截。如果内容像是密码、密钥、token、API key、Authorization 或私钥，后端会拒绝写入。这个检查不能替代正式安全审查，提交前仍然要运行 `guardian verify`。

追加记忆模板包括：

| 目标记忆 | 推荐模板 | 适用情况 |
| --- | --- | --- |
| `PROJECT_CONTEXT` | 项目背景补充 | 补充业务范围、技术背景、运行约束或依赖说明。 |
| `STATE` | 记录当前进展 | 补充当前状态、已完成、已知问题、验证和下一步。 |
| `DECISIONS` | 补充决策摘要 | 快速记录决策摘要；重大决策仍推荐用 `guardian decision add`。 |
| `AI_CHANGELOG` | 记录 AI 协助变更 | 补充一次 AI 辅助修改的需求、总结、文件、验证和风险。 |
| `HANDOVER` | 补充交接说明 | 补充新人接手、发布或交接时必须知道的信息。 |
| 任意核心记忆 | 自定义完整记录 | 模板覆盖不到时保留自由文本入口。 |

如果目标项目在 `project-guardian.config.json` 里改过核心记忆文件路径，Run 会优先使用配置里的路径；没有配置时才回退到默认 `memory/` 目录。

## 启动方式

在项目根目录运行：

```bash
npm run ui
```

也可以直接运行：

```bash
node Run/server.js
```

指定端口或项目目录：

```bash
node Run/server.js --port 4358
node Run/server.js --cwd D:\your-project
```

启动后浏览器打开：

```text
http://127.0.0.1:4357
```

## 安全边界

- 默认只监听 `127.0.0.1`。
- 后端不使用 shell 拼接命令，只通过固定参数调用 Node.js 和 Project Guardian CLI。
- `/api/command` 只允许固定 CLI 命令目录；只读命令可直接运行，写入命令必须输入 `RUN_COMMAND`，专用模块命令和 `mcp` 不通过通用接口直接启动。
- `/api/memory` 只读取核心记忆文件白名单，不接受任意文件路径。
- `/api/init` 和 `/api/memory/append` 必须提供确认词。
- `brief` 和 `query` 限制问题长度，并限制返回片段数量为 1 到 10。
- 没有内置登录、鉴权或公网防护。不要直接把它暴露到公网。

如果确实需要让局域网访问，可以手动指定：

```bash
node Run/server.js --host 0.0.0.0
```

这种方式必须由团队自行加反向代理、登录认证、访问控制和日志审计。

## 故障排查

如果点击核心记忆文件时看到 `Method not allowed`，通常是浏览器加载了新版前端文件，但后台 `node Run/server.js` 仍然是旧进程。请在启动 Run 的终端里按 `Ctrl+C` 停止服务，然后重新运行 `npm run ui` 或 `node Run/server.js`。

## 目录结构

```text
Run/
  README.md
  server.js
  public/
    index.html
    styles.css
    app.js
```

- `server.js`：本地 HTTP server、静态文件服务、固定命令目录 API、记忆读取 API 和受控写入 API；追加记忆模板来自 `plugins/project-guardian/scripts/lib/manual-memory.js`。
- `public/index.html`：页面结构，包含可收起侧边栏、各功能页面、知识查询独立输出区和命令操作页面。
- `public/styles.css`：页面样式，包含侧边栏布局与收起动画、Markdown 文档预览、命令卡片和表格样式。
- `public/app.js`：浏览器端交互逻辑，包含功能页切换、侧边栏状态、记忆预览、轻量 Markdown 渲染、命令目录渲染和分区输出。

## 后续扩展方向

- 增加写入类命令前的 diff 预览和操作日志。
- 增加决策复审日历视图。
- 增加记忆文件折叠摘要、搜索和最近修改提示。
- 把当前 Web UI 包装成 Electron、Tauri 或 WebView 桌面窗口。
