# 项目状态

最后更新：2026-07-12 08:17

## 当前状态

- Project Guardian 是一个本地 Codex 插件加 Node.js CLI，用于为 AI 辅助编程项目创建和维护可持续的项目记忆。
- 当前开发阶段已经把工具从模板助手强化为可复用的工作流守卫，具备配置、校验、安全扫描、统一验证、冲突提示、决策文件和测试。
- CLI 已经提供 package `bin` 入口，团队可以安装为 `guardian`；仍然保留旧的随项目提交脚本路径，方便把插件源码放在项目内的团队使用。
- 官方 Git 安装源已经确认为 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 工具已经包含 AI 适配层，支持通用/Codex 规则、Cursor 规则和 GitHub Copilot 指令文件。
- 适配器解析已经拆分到 `plugins/project-guardian/scripts/lib/adapters.js`，并扩展到 Codex、Cursor、Copilot、Windsurf、Cline、Continue、Claude Code、Gemini CLI 和 VS Code。
- CLI 现在默认生成中文项目记忆模板，也可以通过 `guardian init --language en` 生成英文模板。
- CLI 默认项目记忆路径已经集中到根目录 `memory/`，新项目运行 `guardian init` 会创建 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 和 `memory/HANDOVER.md`。
- MCP 已支持 `readOnly`、`allowedTools` 和 `PROJECT_GUARDIAN_MCP_READ_ONLY=1`，团队可以把 MCP 客户端限制为只读或指定工具集合。
- MCP 启动和工具调用已增加强校验：配置写错会拒绝启动，工具入参多传、类型错误或 query limit 越界会被拒绝。
- 决策复审机制已接入 CLI、verify 和 MCP：到期未完成复审会被拦截，完成复审后会在对应决策文件中标记正常和无需继续复审。
- 新增 `guardian brief` 和 MCP `guardian_brief`，可以在 AI 打开大型记忆文件前生成预算友好的读取计划、推荐文件和粗略 token 估算。
- AI 规则模板、Skill、VS Code tasks、README、CLI/CI、接入、规范、工作流和零基础教程已切换为"先 brief、再核心记忆、历史文件按需读取"的默认方式。
- `guardian brief` 已新增 `--mode auto|quick|deep|full`，输出升级触发条件，解决按需读取可能误判或被误解为硬限制的问题。
- 安全审计已修复 Run Web UI CSRF 防护、静态文件路径遍历、审计日志静默失败、MCP stdin 消息大小限制、UTF-8 截断安全、安全扫描 ReDoS 防护、guardian-cmd passthrough 参数校验、decisions.js 日期路径遍历和 config 路径安全校验。
- `explain/` 目录已从 `explaiw/` 重命名（拼写修正）。
- 新增 `CHANGELOG.md` 记录版本级变更。
- `.gitignore` 已补充 `*.log`、`*.tmp`、`*.swp`、`*.bak`、`.idea/`、`.vscode/settings.json` 等模式。
- `shared.js` 模块的 `readMaybe` 不再静默吞没非 ENOENT 错误；`unique()` 增加类型检查；`parseFlags` 支持 `--` 终止符。
- `knowledge.js` 的 `buildBrief` 兼容旧 `config.memory` 格式；`chunks` 验证参数防止无限循环；`estimateTokens` 区分 CJK 和非 CJK 字符；`shellQuoteText` 移除 shell 元字符。

## 已完成

