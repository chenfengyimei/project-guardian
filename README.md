<div align="center">

# Project Guardian

**给 AI 编程团队装上"记忆"——让项目背景、技术决策和开发状态固化在代码仓库里，不再只留在一个人聊天窗口里。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-project--guardian-red.svg)](https://www.npmjs.com/package/project-guardian)
[![Tests](https://img.shields.io/badge/Tests-109%20passed-brightgreen.svg)](#测试覆盖率)
[![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen.svg)](#项目状态)

</div>

---

## 这是什么？

Project Guardian 是一个**本地项目记忆守护插件**，专为 AI 辅助编程团队设计。

当 AI 编程助手（Codex、Claude Code、Cursor、Copilot 等）参与项目开发时，历史对话、修改原因和技术决策往往只留在某个人的聊天窗口里——人员一流动，知识就断了。Project Guardian 解决这个问题：它在代码仓库里维护结构化的 Markdown 记忆文件，通过 CLI、MCP 或本地 Web UI 完成**初始化、更新、校验、查询和交接**的完整闭环，让任何 AI Agent 和新人都能快速获取项目上下文。

**目标**：在不改变现有开发流程的前提下，让项目记忆可追溯、可校验、可交接，把"上下文只留在一个人脑子里"的痛点彻底消除。

---

## 为什么它不一样？

市面上不缺文档工具，但 Project Guardian 有几个独特的设计决策：

### 🧠 零依赖本地混合检索

不是一个简单的全文搜索。Project Guardian 的 `guardian query` 结合多种检索策略：

| 检索策略 | 作用 |
|----------|------|
| **关键词匹配** | 标准记忆文件中的精确文本命中 |
| **同义词扩展** | 中英文常见同义词自动扩展，如"登录"↔"login" |
| **n-gram 相似度** | 模糊匹配拼写变体和近似表述 |
| **源码补充** | 记忆未命中时从项目源码文件中提取证据 |
| **Git 历史** | 从变更历史中补充上下文 |
| **来源多样性** | 优先提供不同来源的结果，减少同一文件占满返回 |

不依赖外部模型 API、向量库或数据库，纯本地 Node.js 运行，零安装依赖。

### 🎯 Token 预算感知的分层读取

不是把所有记忆文件塞给模型。Project Guardian 用 `guardian brief` 给出精准读取计划：

- `quick`：只读项目长期上下文和当前状态，适合低风险日常小任务
- `deep`：额外读取决策和 AI 变更日志，适合 bug 修复、回归、重构
- `full`：读取全部核心记忆，适合新人接手、交接、审计、大范围重构

`brief` 会估算 token 预算并推荐优先读取的文件，AI 按需读取而非全量加载。`query --limit 3` 进一步控制返回片段数量。

### 🔒 安全策略贯穿全链路

不只是"写完再检查"。Project Guardian 在多个环节强制执行安全策略：

- **密钥扫描**：`scan-secrets` 检测 5 种密钥模式（API Key / 密码 / 私钥 / 连接字符串 / Bearer Token），支持中文关键词（密码/密钥/令牌/私钥）
- **写入拦截**：`update`、`decision add`、`reviews complete` 在写入前检查疑似密钥，阻止敏感数据进入记忆文件
- **审计日志脱敏**：`guardian-cmd` 审计日志自动识别 `--token=value` 和 `--token value` 格式的敏感参数并隐藏值
- **MCP 权限控制**：`readOnly` 模式隐藏写入工具，`allowedTools` 白名单限制可用工具
- **Run API 安全**：Bearer Token 认证、loopback 绑定、CORS 拦截、路径遍历防护

### 📊 可校验的记忆完整性

不是写了就不管了。Project Guardian 提供完整的校验链：

```bash
guardian verify
```

`verify` 一次性运行 `doctor` → `check` → `validate-docs` → `reviews` → `scan-secrets`，覆盖配置健康、代码变更与记忆同步、文档填充质量、决策复审到期和密钥泄漏。`repair-memory` 可确定性修复记忆顺序和决策索引漂移。

### 🔄 Agent 无关 — 任何工具都能用

不绑定特定 AI Agent 的私有协议。三种接入方式覆盖所有场景：

| 方式 | 适用场景 | 示例 |
|------|----------|------|
| **CLI** | 最简单，直接调命令 | `guardian brief "修复登录bug"` |
| **MCP** | 支持 MCP 的 AI IDE，stdio 直连 | `guardian mcp` |
| **Web UI** | 可视化操作，浏览器界面 | `npm run ui` → `http://127.0.0.1:4357` |

---

## 功能成熟度矩阵

| 功能 | 状态 | 说明 |
|------|------|------|
| 项目记忆初始化 | ✅ Stable | 中英文双语模板，支持 `--language` 和 `--adapter` |
| CLI 命令行 | ✅ Stable | 20+ 命令，统一契约校验，`--key=value` 支持，`commands --json` 机器可读 |
| 记忆更新与结构化记录 | ✅ Stable | `update` 支持 summary/reason/verification/risks/sensitive-data/next-step 一次性写入 |
| 分层读取计划（brief） | ✅ Stable | quick/deep/full 三档，token 预算估算 |
| 零依赖混合检索（query） | ✅ Stable | 关键词 + 同义词 + n-gram，源码补充，来源多样性 |
| 记忆完整性修复 | ✅ Stable | `repair-memory` 排序变更日志 + 重建决策索引，dry-run 支持 |
| 记忆迁移 | ✅ Stable | `migrate-memory` 预览 + 安全移动，目标冲突拒绝覆盖 |
| 决策记录与复审 | ✅ Stable | `decision add` 结构化决策，`reviews due` 到期复审提醒 |
| 交接文档生成 | ✅ Stable | `handover` 自动生成新人交接文档 |
| 提交前检查 | ✅ Stable | `check` 拦截"代码变更但记忆未更新"的提交 |
| 文档质量校验 | ✅ Stable | `validate-docs` 检测 TODO 残留、空字段、乱序历史 |
| 密钥扫描 | ✅ Stable | 5 种模式 + 中文关键词，写入前拦截 |
| 安全策略出口强制 | ✅ Stable | CLI/MCP/Web UI 三条路径全部强制安全策略 |
| MCP 工具服务 | ✅ Stable | 14 个工具，readOnly 模式，allowedTools 白名单，参数校验 |
| 受控命令层 | ✅ Stable | `guardian-cmd` 白名单命令 + JSONL 审计日志 + 脱敏 |
| AI IDE 适配器 | ✅ Stable | Cursor/VS Code/Copilot/Windsurf/Cline/Continue/Claude/Gemini |
| 可视化 Web UI | ✅ Stable | 本地 HTTP 服务，侧边栏导航，Markdown 渲染，命令操作 |
| 统一质量入口 | ✅ Stable | `verify` 一次运行全部检查 |
| Gitee Go CI 集成 | ✅ Stable | `install-ci` 生成流水线模板 |
| Pre-commit Hook | ✅ Stable | `install-hooks` 自动安装 Git 钩子 |
| 配置安全 | ✅ Stable | 原型污染防护，路径校验，畸形配置归一化 |

**图例**：✅ Stable = 已实现且有测试覆盖

---

## 技术栈

| 区域 | 技术选型 |
|------|----------|
| 主语言 | JavaScript (Node.js ≥ 18) |
| 依赖 | 零运行时依赖，纯 Node.js 标准库 |
| 存储 | Markdown 文件 + JSONL 审计日志 |
| 检索 | 本地混合检索（关键词 + 同义词 + n-gram） |
| MCP | stdio JSON-RPC 2.0 |
| Web UI | 原生 HTTP server + 静态文件 |
| 测试 | Node.js 内置 `node --test` — 109 测试通过 |
| CI/CD | Gitee Go 流水线模板 |
| 许可证 | MIT |

---

## 项目结构

```text
project-guardian/
├── package.json              # npm 包定义、CLI bin、scripts
├── LICENSE                   # MIT 许可证
├── CHANGELOG.md              # 变更日志
├── CONTRIBUTING.md           # 贡献指南
├── README.md                 # 项目入口文档
├── AGENTS.md                 # 通用 AI Agent 规则
├── 零基础超简单入门.md         # 小白教程
│
├── plugins/project-guardian/
│   ├── .codex-plugin/
│   │   └── plugin.json       # Codex 插件元数据
│   ├── assets/
│   │   ├── icon.svg           # 插件图标
│   │   └── templates/         # 标准记忆文件模板
│   │       ├── *.md           # 英文模板
│   │       ├── zh-CN/*.md     # 中文模板（默认）
│   │       ├── cursor-rules.mdc
│   │       ├── vscode-tasks.json
│   │       └── gitee-go-project-guardian.yml
│   ├── scripts/
│   │   ├── guardian.js        # CLI 入口
│   │   └── lib/               # 按职责拆分的 CLI 模块
│   │       ├── init.js        # 初始化
│   │       ├── config.js      # 配置管理
│   │       ├── check.js       # 提交前检查
│   │       ├── update.js      # 记忆更新
│   │       ├── brief.js       # 读取计划
│   │       ├── knowledge.js   # 知识检索
│   │       ├── decisions.js   # 决策记录
│   │       ├── reviews.js     # 复审管理
│   │       ├── handover.js    # 交接文档
│   │       ├── mcp.js         # MCP 工具服务
│   │       ├── security.js    # 密钥扫描
│   │       ├── shared.js      # 公共工具
│   │       ├── validators.js  # 校验器
│   │       ├── doc-validation.js  # 文档校验
│   │       ├── git-utils.js   # Git 工具
│   │       ├── hooks-ci.js    # Hook 与 CI
│   │       ├── adapters.js    # AI IDE 适配器
│   │       ├── manual-memory.js   # 手动追加记忆
│   │       ├── memory-repair.js   # 记忆修复
│   │       ├── migrate.js     # 记忆迁移
│   │       ├── messages.js    # 国际化消息
│   │       └── cli-catalog.js # 命令目录
│   ├── cmd/
│   │   └── guardian-cmd.js    # 受控命令替代层
│   ├── docs/
│   │   ├── INTEGRATION.md     # 接入文档
│   │   ├── WORKFLOW.md        # 工作流文档
│   │   ├── STANDARD.md        # 规范文档
│   │   └── CLI_AND_CI.md      # CI 与命令行
│   └── skills/
│       └── project-guardian/
│           └── SKILL.md      # Codex 技能规则
│
└── Run/                       # 可选可视化运行层
    ├── server.js              # 本地 HTTP server
    ├── lib/
    │   ├── audit.js           # 审计日志
    │   ├── commands.js        # 命令目录
    │   └── guardian-bridge.js # 核心插件桥接
    └── public/
        ├── index.html         # 页面结构
        ├── styles.css         # 页面样式
        └── app.js             # 浏览器交互
```

**架构分层清晰**：`scripts/lib/` 为核心 CLI 模块层；`cmd/` 为受控命令层；`Run/` 为可选可视化层，通过 `guardian-bridge.js` 与核心层解耦。无循环依赖。

---

## 快速开始

### 安装

```bash
# 从 npm 安装（推荐）
npm install -g project-guardian

# 从 GitHub 安装
npm install -g git+https://github.com/chenfengyimei/project-guardian.git

# 验证
guardian --version
guardian doctor
```

> 📖 详细安装步骤见 [小白零基础傻瓜式使用教程](https://github.com/chenfengyimei/project-guardian/blob/master/零基础超简单入门.md)。

### 30 秒上手

```bash
# 初始化项目记忆文件（默认中文模板）
guardian init

# 判断本轮任务应该读哪些记忆文件，并估算 token
guardian brief "修复登录验证码校验失败"

# 记录一次 AI 辅助开发
guardian update "修复登录验证码校验失败"

# 提交前检查代码变更是否包含记忆更新
guardian check

# 一次运行全部质量检查
guardian verify

# 新人接手先生成交接文档
guardian handover

# 多轮项目知识查询
guardian query "登录流程" --limit 3
```

### Web UI

```bash
npm run ui
# 或
node Run/server.js

# 浏览器访问 http://127.0.0.1:4357
# 可选：设置环境变量 GUARDIAN_RUN_TOKEN 启用 API 认证
```

---

## CLI 命令参考

| 命令 | 功能 |
|------|------|
| `init` | 初始化项目记忆文件和 AI IDE 适配规则 |
| `doctor` | 检查项目是否正确接入 |
| `brief` | 生成任务相关的记忆读取计划和 token 预算 |
| `update` | 记录一次 AI 辅助开发的完整变更记录 |
| `query` | 多轮项目知识查询（支持 `--limit`） |
| `check` | 提交前检查代码变更是否包含记忆更新 |
| `verify` | 一次运行全部质量检查（doctor + check + validate-docs + reviews + scan-secrets） |
| `validate-docs` | 检查记忆文档是否还有过多 TODO 或空字段 |
| `scan-secrets` | 扫描记忆文件中的疑似密钥 |
| `handover` | 生成或刷新新人交接文档 |
| `decision add` | 记录一条结构化决策 |
| `reviews` | 查看决策复审状态；`reviews due` 查看到期复审 |
| `reviews complete` | 完成决策复审 |
| `conflicts` | 查看 Git 冲突，尤其是记忆文件冲突 |
| `append-memory` | 按模板手动追加一条记忆 |
| `repair-memory` | 修复记忆顺序与决策索引（支持 `--write`） |
| `migrate-memory` | 安全迁移旧版记忆路径（支持 `--dry-run`） |
| `install-hooks` | 安装 pre-commit hook |
| `install-ci` | 安装 Gitee Go 流水线模板 |
| `adapters doctor` | 检查 AI IDE 适配状态 |
| `install-adapters` | 安装 AI IDE 适配规则文件 |
| `mcp` | 启动 MCP server，给支持 MCP 的 AI IDE 调用 |
| `commands` | 查看命令目录（支持 `--json`） |
| `version` | 查看版本信息 |

**全局选项**：`--help` / `--json` / `--language` / `--adapter` / `--mode` / `--dry-run` / `--limit`

---

## MCP 工具调用

支持 MCP 的 AI IDE 可以通过 stdio 直接调用 Project Guardian 的 14 个工具：

```bash
guardian mcp
```

常见 MCP 配置示例：

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "guardian",
      "args": ["mcp"]
    }
  }
}
```

| MCP 工具 | 功能 |
|----------|------|
| `guardian_brief` | 生成任务相关的记忆读取计划 |
| `guardian_query` | 查询项目知识（支持 `limit`） |
| `guardian_update` | 一次性写入完整变更记录 |
| `guardian_decision_add` | 记录结构化决策 |
| `guardian_verify` | 运行全部质量检查 |
| `guardian_doctor` | 检查项目接入状态 |
| `guardian_scan_secrets` | 扫描疑似密钥 |
| `guardian_handover` | 生成交接文档 |
| `guardian_conflicts` | 查看记忆文件冲突 |
| `guardian_adapters_doctor` | 检查 AI IDE 适配状态 |
| `guardian_reviews_due` | 查看到期决策复审 |
| `guardian_review_complete` | 完成决策复审 |
| `guardian_memory_health` | 只读检查记忆完整性 |
| `guardian_memory_repair` | 执行确定性记忆修复 |

权限控制：

```json
{
  "mcp": {
    "readOnly": true,
    "allowedTools": ["guardian_brief", "guardian_query", "guardian_verify", "guardian_doctor"]
  }
}
```

---

## AI IDE 支持矩阵

| 工具 | 支持方式 | 生成文件 |
|------|----------|----------|
| 任意 IDE 终端 | CLI | 无额外文件 |
| 支持 MCP 的 AI IDE | stdio MCP | 无额外文件 |
| Codex | 插件元数据 + AGENTS | `.codex-plugin/plugin.json`、`AGENTS.md`、`SKILL.md` |
| Cursor | Project Rules | `.cursor/rules/project-guardian.mdc`、`.cursorrules` |
| VS Code | Tasks + Copilot instructions | `.vscode/tasks.json`、`.github/copilot-instructions.md` |
| GitHub Copilot | Repository instructions | `.github/copilot-instructions.md` |
| Windsurf | AGENTS + workspace rule | `AGENTS.md`、`.windsurf/rules/project-guardian.md` |
| Cline | Project rules | `.clinerules/project-guardian.md` |
| Continue | Repository rules | `.continue/rules/project-guardian.md` |
| Claude Code | Project memory file | `CLAUDE.md` |
| Gemini CLI | Project context file | `GEMINI.md` |

检查适配状态：

```bash
guardian adapters doctor
```

---

## 测试覆盖率

| 类别 | 数量 | 说明 |
|------|------|------|
| 单元 + 集成测试 | 109 通过 | 覆盖全部模块 |
| 安全测试 | 15+ | 密钥扫描、路径遍历、CORS、prototype 污染、CRLF |
| MCP 工具测试 | 10+ | 14 个工具全覆盖，含权限控制和参数校验 |
| 适配器测试 | 5+ | 多 IDE 适配器生成与保留 |
| 记忆完整性测试 | 10+ | 修复、迁移、决策索引、变更日志排序 |
| **总计** | **109** | 全部通过 |

```bash
npm test
```

---

## 文档导航

| 文档 | 说明 |
|------|------|
| [小白零基础傻瓜式使用教程](https://github.com/chenfengyimei/project-guardian/blob/master/零基础超简单入门.md) | 从 0 开始的完整使用教程 |
| [接入文档](https://github.com/chenfengyimei/project-guardian/blob/master/plugins/project-guardian/docs/INTEGRATION.md) | 如何把插件接入新项目或已有项目 |
| [工作流文档](https://github.com/chenfengyimei/project-guardian/blob/master/plugins/project-guardian/docs/WORKFLOW.md) | 记录、交接、新人接手的完整工作流 |
| [规范文档](https://github.com/chenfengyimei/project-guardian/blob/master/plugins/project-guardian/docs/STANDARD.md) | 团队使用规范、目录标准和记录标准 |
| [CI 与命令行](https://github.com/chenfengyimei/project-guardian/blob/master/plugins/project-guardian/docs/CLI_AND_CI.md) | 命令行、Git Hook 和 Gitee CI 操作说明 |
| [变更日志](https://github.com/chenfengyimei/project-guardian/blob/master/CHANGELOG.md) | 版本历史 |
| [贡献指南](https://github.com/chenfengyimei/project-guardian/blob/master/CONTRIBUTING.md) | 如何参与开发 |
| [npm 包页面](https://www.npmjs.com/package/project-guardian) | npm 发布页面 |

---

## 项目状态

Project Guardian 当前版本 **v0.5.x**，核心功能稳定，已在实际项目中使用。

**已完成**：

- v0.1-v0.3：核心记忆文件、CLI 命令、混合检索、MCP 工具、AI IDE 适配器、Web UI
- v0.4：记忆修复、结构化 update 记录、配置安全加固、知识检索增强
- v0.5：CLI 契约校验、命令目录、迁移预览、安全预检、模块拆分、i18n 消息系统

**后续方向**：

- 查询能力持续增强：同义词扩展、分片排序、摘要缓存
- 可选向量索引（保持零依赖默认路径）
- 更多 AI IDE 适配器
- 团队协作场景支持

---

## 许可证

[MIT License](LICENSE) — Copyright (c) 2026 Project Guardian Maintainers

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

[报告问题](https://github.com/chenfengyimei/project-guardian/issues) · [发起讨论](https://github.com/chenfengyimei/project-guardian/issues) · [查看文档](https://github.com/chenfengyimei/project-guardian#文档导航)

> 📌 本项目同时在 [GitHub](https://github.com/chenfengyimei/project-guardian) 和 [Gitee](https://gitee.com/chenfengloveyuri/project-guardian) 开源，npm 包地址 [npmjs.com/package/project-guardian](https://www.npmjs.com/package/project-guardian)，欢迎在任一平台 Star / 提 Issue / 提 PR。

</div>
