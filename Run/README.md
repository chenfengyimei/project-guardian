# Project Guardian Run 可视化层

`Run/` 是 Project Guardian 的可选可视化运行层。它和核心插件代码分开存放，但仍属于插件的一部分，方便后续继续扩展网页界面、桌面窗口或其它可视化入口。

## 当前能力

- 启动一个本地网页控制台。
- 查看当前项目根目录、Node 版本、CLI 是否可用。
- 查看核心记忆文件是否存在。
- 运行 `guardian brief` 和 `guardian query`。
- 运行只读白名单命令：`doctor`、`verify`、`validate-docs`、`reviews`、`reviews due`、`scan-secrets`、`adapters doctor`。

当前版本默认不提供 `update`、`handover`、`decision add` 等写入能力，避免网页误操作改写项目记忆。后续如果要增加写入功能，应先设计权限确认、操作预览和审计记录。

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
- `brief` 和 `query` 限制问题长度，并限制返回片段数量为 1 到 10。
- 没有内置登录、鉴权或公网防护。不要直接把它暴露到公网。

如果确实需要让局域网访问，可以手动指定：

```bash
node Run/server.js --host 0.0.0.0
```

这种方式必须由团队自行加反向代理、登录认证、访问控制和日志审计。

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

- `server.js`：本地 HTTP server 和只读 API。
- `public/index.html`：页面结构。
- `public/styles.css`：页面样式。
- `public/app.js`：浏览器端交互逻辑。

## 后续扩展方向

- 增加写入类命令前的确认弹窗、diff 预览和操作日志。
- 增加决策复审日历视图。
- 增加记忆文件只读预览和折叠摘要。
- 把当前 Web UI 包装成 Electron、Tauri 或 WebView 桌面窗口。