- 创建了插件结构，包括 `.codex-plugin/plugin.json`、skill 元数据、模板、CLI 脚本、根目录 README、工作流文档、规范文档、接入文档和零基础教程。
- 实现了初始命令：`init`、`update`、`handover`、`check`、`doctor`、`validate-docs`、`query`、`install-hooks` 和 `install-ci`。
- 已经对本仓库运行自举初始化，并填入真实记忆内容，而不是保留空模板。
- 新增 `package.json` 和 `tests/` 下的 Node 测试套件，覆盖初始化、校验、check 失败、hooks、CI 生成、决策记录、安全扫描、查询和合并冲突提示。
- 新增 `guardian` / `project-guardian` package 二进制入口、`guardian --version`、可配置适配器生成。
- 新增 `explain/PROJECT_FILES_EXPLANATION.md`，集中说明当前所有文档、代码、配置、资源和测试文件的职责。
- 已将本仓库自举项目记忆从根目录和 `docs/` 迁移到 `memory/`，并同步默认配置、CLI、AI 规则、插件文档和测试。
- 新增 `guardian adapters doctor`，可以查看各 AI IDE 适配器是否已安装。
- 新增 Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 适配模板。
- 新增 `guardian mcp` stdio MCP server，支持 MCP 的 AI IDE 可以直接调用 query、update、decision、verify、doctor、scan-secrets、handover、conflicts 和 adapters doctor。
- 新增 MCP 工具权限控制，`doctor` 会校验错误的 MCP 配置。
- 新增 `guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`，并让 `guardian verify` 自动检测到期未完成的决策复审。
- 新增 `guardian query --limit` 和 MCP `guardian_query.limit`，用于控制查询返回片段数量。
- 新增 `guardian brief`、MCP `guardian_brief`、VS Code Brief task 和 `guardian:brief` package script。
- 新增 brief 三档升级机制：`quick`、`deep`、`full`。
- 新增 `Run/server.js` 和 `Run/public/*`，并通过 `npm run ui` 启动本地可视化界面。
- 新增 `plugins/project-guardian/scripts/lib/manual-memory.js` 和 `guardian append-memory`，让 Run 控制台与 CLI 共用同一套手动追加记忆模板。
- 新增 `Run/lib/commands.js`，把 Run 控制台的固定 CLI 命令目录从 `Run/server.js` 中拆出。
- 新增 `plugins/project-guardian/scripts/lib/config.js`、`doc-validation.js` 和 `knowledge.js`，从 `guardian.js` 中拆出。
- 新增 `plugins/project-guardian/scripts/lib/git-utils.js` 和 `security.js`，继续从 `guardian.js` 拆出 Git/diff/文件扫描与安全扫描逻辑。
- Run 控制台新增 `MCP 系统` 页面，通过 `/api/status` 展示 MCP 启动命令、协议版本、配置有效性、只读状态和工具启用/禁用状态。
- MCP 模块提供可复用的工具执行器，Run 控制台通过 `/api/mcp/call` 调用同一套 MCP 工具定义、权限过滤和参数校验。
- 新增 `plugins/project-guardian/scripts/lib/decisions.js`、`reviews.js` 和 `handover.js`，从 `guardian.js` 中拆出。
- 新增 `Run/lib/audit.js`，把 Run 服务端本地审计日志、hash 链完整性校验、敏感摘要脱敏和可选 `GUARDIAN_RUN_TOKEN` API 口令保护从 `Run/server.js` 中拆出。
- 新增 `guardian-cmd` package bin、受控命令目录和自动命令审计日志。
- 新增零依赖混合检索评分和根目录 `CONTRIBUTING.md`。
- 安全审计修复：Run Web UI CSRF 防护、静态文件路径遍历加固、审计日志失败不再静默、MCP stdin 行长度限制、UTF-8 安全截断、安全扫描 ReDoS 防护、guardian-cmd passthrough shell 元字符校验、decisions.js `--date` 路径遍历修复、config.js `memoryFiles` 路径安全校验、`--review-after` 日期格式校验。
- 新增 `CHANGELOG.md`，遵循 Keep a Changelog 格式。
- 新增 `plugins/project-guardian/scripts/lib/shared.js`，提取公共工具函数（`readMaybe`、`parseFlags`、`unique`、`ensureInitialized` 等），消除跨文件重复。
- `shared.js` 的 `readMaybe` 改为对非 ENOENT 错误输出 stderr 警告，不再完全静默。
- `shared.js` 的 `unique()` 增加类型检查，防止非字符串值导致 `.replace()` 崩溃。
- `shared.js` 的 `parseFlags` 支持 `--` 终止符和空 key 处理。
- `knowledge.js` 的 `buildBrief` 兼容 `config.memoryFiles` 为 undefined 的情况。
- `knowledge.js` 的 `chunks()` 验证 `size`/`overlap` 参数防止无限循环。
- `knowledge.js` 的 `estimateTokens` 区分 CJK 和非 CJK 字符，提高 token 预算估算精度。
- `knowledge.js` 的 `shellQuoteText` 移除 shell 元字符而不是简单转义。
- `security.js` 的 `scanSecretLine` 限制单行扫描长度和匹配结果数量。
- `security.js` 的 `getDecisionFiles` 增加路径遍历防护。
- Run server 增加安全响应头（`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`）。
- Run server 的 `isAuthorizedApiRequest` 支持 `?token=` 查询参数（修复文档与实现不一致）。
- `guardian-cmd.js` 的 `resolveNpmSpec` 增加 Windows `npm.cmd` PATH 搜索。
- 新增 12 个测试覆盖安全修复和质量改进。

## 进行中

- 暂无正在进行的未验证功能；安全审计和全面质量修复已完成本轮代码、文档、测试和记忆收尾。

## 下一步

