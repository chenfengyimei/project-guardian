# Project Guardian Run 可视化层

`Run/` 是 Project Guardian 的可选可视化运行层。它和核心插件代码分开存放，但仍属于插件的一部分，方便后续继续扩展网页界面、桌面窗口或其它可视化入口。

## 当前能力

- 启动一个本地网页控制台。
- 查看当前项目根目录、Node 版本、CLI 是否可用。
- 查看核心记忆文件是否存在，并点击预览文件内容。
- 在新项目中通过界面运行 `guardian init`，初始化语言和适配器范围由固定选项控制。
- 手动追加一段新记忆到核心记忆文件，写入前必须输入确认词。
- 运行 `guardian brief` 和 `guardian query`。
- 运行只读白名单命令：`doctor`、`verify`、`validate-docs`、`reviews`、`reviews due`、`scan-secrets`、`adapters doctor`。

当前版本仍然不开放任意 shell，也不提供 `update`、`handover`、`decision add` 等复杂写入命令。可视化写入只包含两个受控入口：初始化和手动追加记忆。

## 写入确认

Run 控制台的写入能力必须手动确认：

| 操作 | 确认词 | 说明 |
| --- | --- | --- |
| 插件初始化 | `RUN_INIT` | 调用固定的 `guardian init --language ...` 参数，不覆盖已有记忆文件。 |
| 手动追加记忆 | `APPEND_MEMORY` | 只能追加到核心记忆文件白名单，不能指定任意路径。 |

手动追加记忆会做基础敏感词拦截。如果内容像是密码、密钥、token、API key、Authorization 或私钥，后端会拒绝写入。这个检查不能替代正式安全审查，提交前仍然要运行 `guardian verify`。

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
- `/api/command` 只允许只读命令白名单。
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

- `server.js`：本地 HTTP server、静态文件服务、只读命令 API、记忆读取 API 和受控写入 API。
- `public/index.html`：页面结构。
- `public/styles.css`：页面样式。
- `public/app.js`：浏览器端交互逻辑。

## 后续扩展方向

- 增加写入类命令前的 diff 预览和操作日志。
- 增加决策复审日历视图。
- 增加记忆文件折叠摘要、搜索和最近修改提示。
- 把当前 Web UI 包装成 Electron、Tauri 或 WebView 桌面窗口。