1. 提交到 Gitee 前复查 `git status`，确认所有安全修复、测试、文档和记忆一起提交，且 `.project-guardian/` 与 `docs/ip/` 不被 Git 跟踪。
2. 后续根据真实 AI IDE 高频命令继续补充 `guardian-cmd` 白名单。
3. 如果团队需要企业级命令审计，应把 `.project-guardian/cmd-audit.jsonl` 和 Run 审计日志采集到集中日志或不可变存储，并补充登录鉴权、访问控制、HTTPS 和保留策略。
4. 考虑继续拆分 `guardian.js` 的 init/update/check/doctor/hooks/CI 命令编排到独立模块。
5. 考虑增加国际化消息机制，集中管理 CLI 输出语言。
6. 考虑增加并发写入测试和大文件性能测试。

## 已知问题

| 问题 | 影响 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 查询仍不是完整语义向量检索 | 表达差异特别大或长文本规模很大时仍可能搜不到最佳答案 | 维护者 | 已升级为零依赖混合检索；可选向量索引和 RAG 仍规划在后续迭代 |
| 决策记录会同时写入索引和单独决策文件 | 文档输出略多 | 维护者 | 这是为了兼容现有 `memory/DECISIONS.md`，同时降低未来协作冲突 |
| Gitee Go 语法可能因账号模板不同而变化 | 团队可能需要调整生成的流水线细节 | 仓库负责人 | CLI 保持工作流小而可配置 |
| 已有项目保留旧配置时仍会写旧路径 | 旧项目不会自动迁移到 `memory/` | 维护者 | 本次保持尊重显式配置；旧项目迁移时应同步更新 `project-guardian.config.json` |
| AI IDE 规则格式会变化 | 某些适配器模板未来可能失效 | 维护者 | 已新增 `adapters doctor` 帮助发现缺失文件；仍需定期复核官方规则格式 |
| MCP 不做身份认证或逐次审批 | 支持 MCP 的 IDE 仍能调用已开放的本地 Guardian 命令 | 维护者 | 已新增 `mcp.readOnly` 和 `mcp.allowedTools` 降低误调用风险；仍需依赖仓库权限、Git 权限和代码评审 |
| 记忆读取仍会消耗模型上下文 | 其它项目接入后，AI 读取规则、核心记忆和查询片段会增加少量 token | 维护者 | 使用 `guardian brief` / `guardian_brief` 先做读取计划，再用 `guardian_query.limit` 或 `guardian query --limit` 控制返回片段数 |
| 复审检测依赖标准字段 | 手工改坏 `复审时间` 或完成标记会导致漏检或误报 | 维护者 | 使用 `guardian decision add --review-after` 和 `guardian reviews complete` 生成标准内容 |
| `guardian-cmd` 只能覆盖白名单命令 | 没有替代项时 AI IDE 仍可能需要临时直跑 shell | 维护者 | 优先运行 `guardian-cmd list`；高频直跑命令应补进 `guardian-cmd.js` 并补测试 |
| `guardian.js` 仍未完全模块化 | init/update/check/doctor/query/hooks/CI 等命令编排仍在主文件中 | 维护者 | 后续可继续低风险拆分 |
| Run 审计日志 hash 链有 TOCTOU 竞态 | 并发请求可能同时读取相同 previousHash 导致链断裂 | 维护者 | 当前单用户本地使用风险低；企业场景需加文件锁或原子操作 |

## 风险区域

- `plugins/project-guardian/scripts/guardian.js` 和 `plugins/project-guardian/scripts/lib/*.js` 共同承接 CLI 行为，修改时需要重点测试命令入口、配置、文档校验、query/brief、MCP、hooks、CI、决策、复审、交接和扫描。
- `plugins/project-guardian/cmd/guardian-cmd.js` 只允许固定白名单命令；新增替代项时必须校验参数、禁止任意 shell、记录日志并补测试。
- Run 审计日志有本地 hash 链和可选 `GUARDIAN_RUN_TOKEN`，但仍然不是企业集中审计或不可变存储；如果离开 localhost 或多人共享，需要单独补登录鉴权、访问控制、HTTPS、集中采集和保留策略。
- 文档校验既要严格阻止空模板，又不能严格到让新团队难以逐步接入。
- 安全扫描必须隐藏敏感值，也要避免在普通文档中产生过多误报。
- hooks 和 CI 应保持追加式或明确生成，不能覆盖团队已有自动化。

## 最新 AI 协助变更

- 任务：完整 Bug 排查与修复（第二批）。
- 总结：在之前 8 个 Bug 修复基础上，继续深度排查发现 `knowledge.js` 的 `chunks` 函数计算了 `safeSize` 和 `safeOverlap` 但在循环中仍使用原始 `size` 和 `overlap` 参数，当 `size=0` 或 `overlap>=size` 时会导致无限循环或空分片。已修复为在循环中使用 `safeSize` 和 `safeOverlap`。
- 文件：`plugins/project-guardian/scripts/lib/knowledge.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 验证：已运行 `npm run lint`（全部通过）、`npm test`（84 个测试全部通过）。
- 后续：提交前运行 `guardian verify` 确认记忆质量检查通过。
