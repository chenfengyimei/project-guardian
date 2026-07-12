# AI 变更日志

本文件记录应在聊天会话之外长期保留的 AI 协助开发上下文。

## 2026 记录

### 2026-07-12 08:17 - 修复 chunks 函数未使用安全参数的 Bug

- 用户需求：查看项目是否还有更多 Bug。
- AI 总结：在之前 8 个 Bug 修复基础上继续深度排查，发现 `plugins/project-guardian/scripts/lib/knowledge.js` 的 `chunks` 函数在第 212-213 行计算了 `safeSize` 和 `safeOverlap` 防护值，但第 216-217 行的循环和切片仍使用原始 `size` 和 `overlap` 参数。当 `size=0` 或 `overlap>=size` 时，`size - overlap` 可能为零或负数，导致无限循环或空分片。已修复为在循环条件和切片中使用 `safeSize` 和 `safeOverlap`。
- 变更文件：`plugins/project-guardian/scripts/lib/knowledge.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：`chunks` 是 query 和 brief 的核心分片函数，如果传入异常参数会导致 CLI 挂起或返回空结果。
- 技术说明：`safeSize = Math.max(1, size || 800)` 确保最小为 1，`safeOverlap = Math.min(Math.max(0, overlap || 0), safeSize - 1)` 确保步长 `safeSize - safeOverlap >= 1`。
- 验证方式：已运行 `npm run lint`（全部通过）、`npm test`（84 个测试全部通过）。
- 风险：修复仅影响异常参数路径，正常调用参数（size=700-1200, overlap=120-200）不受影响。
- 敏感信息检查：本次没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据。
- 下一步：提交前运行 `guardian verify` 确认记忆质量检查通过。

### 2026-07-12 08:01 - 完整 Bug 排查与修复（8 项）

- 用户需求：完完整整排查项目中是否有 Bug，逐步修复完善项目，并遵循项目自身 AGENTS.md 规则进行自举记忆更新。
- AI 总结：通过逐文件代码审查（guardian.js 1 lib 模块、guardian-cmd.js、Run server.js/audit.js/commands.js、前端 app.js/styles.css/index.html 和测试文件），在 lint  72 个测试全部通过的前提下发现并修复了 8 个 Bug 1) app.js renderReviewList 空列表显示乱码 `?????????`，修复为 `暂无复审记录` 2) server.js readReviewFilePayload 使用 `/\\\\/g` 匹配双反斜杠导致 Windows 单反斜杠路径无法归一化，修复 `/\\/g` 3) server.js appendLimitedTo mcp.js appendLimited 使用 `String.slice(0, byteLimit)` 按字符截断可能破坏多字节 UTF-8，修复为使用 `Buffer.from(next, "utf8").subarray(0, limit).toString("utf8")` 实现字节安全截断 4) app.js isTableSeparator 要求 3+ 连字符，标准 Markdown 允许 1+，修复为 `-{1,}` 5) mcp.js McpServer.start() 未监听 readline close 事件导致客户端断开后服务器可能挂起，添加 `rl.on("close", () => this.shutdown())` 6) knowledge.js shellQuoteText 仅转义双引号，`$`/反引号等可能导致命令注入，改为单引号包裹并转义内部单引号，同时修复了 formatBrief 中的双重引号包裹问题 7) styles.css 有孤立 CSS（缺选择器）、第一组 .review-item 死代码被覆盖、注释 `/* --- ???? --- */` 乱码，删除死代码并修复注释为 `/* --- Reviews --- */` 8) config.js loadConfig 错误路径使用 `{ ...clone(DEFAULT_CONFIG) }` 浅拷贝导致嵌套对象共享引用，修复为 `clone(DEFAULT_CONFIG)` 深拷贝后再设置 `__configError`。
- 变更文件：`Run/public/app.js`、`Run/server.js`、`Run/public/styles.css`、`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`plugins/project-guardian/scripts/lib/config.js`、`tests/guardian.test.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：作为自举项目，Project Guardian 自身的代码质量直接影响其推荐给其它团队的工作流可信度；乱码文本影响用户体验，Windows 路径问题影响跨平台兼容，UTF-8 截断问题影响中文输出正确性，MCP 生命周期问题影响 AI IDE 集成稳定性，Shell 转义问题影响安全性，CSS 死代码增加维护成本，浅拷贝问题虽然触发条件极少但违反最佳实践。
- 技术说明：Bug 3 的修复使用 Node.js Buffer API 实现字节安全截断，`subarray` 不会创建新内存拷贝；Bug 6 的修复将 `shellQuoteText` 从仅转义双引号改为 POSIX 单引号包裹（`'text'`），内部单引号转义为 `'\''`，同时更新 `formatBrief` 中的模板字符串移除多余的双引号包裹，并更新测试断言从双引号匹配改为单引号匹配。
- 验证方式：已运行 `npm run lint`（全部 18 个文件语法检查通过）、`npm test` 2 个测试全部通过，失败 0 跳过）。
- 风险：Bug 6 修改了 brief 输出中的 Shell 引号风格（从双引号改为单引号），已同步更新测试断言；其它修复均为内部实现改进，不改变外部接口或用户可见行为。
- 敏感信息检查：本次没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据。
- 下一步：提交到 Gitee 前运行 `guardian verify` 确认记忆质量检查通过；后续可继续处理架构与耦合度问题（ 2026-07-12 07:58 架构分析决策记录）。

### 2026-07-12 07:58 - 架构与耦合度分析并自举记录

- 用户需求：分析当前项目结构与架构，识别耦合度问题或架构不合理问题，并将分析信息和自举都加入项目当中。
- AI 总结：遵循项目自身规则（先运行 `guardian brief --mode deep` 获取读取计划，完整阅读全部 5 份核心记忆文件和全部源码文件），识别 10 个架构与耦合度问题：P0 级别包括工具函数 3-6 个文件中各自复制（readMaybe/writeFile/timestamp/fail/parseFlags/ensureInitialized）和核心记忆文件列表 5 套不一致定义；P1 级别包括 config.js adapters.js/mcp.js 的循环依赖隐患、guardian.js 仍有 600 行承担路由编排和工具函数三重职责、Run 层直 import 4 个插件内部模块且重复 spawn/appendLimited 实现；P2 级别包括两套审计日志重复实现 redactLikelySecret 和密钥检测有 3 套不一致正则；P3 级别包括 knowledge.js 混合搜索与展示逻辑、Run/server.js 仍过大和前端重复 normalizeMemoryName。已通过 `guardian decision add` 将分析结果作为决策记录写入 `memory/DECISIONS.md`  `memory/decisions/2026-07-12-10.md`，并使用 `guardian-cmd git-status` 确认工作区状态。
- 变更文件：`memory/DECISIONS.md`、`memory/decisions/2026-07-12-10.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：项目已经过多轮模块拆分，但工具函数重复、核心记忆文件列表多套定义和 Run 层深度耦合等问题仍未解决，需要系统记录分析结果以便后续按优先级逐步实施。
- 技术说明：依赖关系 config.js adapters.js, mcp.js 存在循环依赖隐患；readMaybe 在 6 个文件中复制，timestamp/fail/parseFlags/ensureInitialized 各在 3-4 个文件中复制；核心记忆文件列表在 guardian.js、security.js、manual-memory.js、handover.js、reviews.js 中有 5 套不一致定义。
- 验证方式：已运行 `guardian brief --mode deep`、`guardian-cmd git-status`、完整阅读全部核心记忆和源码文件，以及 `guardian verify` 确认记忆质量闸门通过。
- 风险：本次为只读分析 + 记忆更新，未修改源码，不存在回归风险；后续实施重构时需保持零依赖和 Windows 兼容，security.js 的 config.memory fallback 统一时需确保不破坏旧行为。
- 敏感信息检查：本次没有写入生产密码、真实 token、客户隐私或其它敏感数据。
- 下一步：按优先级逐步实施重构，P0 先建 `lib/shared.js` 统一工具函数和核心记忆文件列表，每步完成后运行 `guardian verify` 和全量测试。

### 2026-06-08 14:59 - 增强查询能力并补充贡献指南。

- 用户需求：根据同类项目对比复盘 Project Guardian，学习百家之长，优先处理查询能力弱于向量检索方案、单人维护风险较高的问题，同时保持当前功能闭环优势。
- AI 总结：将 `plugins/project-guardian/scripts/lib/knowledge.js` 的 query 排名从纯关键词计数升级为零依赖混合检索，加入常见中英文同义词扩展、n-gram 相似度、匹配词输出和更温和的记忆源码结果过滤；新增根目录 `CONTRIBUTING.md`，明确开发前检查、提交前验证、查询能力贡献标准、文档记忆同步要求和优先贡献方向；README、CLI/CI、接入、规范、交接和项目上下文文档同步更新为“本地混合检索，不是外部 RAG”。
- 变更文件：`plugins/project-guardian/scripts/lib/knowledge.js`、`tests/guardian.test.js`、`CONTRIBUTING.md`、`package.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/HANDOVER.md`、`memory/DECISIONS.md`  `memory/decisions/2026-06-08-hybrid-search-and-contributing.md`。
- 业务原因：对小团队来说，直接引入向量数据库或外部 API 会提高部署和隐私成本；先用零依赖混合检索缓解表达差异和中英文查询问题，可以保留开箱即用优势，同时为后续可选向量索引留下清晰边界。
- 技术说明：query 会保留来源路径输出，并新增`Matched:` 说明命中的词；评分组合包括原始查询词、扩展同义词、文件路径命中、短语匹配、n-gram 相似度和知识文件权重；测试新增英 onboarding/handoff/risk 查询命中文中“新人接交接/风险”的回归用例。
- 验证方式：已运行 `node --check plugins/project-guardian/scripts/lib/knowledge.js`、`node --test --test-name-pattern "knowledge module|query supports lightweight semantic|query supports Chinese|query prefers memory|query still returns" tests/guardian.test.js`、`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`git diff --check`  `npm.cmd audit --audit-level=moderate`；全量测 72 个通过，`guardian verify` 通过，npm audit 0 漏洞，diff 检查只 Windows LF/CRLF 提示。
- 风险：这仍不是真正向量检索或 RAG，特别大的记忆库和更复杂的语义问答仍可能需要可选索引、摘要缓存或向量后端；同义词表需要随着真实使用继续维护。
- 敏感信息检查：本次没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据；新增贡献文档也明确禁止把敏感数据写入文档、测试或记忆。
- 下一步：提交到 Gitee 前复查 `git status`；后续根据真实查询失败案例继续补同义词、分片策略、摘要缓存或可选向量索引。

### 2026-06-08 11:51 - 新增 AI IDE 受控命令层和命令审计日志

- 用户需求：新增系统级别日志功能，单独放在插 `cmd/` 文件夹中，让 AI IDE 运行常见系统命令时优先从这里找到替代命令；每次运行都由代码自动追加日志，记录调用时间、方法和参数，而不是让 AI Agent 手写日志。
- AI 总结：新增`plugins/project-guardian/cmd/guardian-cmd.js`  `plugins/project-guardian/cmd/README.md`；`guardian-cmd` 使用固定命令目录覆盖 Git、npm、Node 和主 Project Guardian 子命令，执行时不使用 shell 字符串拼接，并自动写入 `.project-guardian/cmd-audit.jsonl`；失败、未知命令和非法参数也会记录。package 新增 `guardian-cmd` bin，VS Code tasks 和多套 AI 规则模板已同步为优优先使用受控命令层。
- 变更文件：`plugins/project-guardian/cmd/guardian-cmd.js`、`plugins/project-guardian/cmd/README.md`、`package.json`、`package-lock.json`、`tests/guardian.test.js`、`AGENTS.md`、`.cursorrules`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/assets/templates/zh-CN/*`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`explain/PROJECT_FILES_EXPLANATION.md` 和项目记忆文件。
- 业务原因：让 AI IDE 的命令执行形成稳定、可查、自动产生的本地轨迹，同时避免把能力做成任意 shell 代理；团队后续可以根据真实高频命令逐步扩展白名单。
- 技术说明：`guardian-cmd` 使用 `spawnSync` 参数数组 `shell: false`；命 ID 固定注册；无参数命令拒绝额外参数；路径参数必须留在项目相对路径内；日志参数会做基础脱敏，疑 password、secret、token、api_key、private_key 和长 token 字符串不会完整写入；如果审计日志无法写入，原本成功的命令会返回失败状态，避免出现“执行了但没有记录”的假成功。
- 验证方式：已运行 `node --check plugins/project-guardian/cmd/guardian-cmd.js`、`node --check plugins/project-guardian/scripts/guardian.js`、`node plugins/project-guardian/cmd/guardian-cmd.js list`、`node --test --test-name-pattern "guardian-cmd|package exposes" tests/guardian.test.js`、`node --test --test-name-pattern "vscode adapter|guardian-cmd|package exposes" tests/guardian.test.js`、`node --test --test-name-pattern "guardian-cmd" tests/guardian.test.js`、`node plugins/project-guardian/cmd/guardian-cmd.js npm-lint`、`node plugins/project-guardian/cmd/guardian-cmd.js npm-test`、`node plugins/project-guardian/cmd/guardian-cmd.js guardian-verify`、`node plugins/project-guardian/cmd/guardian-cmd.js git-diff-check`  `node plugins/project-guardian/cmd/guardian-cmd.js npm-audit`；全量测 71 个通过，`guardian verify` 通过，npm audit 0 漏洞，diff 检查只 Windows LF/CRLF 提示。
- 风险：`guardian-cmd` 是本 JSONL 命令轨迹，不是企业集中审计或不可篡改存储；只覆盖白名单命令，未覆盖的命令仍可能需要临时直接运行；`guardian mcp` 是长时间 stdio 服务，不放放入普通短命令目录。
- 敏感信息检查：本次没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据；新增日志实现会对疑似敏感参数做基础脱敏。
- 下一步：提交到 Gitee 前复查 `git status`；后续按真实 AI IDE 使用频率补充更多受控命令 ID。

### 2026-06-05 15:58 - 拆分决策复审交接模块并增 Run 审计边界

- 用户需求：继续处理剩余风险，Run 审计日志已经从浏览器本地辅助记录升级为项目本 JSONL，但仍不是企业级集中审计；`guardian.js` 已继续瘦身， decision/reviews/handover 还可以继续拆成独立模块。
- AI 总结：新增`plugins/project-guardian/scripts/lib/decisions.js`、`plugins/project-guardian/scripts/lib/reviews.js`  `plugins/project-guardian/scripts/lib/handover.js`，把决策记录、复审检测、完成和交接指南生成从 `guardian.js` 中拆出；新增 `Run/lib/audit.js`，把 Run 服务端本地审计日志、hash 链完整性校验、敏感摘要脱敏和可 `GUARDIAN_RUN_TOKEN` API 口令保护 `Run/server.js` 中拆出；Run 前端会显示审计链校验状态并通过本地保存 token 发 API 请求头。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/decisions.js`、`plugins/project-guardian/scripts/lib/reviews.js`、`plugins/project-guardian/scripts/lib/handover.js`、`Run/lib/audit.js`、`Run/server.js`、`Run/public/app.js`、`package.json`、`tests/guardian.test.js`、`Run/README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/HANDOVER.md`、`memory/DECISIONS.md`  `memory/decisions/2026-06-05-cli-run-audit.md`。
- 业务原因：继续降低 CLI  Run 后端主文件的维护压力，同时把本地审计从“普通落盘记录”提升为“能发现篡改迹象、可选本地访问口令”的轻量机制；但不把它伪装成企业级登录、集中采集或不可变审计系统。
- 技术说明：`guardian.js` 仍保留命令分发、init/update/check/doctor/query/hooks/CI 等编排；新审计条目写 `sequence`、`previousHash`、`hashAlgorithm`  `hash`，`/api/audit-log` 会返回完整性校验结果，旧无 hash 记录 legacy 统计；设 `GUARDIAN_RUN_TOKEN` 后，所 `/api/*` 请求必须发 `X-Guardian-Run-Token`  Bearer token，未授权访问也会写入脱敏审计记录。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`git diff --check`、`npm.cmd run verify`  `npm.cmd audit --audit-level=moderate` 6 个测试全部通过，`guardian verify` 通过，npm 审计 0 漏洞，diff 空白检查无错误，仅 Windows LF/CRLF 提示。
- 风险：Run hash 链是本地防篡改提示，不是不可篡改存储；`GUARDIAN_RUN_TOKEN` 是轻量本地口令，不是完整登录鉴权；如果使用`--host 0.0.0.0` 或多人共享，仍必须额外设计反向代理、HTTPS、登录鉴权、访问控制、集中采集、保留策略和不可变存储；`guardian.js` 后续仍可继续拆分其它命令编排。
- 敏感信息检查：本轮没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据；文档中 token 均为示例占位，审计实现会脱敏疑似 token/password/api_key/private_key。
- 下一步：提交到 Gitee 前复查 `git status`；后续真实使用时再评估集中审计、Run API 路由拆分和继续拆 `guardian.js` init/update/check/doctor/query/hooks/CI。

### 2026-06-05 15:43 -  Run 网页控制台与 MCP 系统模块互联

- 用户需求：网页版继续做，并 MCP 与网页版同步，作为同一套系统；MCP 单独作为系统模块，网页版负责与这个模块互联、获取信息、传入信息并使用。
- AI 总结：`plugins/project-guardian/scripts/lib/mcp.js` 新增 `executeMcpTool()` 共享执行器，保留 stdio MCP server，同时让 Run 网页后端通过同一 MCP 模块调用工具；Run 新增 `/api/mcp/call`，只允许调用当前 MCP 配置启用的工具，写入类工具必须输 `RUN_MCP`；前 `MCP 系统` 页面新增工具调用表单、动态参数输入、写入确认和 MCP 输出区。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`tests/guardian.test.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-05-run-mcp-web-sync.md`。
- 业务原因：用户需 MCP 不只是被展示，而是作为 Project Guardian 的独立能力模块被网页控制台复用，避免 CLI、stdio MCP 和 Web UI 形形成三套分叉能力。
- 技术说明：共享执行器复 `TOOLS`、`WRITE_TOOL_NAMES`、`enabledToolNames()`、`validateToolArguments()`  `commandForTool()`；Run server 为每个实例维 MCP 调用队列，读工具可并发、写工具串行；审计日志只记录 MCP 工具名和参数名，不记录参数值。
- 验证方式：已运行 `node --check` 覆盖 `mcp.js`、`Run/server.js`、`Run/public/app.js`  `tests/guardian.test.js`；针对性运行 `node --test --test-name-pattern "Run web server exposes|mcp public status|mcp executeMcpTool" tests/guardian.test.js`。 个相关测试通过；最终运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`  `git diff --check`，全量测 64 个全部通过，`guardian verify` 通过，diff 检查仅 Windows LF/CRLF 提示。
- 风险：Run 仍无内置登录鉴权，不能公网暴露；Web 调用 MCP 工具虽然复用 MCP 权限过滤和确认词，但写入工具仍会修改项目记忆，必须继续依 Git diff、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私；MCP 审计记录不保存工具参数值。
- 下一步：运行全量验证；真实使用后观察是否需要增加更细的 MCP 工具分组、常用参数模板或外部 MCP 客户端连接诊断。

### 2026-06-05 10:31 - 继续拆分 Git/安全模块并为 Run 增加服务端审计日。

- 用户需求：继续处理剩余风险，包 `guardian.js` 仍然没有完全拆完，以 Run 操作日志只是浏览器本地辅助记录、不算正式审计日志。
- AI 总结：新增`plugins/project-guardian/scripts/lib/git-utils.js`，承 Git 子进程封装、变更文件集合、diff stat、变更行范围、项目文件扫描和 ignore 规则，并保留 `.vue` / `.svelte` 等前端源码收集能力；新增 `plugins/project-guardian/scripts/lib/security.js`，承 `scan-secrets` 的记忆文件与单独决策文件扫描、关键词密钥识别、高熵字符串识别和脱敏输出；`guardian.js` 删除对应内联实现并改为模块编排。Run 后端新增 `.project-guardian/run-audit.jsonl` 服务端本地审计日志和只读 `/api/audit-log`，前端命令操作页新增服务端审计日志面板；`.gitignore` 忽略 `.project-guardian/`，避免本地审计文件污染工作区。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/git-utils.js`、`plugins/project-guardian/scripts/lib/security.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`package.json`、`.gitignore`、`tests/guardian.test.js`、`Run/README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-05-git-run.md`。
- 业务原因：继续降低 CLI 主文件维护压力， Git/diff 和安全扫描有清晰模块边界；同时让 Run 控制台的操作记录从只存在浏览 `localStorage` 的短记录，升级为本机服务端落盘的 JSONL 审计轨迹，便于刷新页面后继续追踪操作。
- 技术说明：`git-utils.js` 复用固定 `git` 子进程参数，不开放任 shell；`security.js` 兼容当前 `config.memoryFiles` 和旧 `config.memory` 字段，避免拆分后配置字段不一致导致扫描崩溃。Run 审计只记录操作摘要、路由、状态、耗时、受控参数摘要和错误摘要；`brief`/`query` 不记录问题原文，手动追加记忆不记录正文，疑似 token/password/api_key 会脱敏。
- 验证方式：先运行 `npm.cmd run lint` 通过；第一 `npm.cmd test` 发现新安全模块误 `config.memory` 导致 4 个测试失败，随后修复为兼 `memoryFiles`，并修正密钥预览只截取赋值右侧；再次运行失败子集 `node --test --test-name-pattern "Git and security|reviews due|scan-secrets" tests/guardian.test.js` 通过；最终运行 `npm.cmd test` 通过，当 62 个测试全部通过；再次运行 `npm.cmd run lint` 通过。最终复核时又补 `.vue` / `.svelte` 文件收集测试，随后运行统一 `npm.cmd run verify`，当 63 个测试全部通过。
- 风险：服务端审计日志是本 JSONL，不是带登录鉴权、集中采集和保留策略的企业审计；`.project-guardian/` 默认 Git 忽略，如果团队需要正式审计，需要自行采集该文件。`guardian.js` 已继续瘦身， decision/reviews/handover 等命令编排仍在主文件中，后续还仍能继续低风险拆分。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私；审计日志实现会对疑似敏感值脱敏，测试中的密钥样例为假值且断言不会完整输出。
- 下一步：运行最终`guardian verify`、`git diff --check`  `git status`；后续可继续拆分 decision/reviews/handover，或 Run 增加审计日志导出、集中采集说明和更完整的 diff 详情查看。

### 2026-06-05 09:54 -  MCP 系统接入 Run 可视化控制台

- 用户需求：帮我 MCP 系统一起写入到可视化控制台里。
- AI 总结：Run 控制台新增`MCP 系统` 页面，展 `guardian mcp`、本地脚本启动命令、协议版本、MCP 只读状态、`mcp.allowedTools` 和每 MCP 工具的启启用/禁用、只读/写入属性；Run `/api/status` 新增只读 MCP 状态摘要，`mcp.js` 新增 `publicMcpStatus()` 给控制台复用 MCP 元数据。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`tests/guardian.test.js`、`Run/README.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-05-run-mcp-console.md`。
- 业务原因：用户需要在可视化控制台里看 MCP 系统状态和可用工具，降低配 AI IDE 时的理解成本，同时保 Run 控制台不变成任意 shell 或长连接服务管理器。
- 技术说明：`publicMcpStatus()` 基于现有 `TOOLS`、`WRITE_TOOL_NAMES`、`validateMcpConfig()`  `enabledToolNames()` 生成展示摘要；Run 后端只读 `project-guardian.config.json`  MCP 配置并返回状态，不启 MCP server；前端新增独 MCP 视图和工具卡片渲染。
- 验证方式：已运行 `node --check Run/server.js`、`node --check Run/public/app.js`、`node --check plugins/project-guardian/scripts/lib/mcp.js`、`node --check tests/guardian.test.js`、`node --check plugins/project-guardian/scripts/guardian.js`、`node --check Run/lib/commands.js`、`npm.cmd run lint`  `npm.cmd test`；当 63 个测试全部通过。
- 风险：MCP 页面只是配置和工具元数据视图，不 MCP 客户端调试器；`PROJECT_GUARDIAN_MCP_READ_ONLY=1` 只反映当 Run 进程环境，真 AI IDE 启动 MCP 时仍要确 IDE 侧环境变量和工作目录。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据；MCP 状态载荷只包含工具名、描述、配置状态和启动命令。
- 下一步：运行最终`guardian verify` diff 检查；后续如要支持控制台内 MCP 调试，应先补连接生命周期、逐次确认、审计日志和权限边界设计。

### 2026-06-04 18:04 - 拆分 CLI 核心模块并增 Run 命令操作

- 用户需求：在 `guardian.js` 仍然偏大，下一步按低风险顺序拆配置加载/校验、文档校验、query/brief 检索；Run 后续继续补命令搜索、写入前 diff 预览和操作日志，并完善这些功能。
- AI 总结：新增`plugins/project-guardian/scripts/lib/config.js`、`doc-validation.js`  `knowledge.js`，把配置加载/校验、核心记忆文档质量检查、query/brief 检索与读取计划格式化从 `guardian.js` 中拆出；Run 控制台新增命令搜索、浏览器本地短操作日志和写入类命令弹窗内的固 Git diff 预览。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`package.json`、`tests/guardian.test.js`、`Run/README.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/HANDOVER.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-04-cli-module-and-run-ops.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：继续降低 `guardian.js` 的维护压力，让配置、文档质量和检索能力都有独立测试边界；Run 命令数量增加后，零基础用户需要搜索命令、在写入前确 Git 改动状态，并能回看简短操作结果。
- 技术说明：`guardian.js` 保留命令编排和仍被多处复用的 Git/文件遍历逻辑；`config.js` 统一默认配置、语言和配置校验；`doc-validation.js` 统一 `validate-docs` 规则；`knowledge.js` 统一 query 排名、输出格式和 brief token 预算。Run `/api/diff-preview` 只执行固定只 Git 命令，不接受用户传入参数；操作日志只保存在浏览器本地。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和一次 Run UI/API 冒烟脚本；当 61 个测试通过，Project Guardian doctor/check/validate-docs/reviews/scan-secrets 全部通过，审计 0 漏洞，打包预览包含新增 CLI 模块 Run 文件，页面节点、status、diff-preview query API 均可用。
- 风险：`guardian.js` 仍未完全模块化，后续还可以继续拆 Git、decision/reviews、security handover；Run 操作日志不是正式审计日志，diff 预览只是摘要，不展示完整补丁；Web UI 仍默认只适合本机使用，不能直接公网暴露。
- 敏感信息检查：已检查本轮变更没有写入生产密码、真实 token、客户隐私或其它密钥；`guardian verify` 中的安全扫描已通过。
- 下一步：提交前复查最终 diff；后续根据真实使用反馈决定是否继续拆 Run API 路由、增加完整 diff 查看或导出操作日志。

### 2026-06-04 11:39 - 拆分 Run 命令目录模块

- 用户需求：阅读项目所有代码文件，分析代码结构与实现目标，把繁琐代码进行多步拆解和分析，并对耦合度较高的地方进行重构解耦、完善项目框架和修复问题。
- AI 总结：复核了 CLI、MCP、适配器、手动记忆模块、Run 后端、Run 前端和测试结构；新增 `Run/lib/commands.js`，把 Run 控制台固 CLI 命令目录、公开命令描述、写入类参数构造和字段校验 `Run/server.js` 中拆出；`Run/server.js` 现在主要保留本地 HTTP server、API 路由、记忆读写入边界 CLI 子进程执行。
- 变更文件：`Run/lib/commands.js`、`Run/server.js`、`package.json`、`tests/guardian.test.js`、`Run/README.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-04-run-command-catalog-module.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：Run 控制台命令数量已经增加，如果命令目录、参数校验和 HTTP server 继续写在同一个文件里，后续新增命令、修改字段或修复安全校验会更难审查，也更容易误伤 API 主流程。
- 技术说明：新模块导 `COMMAND_DEFINITIONS`、`COMMANDS`、`COMMAND_CONFIRMATION`  `publicCommandDefinition()`；写入命令仍然只允许固定白名单并保留 `RUN_COMMAND` 确认词；新增测试直接覆盖命令参数构造、非法适配器拒绝、越界复审路径拒绝和前端公开命令信息不暴 `buildArgs`。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd audit --audit-level=moderate`  `git diff --check`；当 58 个测试通过，Project Guardian doctor/check/validate-docs/reviews/scan-secrets 全部通过，审计 0 漏洞，diff 空白检查无错误。`npm.cmd pack --dry-run` 因本 npm cache `EPERM` 失败，提权重跑被当前环境用量限制拒绝，需要用户本机补跑。
- 风险：本轮没有拆 `guardian.js`  CLI，核 CLI 仍是最大文件；Run 命令目录只是固定白名单和确认词防线，不是用户权限系统，不能替 Git diff、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：继续做最终安全审计和 diff 检查；后续可考虑命令搜索、写入前 diff 预览、操作日志，或进一步拆 Run API 路由。

### 2026-06-04 10:50 - 修复 Run 模板兜底和命令分组。

- 用户需求：追加记忆选择模板时出现“当前记忆文件没有可用模板”；命令操作模块需要把命令分组，例如专用模块单独成组，方便查找和使用。
- AI 总结：追加记忆模板筛选增加前端兜底，后端模板列表为空、目标名称大小写不同或暂未加载专用模板时，界面仍保留“自定义完整记录”入口；命令操作模块改为按专用模块、只读检查、写入维护和终端服务分组渲染，组内继续使用原命令卡片和参数弹窗。
- 变更文件：`Run/public/app.js`、`Run/public/index.html`、`Run/public/styles.css`、`tests/guardian.test.js`、`README.md`、`Run/README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：零基础用户看到“没有可用模板”会误以为不能继续记录项目记忆；CLI 命令数量增加后，如果不分组，专用模块、检查命令和写入维护命令混在一起会降低使用效率。
- 技术说明：`templatesForMemoryFromList()` 会规范化目标记忆名并追加 `custom-note` 兜底；`commandGroupsForDisplay()` 按命令类型生成固定展示顺序；命令容器从单层网格改为分组容器，每组内部保留原卡片网格。
- 验证方式：已运行 `node --check Run/public/app.js`  `npm.cmd test`；新增测试覆盖模板兜底和命令分组组顺序，当 57 个测试通过。
- 风险：前端兜底只能解决当前页面没有模板可选的问题；如果用户仍在访问旧 Run server，需要重 `npm run ui`  `node Run/server.js` 后才能使用后端模板化写入能力。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实使用后观察是否需要命令搜索、分组折叠、写入前 diff 预览或更多追加记忆模板。

### 2026-06-04 10:16 - 完善 Run 命令弹窗和模板化追加记忆

- 用户需求：按顺序完成三个任务：命令操作模块里需要参数的命令改为点击按钮后弹窗输入并确认或取消；追加记忆模块预设模板和字段，让用户只填关键信息；完善 CLI 系统、修复风险，并与控制台系统同步。
- AI 总结：Run 命令操作卡片不再内联展示大量参数字段，写入类或带参数命令会打开弹窗填写参数和确认词；追加记忆模块改为从后端获取模板，根据目标记忆文件展示关键字段；新增共享 `manual-memory.js` 模块 CLI `guardian append-memory`，让网页和命令行共用模板、核心记忆白名单、追加格式和基础敏感词拦截。
- 变更文件：`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/manual-memory.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-04-manual-memory-template-sync.md`。
- 业务原因：零基础用户不适合在狭小命令卡片里填写复杂参数，也不应该自己组织整 Markdown 记忆；模板化字段可以降低漏写“为什么改、如何验证、风险、下一步”的概率，同时让 CLI 和网页能力保持一致。
- 技术说明：`Run/server.js`  `/api/status` 现在暴露 `memoryAppendTemplates`  `templateMemoryAppend`；`Run/public/app.js` 新增命令参数弹窗、模板字段渲染和模板字段收集；`guardian append-memory` 支持 `--file`、`--template`、`--content`  `--templates`；`manual-memory.js` 负责模板定义、字段校验、敏感词拦截、路径解析和追加记录生成。
- 验证方式：已运行 `npm.cmd run lint`  `npm.cmd test`；当 55 个测试通过。新增测试覆 Run 模板状态接口、模板化追加记忆、CLI `append-memory` 成功写入、模板列表输出和错误复审日期拦截。
- 风险：Run 仍没有内置登录鉴权，不能公网暴露；模板化追加记忆只能降低漏写风险，不能替代代码评审、`guardian verify` 和人工安全检查；复杂重大决策仍应优先使用 `guardian decision add`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据；新增模板字段和自由文本入口都会做基础敏感词拦截。
- 下一步：真实使用后观察是否需要命令搜索、写入前 diff 预览、操作审计、更多模板或 MCP 追加记忆工具。

### 2026-06-04 09:43 - 修复 Run 知识查询输出和源码噪声。

- 用户需求：Run 知识查询输出中出现两 `guardian query OK`，并 `运行..` 当成历史记录保留下来；查询结果还混入 `Run/public/index.html`  HTML 片段，显示效果像是错误内容。
- AI 总结：前端把“运行中...”改为临时占位，最终结果返回时会替换掉占位，不再记录成成功日志；CLI 查询排序改为先确认真实命中再加记忆权重，并在记忆已有命中时压低偶然匹配的源码和页面片段。
- 变更文件：`Run/public/app.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：知识查询面向零基础用户时，应优先像项目知识问答，而不是把按钮文案、HTML 标签或临时运行状态当作最终答案展示。
- 技术说明：新增 `setOutputPending()`，`appendOutput()` 会清理临 `运行..` 占位；query 索引 chunk 增加 `kind`，`score()` 只有真实命中关键词或路径时才给分，`includeQueryResult()` 在记忆结果存在时只允许强相关源码或路径命中的源码补充进入结果。
- 验证方式：已运行 `node --check Run/public/app.js`、`node --check plugins/project-guardian/scripts/guardian.js`  `npm.cmd test`；当 54 个测试通过。已 `guardian query "知识查询" --limit 3` 复核，不再返 `Run/public/index.html`。
- 风险：当前 query 仍是本地关键词检索，不是语义 RAG；如果用户确实要查源码，应在问题中带上文件名、路径、函数名、报错文本或模块名。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续可在 Run 界面增加查询范围选择，例如“优先记/ 包含源码 / 只查源码”。

### 2026-06-03 18:37 - 完善 Run 全量命令操作与查询独立输。

- 用户需求：知识查询模块需要自己单独输出记录；侧边栏需要可以收起并带平滑动画；命令操作模块需要把 CLI 所有指令都集成进去。
- AI 总结：Run 控制台新增知识查询独立输出区，query 结果不再混入通用命令输出；左侧侧边栏增加收起/展开按钮和过渡动画；命令操作模块改为从后端固定命令目录渲 Guardian CLI 全量入口。
- 变更文件：`Run/server.js`、`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-03-run-command-catalog.md`。
- 业务原因：零基础用户需要在网页里看见完 CLI 能力，但仍要避免网页变成任意 shell 或把写入类命令误点执行。
- 技术说明：`Run/server.js` 新增 `COMMAND_DEFINITIONS` 命令目录，按 `read`、`write`、`linked`、`terminal` 分类；只读命令直接运行，写入类命令必须输 `RUN_COMMAND`，`init`、`brief`、`query` 引导到专用模块，`mcp` 只提示终端运行。`decision add` 表单补齐日期、备选方案、影响文件、关联变更、风险、复审日期和后续动作；`install-adapters` 支持逗号分隔适配器列表。
- 验证方式：已运行 `node --check Run/server.js`、`node --check Run/public/app.js`、`node --check tests/guardian.test.js`、`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和本 Run UI/API 冒烟；当 51 个测试通过，审计 0 漏洞，verify 通过。`npm.cmd pack --dry-run` 普通运行被 npm 缓存目录 EPERM 拦截，提权重跑被当前环境额度限制拒绝，需要用户本机补跑。
- 风险：Run 仍没有内置登录鉴权，不能公网暴露；写入类命令虽然需要确认词，但仍会修改目标项目文件，团队应继续依赖 Git diff、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据；后端仍会拦截疑似密钥文本字段。
- 下一步：真实使用时观察命令卡片数量是否过多，必要时增加搜索、分组折叠、写入前 diff 预览和操作审计。

### 2026-06-03 17:31 - 合并 Run 命令检查与输出记录模块

- 用户需求：Run 可视化控制台里“检查命令”和“输出记录”不需要分成两个模块，两个功能放在一起即可，合并后的新模块命命名为“命令操作”。
- AI 总结：Run 左侧侧边栏移除了单独的“检查命令”和“输出记录”入口，新增统一的“命令操作”入口；该页面上方展示检查命令按钮，下方展示命令输出记录，执行命令后自动停留在“命令操作”页面查看结果。
- 变更文件：`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：把强相关的命令触发和结果查看放在同一个页面，可以减少零基础用户在侧边栏中来回切换，也让“执行命令后看结果”的操作路径更直接。
- 技术说明：前端视图 `checks`/`output` 合并 `commands`；`postAndRender()` 改为切换 `commands`；测试断言同步检查旧入口已移除、新入口与合并视图存在；MCP query 测试补充临时 Git 仓库隔离，避免读取父级真实仓库历史导致结果漂移。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、本 Run UI/API 烟测 `npm.cmd pack --dry-run`；当 51 个测试通过，审计 0 漏洞，发布包 dry-run 通过。
- 风险：这是局 UI 结构调整，不改变后端 API  CLI 行为；浏览器中如果仍看到旧菜单，通常需要刷新页面或重启 `npm run ui` 后重新打开当前端口。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实使用时观察“命令操作”页面在窄屏下的按钮区和输出区是否仍然易读，必要时再做移动端布局微调。

### 2026-06-03 17:19 - 优化 Run 侧边栏和 Markdown 表格预览

- 用户需求：核心记忆内容中的 Markdown 表格现在按原文显示，没有文档表格效果；Run 控制台功能都挤在一个页面里，需要左侧侧边栏选择功能，主页只保留插件状态概览。
- AI 总结：Run 页面改为左侧侧边栏导航和右侧单功能视图，默认首页只显示状态概览；核心记忆预览 `<pre>` 原文改为轻量 Markdown 渲染，支持标题、列表、代码块和表格。
- 变更文件：`Run/public/index.html`、`Run/public/app.js`、`Run/public/styles.css`、`Run/README.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`tests/guardian.test.js`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`、`memory/decisions/2026-06-03-run-visual-layer.md`。
- 业务原因：记忆文件本身是 Markdown，用户在可视化控制台里应该看到接近文档的阅读效果；功能分区能降低零基础用户的认知负担。
- 技术说明：新增侧边 `data-view` 页面切换；`memoryViewer` 改为 `markdown-viewer`；前端新增可测试的 `renderMarkdown`、`renderTable` 和表格解析函数；Markdown 渲染先转 HTML，再处理行内 code 和粗体，降低本地文档预览的注入风险。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test` 和最 Markdown 表格渲染检查；当前 51 个测试通过，新增测试覆盖首页侧边栏结构、Markdown viewer 容器和表格渲染结果。
- 风险：当 Markdown 渲染器是轻量实现，不是完 CommonMark；复杂嵌套表格、脚注、任务列表等不会完整渲染，但核心记忆常用标题、列表、代码块和表格已经覆盖。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：最终提交前继续运行完整 `guardian verify`，真实浏览器里观察小屏幕侧边栏和长表格横向滚动体验。

### 2026-06-03 17:04 - 修复 Run 读取记忆旧后端提示。

- 用户需求：Run 控制台点击读取记忆时连续失败，输 `Method not allowed`，需要解释原因并解决。
- AI 总结：确认当前代码已经使用`GET /api/memory`；`Method not allowed` 更符合旧 `Run/server.js` 进程仍在运行的情况，因为静态前端文件会实时读取磁盘新版， Node 后端代码不会在不重启时自动更新。新 API 能力标记和前端兼容提示。
- 变更文件：`Run/server.js`、`Run/public/app.js`、`Run/README.md`、`tests/guardian.test.js`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：零基础用户看到 `Method not allowed` 不知道该重启服务，容易误以为记忆文件损坏或插件无法读取。
- 技术说明：`/api/status` 新增 `apiVersion`  `features`，包 `memoryRead`、`initProject`、`appendMemory`、`configuredMemoryPaths`；前端发现缺 `memoryRead` 时禁用记忆按钮并显示重启 `npm run ui`  `node Run/server.js` 的提示。
- 验证方式：已运行 `npm.cmd run lint`  `npm.cmd test`，当 50 个测试通过；新增断言覆盖 `/api/status` 能力标记。
- 风险：如果用户同时开了多 Run 服务端口，仍可能访问到旧端口；需要确认浏览器地址和当前终端输出的 URL 一致。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：最终提交前继续运行完整 `guardian verify`。

### 2026-06-03 16:45 - 增强 Run 控制台记忆查看和受控写入

- 用户需求：Run 可视化控制台需要能点击查看核心记忆文件内容，并集成更多核心功能，例如插件初始化和用户手动提交新记忆内容。
- AI 总结：Run 控制台新增核心记忆文件点击预览、固定表单初始化、手动追加记忆和配置化记忆路径解析；后端保持不使用任 shell，写入操作必须输入确认词，并对疑似密钥内容做基础拦截。
- 变更文件：`Run/server.js`、`Run/public/index.html`、`Run/public/styles.css`、`Run/public/app.js`、`Run/README.md`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/decisions/2026-06-03-run-visual-layer.md`。
- 业务原因：零基础用户和项目管理者需要不用命令行也能查看记忆、初始化项目和补充上下文；同时必须避免网页界面变成任意文件写入或任意命令执行入口。
- 技术说明：新增 `/api/memory`、`/api/init`  `/api/memory/append`；核心记忆路径优先从 `project-guardian.config.json` 读取；`/api/init` 只接受固定语言和适配器选项并要 `RUN_INIT`；`/api/memory/append` 只写核心记忆白名单并要求 `APPEND_MEMORY`；敏感内容拦截收窄为疑似密钥赋值、Authorization/Bearer 和私钥块，避免误伤正 token 成本说明。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和本 Run UI/API 冒烟脚本；当 50 个测试通过，审计 0 漏洞，发布包清单包含 `Run/`。新增回归测试覆盖记忆读取、缺少确认拒绝、疑 `api_key=` 拒绝、普 token 预算说明允许、Run 初始化和自定义记忆路径读取和追加。
- 风险：Run 没有内置登录鉴权，不能直接公网暴露；手动追加记忆只有基础敏感内容拦截，不能替 `guardian verify`、代码评审和人工安全审查；复杂写入流程仍应优先使 CLI/MCP。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实使用后评估是否增加写入 diff 预览、操作日志、记忆搜索、复审日历或桌面窗口包装。

### 2026-06-03 11:46 - 新增 Run 可视化运行层

- 用户需求：创建 `Run/` 文件夹，在其中实现用户可自行部署的网页或窗口可视化功能，隔离可视化内容和插件本体，但仍作为插件的一部分维护。
- AI 总结：新增`Run/` 可选本 Web 控制台，包含无第三方依赖 Node.js HTTP server、静态页面、样式和浏览器交互；默认监听 `127.0.0.1`，通过只读白名单调用现 Project Guardian CLI。
- 变更文件：`Run/server.js`、`Run/public/index.html`、`Run/public/styles.css`、`Run/public/app.js`、`Run/README.md`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/decisions/2026-06-03-run-visual-layer.md`。
- 业务原因：完全依赖命令行会增加零基础用户和非技术管理者的使用门槛；可视化层可以降低查看状态、运行检查、生成 brief 和查询项目知识的成本，同时保持核 CLI/MCP 稳定。
- 技术说明：`Run/server.js` 不使 shell 拼接命令，而是通过固定参数调用 Node.js  `guardian.js`；`/api/command` 只允许只读命令，`brief`  `query` 限制问题长度和返回数量；`package.json` 增加 `npm run ui` 并把 `Run` 纳入发布范围。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`  `node Run/server.js --help`；新增 Run API 回归测试覆盖状态接口、写入命令拒绝和 `brief --mode full` 调用，当 48 个测试通过，审计 0 漏洞。`npm.cmd pack --dry-run` 普通运行因 npm 缓存目录权限失败，提权重跑被当前环境审批/用量限制拦截，需用户本机补跑确认发布包。
- 风险：当 Web UI 没有登录鉴权，不能直接暴露公网；默认只读，后续如果增加写入能力，必须先做确认、预览和审计。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实使用后评估是否增加复审日历、记忆只读预览、写入确认流程或桌面窗口包装。

### 2026-06-03 11:11 - 修复按需读取误判风险

- 用户需求：修复 token 按需读取机制的风险，避免 Agent 因为限制只读部分记忆而漏掉需要全量上下文的情况。
- AI 总结：为 `guardian brief` 增加 `--mode auto|quick|deep|full`；`quick` 只读核心两份，`deep` 强制包含决策 AI 变更日志，`full` 读取全部核心记忆；MCP `guardian_brief` 新增 `mode` 参数并严格校验；CLI 输出增加升级触发条件，强调按需读取不是硬限制。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`AGENTS.md`、AI 规则模板、Project Guardian 文档、`零基础超简单入门.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：按需读取能节 token，但如果 Agent 把它误解成硬限制，可能在 bug、回归、历史不清楚或高风险模块中漏 `AI_CHANGELOG.md`、`DECISIONS.md`  `HANDOVER.md`。
- 技术说明：`brief` 默认仍是 `auto`，但支持手动指定 `quick`、`deep`、`full`；无效或缺失 `--mode` 值会失败；MCP schema 通过 enum 限制 mode；模板和文档同步写明升级规则。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian brief "普通小改动" --mode quick --limit 2`、`guardian brief "修复登录回归" --mode deep --limit 2`  `guardian brief "新人接手" --mode full --limit 2`；当 47 个测试通过，审计 0 漏洞，发dry-run 包含 CLI、MCP、规则模板、Skill 和文档。
- 风险：`deep`  `full` 会增 token 消耗；但这是高风险任务下有意付出的上下文成本。后续如果核心记忆继续变大，可增加短摘要 MCP resources。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实 AI IDE 接入后观察是否正确使用`mode`，必要时增加配置化默认模式或按目录自动升级。

### 2026-06-03 10:32 - 建立 token 预算读取机制

- 用户需求： Project Guardian 设计并真实 token 消耗控制方案， Agent 只读取正确、关键、必要的记忆内容；可以通过 skill 或工具按需读取文件，减少每次对话成本，同时不影响现有功能和安全规则。
- AI 总结：新增`guardian brief`  MCP `guardian_brief`，在读取大型记忆文件前输出预算友好的读取计划、必读文件、按需文件、建 `query --limit` 和粗 token 估算；AI 规则模板、Project Guardian skill、VS Code tasks 和主要文档已同步改为“先 brief、再核心记忆、历史文件按需读取”。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`AGENTS.md`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`零基础超简单入门.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 业务原因：项目记忆越完整，AI 每轮全量读取的成本越高；先用读取计划和查询片段控制上下文，可以保留交接价值，同时降低小任务、日常答疑和新人接手时的 token 消耗。
- 技术说明：`brief` 根据配置中的记忆路径读取核心文件大小，估 token，按关键词把问题路由到决策、变更日志或交接文件；MCP 新增只读工具 `guardian_brief`；`guardian query --limit`  MCP `guardian_query.limit` 继续作为片段数量控制层。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian brief "token 成本控制" --limit 2`  `guardian brief "新人接手" --limit 2`；当 45 个测试通过，审计 0 漏洞，发dry-run 包含 CLI、MCP、模板、Skill 和文档。
- 风险：token 估算是近似值，不等同于模型 tokenizer；关键词路由不是语义检索；如果 `PROJECT_CONTEXT`  `STATE` 继续变大，后续可能还需要短摘要文件、MCP resources 或向量检索。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实 AI IDE 接入后观察是否仍有全量读取倾向，必要时增加更短的摘要层、分页查询或缓存片段。

### 2026-06-02 18:32 - 强化 MCP 参数校验与查询限。

- 用户需求：继续完善 MCP，多轮测试，发现问题与风险就继续修复；完成后再分 token 成本和优化方案。
- AI 总结：MCP server 启动时会强校 `mcp.readOnly`  `mcp.allowedTools`，配置写错会拒绝启动；MCP 工具调用会按 schema 拒绝多余参数、错误类型和越界 `limit`；`guardian query`  MCP `guardian_query` 新增 `limit`，可把查询返回片段控制在 1  10 个。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`零基础超简单入门.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 业务原因：MCP 接入 AI IDE 后，如果配置写错或参数被静默忽略，可能导致写入工具意外开放或查询结果过长；强校验和查询限量能降低误操作风险和 token 成本。
- 技术说明：`scripts/lib/mcp.js` 新增 MCP 配置 normalize/validate 和工具参数 schema 校验；`guardian.js` 复用同一 MCP 配置校验，并 `query` 支持 `--limit`；MCP `guardian_query` 会把数字 `limit` 映射 CLI `--limit`。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`guardian query MCP --limit 1`、`guardian query MCP --limit 11`  `guardian query MCP --limit 2`；当 43 个测试通过，新增 MCP 环境只读、MCP 参数校验、MCP 配置启动失败、MCP query limit  CLI query limit 回归测试。`npm.cmd pack --dry-run` 因沙箱外部权限用量限制未能在本轮重跑。
- 风险：MCP 仍不做身份认证或逐次审批；`limit` 只能控制输出片段数量，不能替代语义检索或更精细的摘要压缩。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 后，真实 MCP 客户端接入时观察默认 limit、分页查询、摘要模式或 MCP prompts/resources 的需求。

### 2026-06-02 18:11 - 建立决策复审检测机制。

- 用户需求：完善复审功能，要求修改功能后能判断是否有问题、是否需要记录与复审；需要复审时创建复审文件并记录内容；到复审时间后 AI 或人工检测，复审完成后标记正常，后续无需继续复审。
- AI 总结：新增`guardian reviews`、`guardian reviews due`  `guardian reviews complete`；`guardian verify` 会检 `memory/decisions/*.md` 中到期未完成的决策复审并失败；复审完成会在对应决策文件追加复审结果，标记正常和无需继续复审；MCP 增加 `guardian_reviews_due`  `guardian_review_complete`。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`零基础超简单入门.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/HANDOVER.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：复审时间如果只写在决策文件中，团队容易忘记检查临时方案、安全权限、质量闸门或兼容策略；把复审纳入 `verify` 后，AI 和人工都能在提交前发现到期事项。
- 技术说明：复审扫描只读 `memory/decisions/*.md`，解 `Review after`  `复审时间` 中的 `YYYY-MM-DD`；到期且没有完成标记时失败；`guardian reviews complete` 会追加复审状态、完成时间、复审人、结论、验证方式和“无需继续复审”。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian reviews`  `guardian reviews due`；新增到期复审阻止 verify、完成复审后恢复通过、MCP 只读隐藏写入工具、package script 的回归测试。
- 风险：复审检测依赖标准字段格式；如果团队手工改坏字段名或日期格式，可能需要人工修正文档或后续增强解析规则。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 后，观察真实团队是否需要复审责任人配置、交互式复审表单或复审历史列表。

### 2026-06-02 17:56 - 生成 Word 版软著申请材料包

- 用户需求： `docs/ip/` 文件夹下创建一 Word 文档，并写入软著申请需要的材料内容。
- AI 总结：新增`docs/ip/Project_Guardian_软著申请材料包.docx`，把官方材料要求摘要、申请表信息准备、著作权人证明、软件说明书内容、源程序鉴别材料建议、文档鉴别材料建议、提交前清单、当前质量记录和人工确认事项整理 Word 版材料包。
- 变更文件：`docs/ip/Project_Guardian_软著申请材料包.docx`、`docs/ip/QUALITY_REPORT.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：软著申请通常需要申请表、软件鉴别材料和相关证明文件；Word 材料包方便人工补齐申请主体、版本、开发完成日期、首次发表日期和权属信息，并用于后续打印、转 PDF 或交给代理机构复核。
- 技术说明：Word 文档使用 Word OpenXML 结构生成，包 `[Content_Types].xml`、`word/document.xml`、`word/styles.xml` relationships 文件；文件位于已忽略 `docs/ip/` 下，不会上传 Gitee。
- 验证方式：已运行 `git check-ignore -v docs\ip\Project_Guardian_软著申请材料包.docx`，确 Word 文档命中 `.gitignore`；已检 `.docx` 压缩包结构，确认包含核心 Word 文件。
- 风险：Word 文档中的申请主体、版本、完成日期、首次发表日期和权属方式仍需人工确认；正式提交前应以中国版权保护中心登记系统、政务服务事项说明或代理机构最新要求为准。
- 敏感信息检查：未写入身份证号、手机号、生产密码、真实 token、私钥或客户隐私数据。
- 下一步：打开 Word 文档补齐人工确认字段，并按最终版本同步申请表、说明书和源程序页眉。

### 2026-06-02 17:51 - 修复 AI 变更日志时间精度校验

- 用户需求：在 `AI_CHANGELOG.md` 的记录时间不精确，后续不能继续全部写 `00:00`；旧记录如果无法修正可以不管。
- AI 总结：确认当 `timestamp()` 已按本地真实小时分钟生成时间；新增质量闸门，`validate-docs` 只检查最新一条 changelog，如果标题时间仍 `00:00` 就失败；同时修复 `latestChangelogText` 误取最旧记录的问题，确保最新记录按文件顶部第一条条判断。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`零基础超简单入门.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`。
- 业务原因：AI 交接记录需要能追踪真实发生时间；大 `00:00` 会让后续接手者无法判断修改先后和实际节奏。
- 技术说明：新增 `hasMidnightTimestamp` 校验最新 changelog 标题；`latestChangelogText` 改为取第一 `###` 记录到下一条记录之前，符合当前“新记录在最前面”的文档习惯；旧历史中的 `00:00` 不触发校验。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`  `npm.cmd run verify`；新增`validate-docs` 拒绝最终`00:00` 和检查文件顶部最新记录的回归测试，当 38 个测试通过。
- 风险：如果有人真的在 00:00 整点生成记录，校验也会要求人工改成更精确或可区分的时间；这是为了避免占位时间继续扩散。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认时间精度修复、MCP 权限修复、文档、测试和记忆文件一起提交。

### 2026-06-02 00:00 - 修复 MCP 工具调用权限风险

- 用户需求：修复问题与风险。
- AI 总结：为 `guardian mcp` 新增配置化工具权限控制，支持 `mcp.readOnly`、`mcp.allowedTools`  `PROJECT_GUARDIAN_MCP_READ_ONLY=1`；MCP 工具列表会按配置隐藏不可用工具，工具调用会阻止被禁用命令执行；`doctor` 会校验错 MCP 配置。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`tests/guardian.test.js`、`project-guardian.config.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`零基础超简单入门.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：支 MCP  AI IDE 可以直接调用本地 Guardian 命令，如果不提供项目级工具限制，公开仓库或多人协作环境中更容易误调用写入类工具。
- 技术说明：默认配置保留原有全部 MCP 工具；开启动只读后隐藏并阻 `guardian_update`、`guardian_decision_add`  `guardian_handover`；配 `allowedTools` 后只暴露指定工具；MCP 模块仍通过子进程复用现 CLI 逻辑。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`  MCP 只读冒烟测试；新增 MCP 只读模式、工具允许列表和 MCP 配置校验回归测试。
- 风险：MCP 当前仍不做身份认证或逐次审批；权限限制是项目配置层面的工具过滤，真实 IDE 接入后仍要依赖仓库权限、Git 权限、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确 MCP 权限代码、文档、测试和记忆文件一起提交。

### 2026-06-02 00:00 - 准备软著申请材料。

- 用户需求：先不修改核心代码， `docs/ip/` 下写好软著申请需要的文档材料，并通过 Git 忽略该目录，避免上传 Gitee。
- AI 总结：新增本地软著材料包，包含申请信息准备表、软件说明书、提交前清单、源程序鉴别材料整理指南、质量报告和目录说明；新增`.gitignore` 规则忽略 `docs/ip/`；同步项目记忆说明本轮变更。
- 变更文件：`.gitignore`、`docs/ip/README.md`、`docs/ip/SOFT_COPYRIGHT_APPLICATION_INFO.md`、`docs/ip/SOFT_COPYRIGHT_MANUAL.md`、`docs/ip/SOFT_COPYRIGHT_CHECKLIST.md`、`docs/ip/SOURCE_CODE_MATERIAL_GUIDE.md`、`docs/ip/QUALITY_REPORT.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：软著申请需要标准化申请表信息、文档鉴别材料、源程序材料整理口径和质量记录；这些材料包含申请主体和权属信息，默认不应提交到公开 Gitee 仓库。
- 技术说明：本轮不修 Project Guardian 核心 CLI、模板、测试或运行逻辑；`.gitignore` 增加 `docs/ip/` 后，该目录在本地可用但不会作 Git 未跟踪文件出现。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`  `git check-ignore -v docs\ip\README.md docs\ip\SOFT_COPYRIGHT_MANUAL.md` 6 个测试通过，审计结 0 个漏洞，`docs/ip/` 已确认被 `.gitignore` 忽略。
- 风险：申请主体、版本号、开发完成日期、首次发表日期和权属方式必须由人工确认；文档中的“待填写”字段正式提交前必须补齐。
- 敏感信息检查：未写入身份证号、手机号、生产密码、真实 token、私钥或客户隐私数据；`docs/ip/` 已被 Git 忽略。
- 下一步：人工填写申请信息，并在正式提交前根据中国版权保护中心登记系统或代理机构的最新要求复核材料。

### 2026-05-28 00:00 - 新增 MCP 工具入口

- 用户需求：继续完善当前插件的功能。
- AI 总结：新增`guardian mcp` stdio MCP server，不引入第三方依赖，通过 MCP 暴露 `guardian_query`、`guardian_update`、`guardian_decision_add`、`guardian_verify`、`guardian_doctor`、`guardian_scan_secrets`、`guardian_handover`、`guardian_conflicts`  `guardian_adapters_doctor`；补 MCP 文档、测试、文件总览和项目记忆。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`零基础超简单入门.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：规则文件只能提 AI 阅读项目记忆，MCP 可以让支 MCP  AI IDE 直接调用查询、更新、验证和决策记录工具，减少手工切换终端的摩擦。
- 技术说明：MCP server 使用 stdio JSON-RPC，主 CLI 只增 `mcp` 分发，具体工具定义和 CLI 子命令映射放 `scripts/lib/mcp.js`。工具调用通过子进程执行既 Guardian 命令，避免重复实现业务逻辑。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和真 stdio MCP 冒烟测试；新增 MCP initialize、tools/list  `guardian_query` 回归测试。
- 风险：当 MCP 尚无工具限制，接入后能执行本 Guardian 命令 026-06-02 已新增`mcp.readOnly`  `mcp.allowedTools` 缓解误调用风险，但仍需依赖本地仓库权限、Git 权限、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认新增 MCP 文件、测试、文档和记忆文件一起提交。

### 2026-05-15 00:00 - 完整审查启动、适配和环境说。

- 用户需求：全面检测代码是否正确、文档是否更新最新内容、用户如何启动和适配、是否有大变化、环境要求，以及是否存在漏洞、缺点或小风险，并一并修复。
- AI 总结：复核全局 CLI 初始化业务项目时 `package.json` scripts 已使用可移植命令；优化结构化决策缺省文案，避免被误解为未完成项；新增 `package-lock.json`  `npm audit` 可重复运行；零基础教程、文件说明和项目记忆补充环境要求、启动方式、VS Code tasks 前提、当前限制和风险说明。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/continue-rule.md`、`plugins/project-guardian/assets/templates/zh-CN/continue-rule.md`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`package-lock.json`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：Project Guardian 需要在全局 CLI、源码内置和 IDE 适配场景下都能被新人正确启动，不能把某台机器的安装路径写进可提交配置。
- 技术说明：`addPackageScripts` 会判 CLI 脚本是否在目标项目内部；在项目内部时保留本地脚本路径，在外部安装场景下写 `guardian ...`。结构化决策缺少可选字段时使用“暂无记录”，避免被误解为未完成项。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、旧路径/过期表述扫描和临时目录冒烟测试。
- 风险：VS Code tasks 仍默认依 `guardian` 已在 PATH 中；如果团队只复制插件源码，需要使用本地脚本路径或调整 tasks 命令。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确 `package-lock.json` 和本次记忆更新一并提交。

### 2026-05-15 00:00 - 扩展 AI IDE 适配。

- 用户需求：核实 Project Guardian 可以被哪 AI IDE 调用，做更多兼容和适配，并全面审查是否有遗漏。
- AI 总结：新增`windsurf`、`cline`、`continue`、`claude`、`gemini`、`vscode` 适配器和 `vscode-copilot` 别名；新增`guardian adapters doctor`；VS Code 生成 `.vscode/tasks.json`；适配器模板按 `project-guardian.config.json` 注入真实记忆路径；README 和插件文档新增 AI IDE 支持矩阵。
- 变更文件：`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：Project Guardian 应作为跨 IDE 的项目记忆工作流，而不是只绑定 Codex；团队需要知道当前项目到底安装了哪些 AI 工具规则。
- 技术说明：CLI 仍是最稳定通用层。规则文件适配器只生成提示和任务文件，不默认生成所 IDE 配置；已有同名文件仍会保留。`renderTemplate` 会把模板里的默认 `memory/...` 替换为项目配置中的真实路径。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js adapters doctor`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd pack --dry-run` 和临时目录适配器冒烟测试。
- 风险：各 IDE 的规则文件格式可能演进；VS Code 当前通过 tasks + Copilot instructions，不是原生扩展；MCP Server 已在 2026-05-28 变更中实现，但仍需要真 IDE 联调反馈。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续优先评估 MCP prompts/resources、权限细化，再考虑原生 VS Code  JetBrains 插件。

### 2026-05-15 00:00 - 迁移项目记忆memory 目录

- 用户需求：在根目录创建 `memory` 文件夹，把所有项目记忆迁移进去，避免根目录文件越来越多；同时修改 CLI 和相关代码，确保以后执行初始化不会再把核心记忆创建到根目录。
- AI 总结：将本仓库自举记忆迁移到 `memory/`，把默认 `memoryFiles` 配置改为 `memory/...`，同步项目配置、AI 规则、适配器模板、插件文档、零基础教程、文件总览和测试用例。
- 变更文件：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`memory/decisions/*`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、README、Project Guardian 文档 AI 规则模板。
- 业务原因：项目记忆集中在 `memory/` 后，根目录更清晰，新人也能一眼区分“项目代码、普通文档”和“AI 交接记忆”。
- 技术说明：`guardian init` 仍使用原模板文件名作为来源，但默认目标路径变 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`  `memory/HANDOVER.md`。现有显式配置仍被尊重，旧项目迁移时需要同步更新配置。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js doctor`、`node plugins/project-guardian/scripts/guardian.js validate-docs`、`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify` 和临时目录初始化冒烟测试。
- 风险：旧项目如果保留 `project-guardian.config.json`，CLI 会继续按旧配置写入根目录 `docs/`；这是为了避免自动覆盖团队已有配置。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：观察已有项目迁移反馈，必要时增加显式 `guardian migrate-memory` 命令。

### 2026-05-15 00:00 - 新增全仓库文件说明总览

- 用户需求：在根目录创建 `explain` 文件夹和一个 md 文件，把所有文档介绍写入文件，并且把除文档外的代码文件也写入介绍。
- AI 总结：新增`explain/PROJECT_FILES_EXPLANATION.md`，集中说明当前仓库目录结构、文档和规则文件、模板文件、代码配置资源测试文件，以及常见重复文件的区别和维护判断标准。
- 变更文件：`explain/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：第一次接触仓库的人需要一个总览文件，快速理解每个文件为什么存在、负责什么、什么时候需要更新。
- 技术说明：本次不修 CLI 代码、测试逻辑、模板或插件运行行为，只新增说明文档并同 Project Guardian 记忆。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd run lint`  `npm.cmd test`。
- 风险：该说明文档是当前文件清单的人工总览，后续仓库新增或删除文件时需要同步维护。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交前复查新增说明文档是否覆盖当前仓库文件，并在后续文件结构变化时更新它。

### 2026-05-15 00:00 - 将自举记忆切换为中文

- 用户需求： Project Guardian 本仓库自己的自举记忆切换成中文，不修改无关内容，只处理项目开始使用时需要读取的记忆文档。
- AI 总结：将根目录项目上下文、状态、决策、AI 变更日志和交接指南翻译为中文，保留原有命令、路径、日期、验证方式和风险含义。
- 变更文件：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`。
- 业务原因：插件默认语言已经是中文，本仓库自举记忆也应使用中文，方便中文团队和零基础接手者直接理解。
- 技术说明：本次不修 CLI 代码、测试、模板或插件功能，只更新 Project Guardian 自举记忆内容。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js validate-docs`、`node plugins/project-guardian/scripts/guardian.js verify`  `git diff --check`。
- 风险：翻译类修改可能改变表达习惯，但不应改变事实、路径或命令；后续审阅重点是确认语义一致。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续维护本仓库自举记忆时继续优先使用中文。

### 2026-05-15 00:00 - 增加中文优先语言支持

- 用户需求：解释为什么插件仍然显得英文偏重，增加中文适配，分析可能出现的 bug，并改进项目。
- AI 总结：新增`language` 配置并默认使用`zh-CN`，为记忆文件 AI 工具适配器新增中文模板，通过 `guardian init --language en` 保留英文初始化；文档校验现在同时接受中英文标题和字段；生成的 update、handover、decision 内容会按语言配置输出；补充中文初始化、英文初始化、中文文档、中文 query 和中文决策记录回归测试。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`plugins/project-guardian/assets/templates/zh-CN/`、`tests/guardian.test.js`、README、Project Guardian 文档、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`  `memory/HANDOVER.md`。
- 业务原因：目标团队主要使用中文，初次使用者不应先理解英文模板才能保存项目记忆。
- 技术说明：`guardian init --language en` 现在会把选中的配置传给适配器生成逻辑，避免英文项目收到中 `AGENTS.md`  Cursor/Copilot 规则。query 分词增加中文关键词对，便于本地查询匹配中文问题。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`git diff --check`、语言命令冒烟测试package dry-run。
- 风险：已有项目接入后应避免反复切 `language`，否则新生成的记忆记录可能中英混杂。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：推送到 Gitee 后，在干净机器上从 Gitee URL 安装，并测试 `guardian init`  `guardian init --language en`。

### 2026-05-14 15:20 - 增加可移 CLI 和 AI 工具适配。

- 用户需求：先解 CLI 易用性问题，再开发其 AI 工具的适配层，并保持文档同步。
- AI 总结：新package `bin` 入口，让工具可以作为 `guardian`  `project-guardian` 使用；新增`--version`；新增通用/Codex、Cursor  GitHub Copilot 的可配置适配器生成；新增测试验证适配器创建、保留、package 元数据和配置校验。
- 变更文件：`package.json`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/` 下的适配器模板、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 业务原因：团队不应记忆很长的相对 Node 路径；项目记忆工作流应适用 Cursor、Copilot、Codex 和通用 AI Agent，而不是绑定单一生态。
- 技术说明：`guardian init` 仍然创建核心记忆文件且不覆盖已有内容。`guardian install-adapters --adapter cursor,copilot` 只添 AI 规则文件，并保留同名已有文件。Git 安装源是 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、help/version 冒烟测试package dry-run。
- 风险：全局 CLI 使用依赖团队发布或从真实 npm/Git 源安装；Cursor  Copilot 改变规则约定时，需要复核适配器格式。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff 后， CLI、适配器层 Gitee 安装源变更提交到 Gitee。

### 2026-05-14 15:50 - 从主 CLI 中解耦适配器解析。

- 用户需求：分析目录结构，检查缺失或薄弱点，并对耦合度过高的地方做解耦或重构。
- AI 总结：把适配器解析、校验和模板映射 `guardian.js` 移动 `plugins/project-guardian/scripts/lib/adapters.js`。修复一个配置一致性问题：新的 `guardian init --adapter copilot` 以前会创 Copilot 规则，却仍写入默generic/Cursor 适配器配置。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/HANDOVER.md`  Project Guardian 文档。
- 业务原因：新增未 AI 工具适配器时，不应再编辑无关 CLI 工作流代码；自定义初始化后的新项目不应收到误导性的适配器健康检查。
- 技术说明：`package.json`，lint 现在检查新的适配器模块。新增回归测试验 `init --adapter copilot` 会把 `["copilot"]` 写入新的 `project-guardian.config.json` 并通过 `doctor`。
- 验证方式：最终完成 verify 循环前，`npm.cmd run lint`  `npm.cmd test` 已通过。
- 风险：`guardian.js` 仍然是最大文件，依旧同时包含文档、Git、校验、query 和安全逻辑；后续拆分应在本次适配器拆分稳定后小步进行。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续可以考虑把配置加校验或文档校验拆成独立模块。

### 2026-05-14 00:00 - 强化 Project Guardian 质量工作。

- 用户需求：按阶段改进路线一步一步完成，运行多轮测试，并在出现错误时立即修复。
- AI 总结：把 CLI 扩展为 verify 优先的工作流，新增可配置记忆路径、更严格文档校验、安全扫描、结构化决策、单独决策文件、合并冲突提示、非交互 query、更hook  CI 生成、自动化测试，以及仓库自举记忆。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`.gitignore`、`package.json`、`tests/guardian.test.js`、`plugins/project-guardian/assets/templates/` 下的模板、根目录记忆文件、根目录文档、插件文档，以及现在 Git 可见的插件元数据条目。
- 业务原因：插件必须从文档模板工具升级为能主动约束 AI 辅助开发团团队交接质量的工具。
- 技术说明：CLI 仍然是只依赖标准库的单个 Node.js 脚本。新增命令和检查可在本地、hooks  Gitee CI 中运行，不需要外部服务。
  ```text
  guardian verify = doctor + check + validate-docs + configured security scan
  ```
- 验证方式：代码和文档更新后，`npm.cmd run verify`、直接命令冒烟测试、`git diff --check`、JSON 解析检查和文档一致性扫描通过。
- 风险：更严格的校验规则在真实团队尝试部分文档化项目后可能需要调整。Windows 用户如果 `npm.ps1` 执行策略阻止，应优先 PowerShell 中使用`npm.cmd`。
- 敏感信息检查：未向记忆文件加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff，重新运行验证循环，并总结可提交到 Gitee 的变更集。

### 2026-07-12 08:11 - P0-P1 架构重构：提取 lib/shared.js 统一工具函数，提取 lib/validators.js 解除 config.js 循环依赖

- 用户需求：P0-P1 架构重构：提取 lib/shared.js 统一工具函数，提取 lib/validators.js 解除 config.js 循环依赖
- AI 总结：新建 `lib/shared.js` 统一 `readMaybe`/`writeFile`/`timestamp`/`fail`/`parseFlags`/`lines`/`unique`/`getCoreMemoryFiles`/`ensureInitialized` 等 11 个工具函数（原先在 3-6 个文件中各自复制）；新建 `lib/validators.js` 提取 `validateAdapters` 和 `validateMcpConfig`，解除 config.js 对 adapters.js 和 mcp.js 的直接函数依赖；更新 9 个模块引用 shared.js；修复 `shellQuoteText` 和 `briefFile` 处理 undefined 的预存问题。
- 变更文件：`explain/PROJECT_FILES_EXPLANATION.md`、`.gitignore`、`Run/lib/audit.js`、`Run/server.js`、`plugins/project-guardian/scripts/lib/shared.js`、`plugins/project-guardian/scripts/lib/validators.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`plugins/project-guardian/scripts/lib/decisions.js`、`plugins/project-guardian/scripts/lib/doc-validation.js`、`plugins/project-guardian/scripts/lib/git-utils.js`、`plugins/project-guardian/scripts/lib/handover.js`、`plugins/project-guardian/scripts/lib/reviews.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`package.json`
  - `Run/lib/audit.js`
  - `Run/public/app.js`
  - `Run/public/styles.css`
  - `Run/server.js`
  - `memory/AI_CHANGELOG.md`
  - `memory/DECISIONS.md`
  - `memory/STATE.md`
  - `memory/decisions/2026-06-03-run-command-catalog.md`
  - `memory/decisions/2026-06-03-run-visual-layer.md`
  - `memory/decisions/2026-06-04-cli-module-and-run-ops.md`
  - `memory/decisions/2026-06-04-run-command-catalog-module.md`
  - `memory/decisions/2026-06-08-ai-ide.md`
  - `memory/decisions/2026-06-08-hybrid-search-and-contributing.md`
  - `package.json`
  - `plugins/project-guardian/cmd/guardian-cmd.js`
  - `plugins/project-guardian/scripts/guardian.js`
  - `plugins/project-guardian/scripts/lib/adapters.js`
  - `plugins/project-guardian/scripts/lib/config.js`
  - `plugins/project-guardian/scripts/lib/decisions.js`
  - `plugins/project-guardian/scripts/lib/doc-validation.js`
  - `plugins/project-guardian/scripts/lib/git-utils.js`
  - `plugins/project-guardian/scripts/lib/handover.js`
  - `plugins/project-guardian/scripts/lib/knowledge.js`
  - `plugins/project-guardian/scripts/lib/mcp.js`
  - `plugins/project-guardian/scripts/lib/reviews.js`
  - `plugins/project-guardian/scripts/lib/security.js`
  - `tests/guardian.test.js`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-58-48-498-explore-yj1hs3.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-58-53-692-explore-racit6.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-20-109-explore-dft1se.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-37-830-explore-e352sw.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-44-107-explore-951za9.json`
  - `.codely-cli/settings.json`
  - `CHANGELOG.md`
  - `memory/decisions/2026-07-12-10.md`
  - `plugins/project-guardian/scripts/lib/shared.js`
  - `plugins/project-guardian/scripts/lib/validators.js`
- 变更行：N/A（新建文件和重构）
- 业务原因：解决架构分析中识别的工具函数重复、核心记忆文件列表不一致和循环依赖隐患。
- 技术说明：新建 `shared.js` 和 `validators.js`，更新 9 个模块引用。
  ```text
  Staged changes:
  {explaiw => explain}/PROJECT_FILES_EXPLANATION.md | 0
   1 file changed, 0 insertions(+), 0 deletions(-)
  
  Unstaged changes:
  .gitignore                                         |   6 +
   Run/lib/audit.js                                   |  30 +-
   Run/public/app.js                                  |   4 +-
   Run/public/styles.css                              |  69 +-
   Run/server.js                                      |  40 +-
   explain/PROJECT_FILES_EXPLANATION.md               | 216 +++---
   memory/AI_CHANGELOG.md                             | 768 +++++++++++----------
   memory/DECISIONS.md                                | 473 ++++++-------
   memory/STATE.md                                    | 176 ++---
   memory/decisions/2026-06-03-run-command-catalog.md |  28 +-
   memory/decisions/2026-06-03-run-visual-layer.md    |  24 +-
   .../decisions/2026-06-04-cli-module-and-run-ops.md |  24 +-
   .../2026-06-04-run-command-catalog-module.md       |  22 +-
   memory/decisions/2026-06-08-ai-ide.md              |   9 +
   .../2026-06-08-hybrid-search-and-contributing.md   |   9 +
   package.json                                       |   3 +-
   plugins/project-guardian/cmd/guardian-cmd.js       |  27 +
   plugins/project-guardian/scripts/guardian.js       |  90 +--
   plugins/project-guardian/scripts/lib/adapters.js   |   8 +-
   plugins/project-guardian/scripts/lib/config.js     |  20 +-
   plugins/project-guardian/scripts/lib/decisions.js  |  75 +-
   .../project-guardian/scripts/lib/doc-validation.js |   9 +-
   plugins/project-guardian/scripts/lib/git-utils.js  |  13 +-
   plugins/project-guardian/scripts/lib/handover.js   |  36 +-
   plugins/project-guardian/scripts/lib/knowledge.js  |  41 +-
   plugins/project-guardian/scripts/lib/mcp.js        |  16 +-
   plugins/project-guardian/scripts/lib/reviews.js    |  51 +-
   plugins/project-guardian/scripts/lib/security.js   |  25 +-
   tests/guardian.test.js                             | 160 ++++-
   29 files changed, 1260 insertions(+), 1212 deletions(-)
  ```
- 验证方式：已运行 `npm run lint`（全部通过）、`npm test`（84 个测试全部通过）。
- 风险：重构可能引入回归；需保持零依赖和 Windows 兼容；security.js 的 config.memory fallback 统一时需确保不破坏旧行为。
- 敏感信息检查：本次没有写入生产密码、真实 token、客户隐私或其它敏感数据。
- 下一步：按计划继续 P2（统一审计和密钥检测）和 P3（拆分 Run/server.js 和 knowledge.js 展示逻辑）。

### 2026-07-12 08:11 - 安全审计与质量修复：修复 Run Web UI CSRF、路径遍历、审计日志静默、MCP stdin 限制、UTF-8 截断、ReDoS 防护、guardian-cmd 参数校验、decisions.js 路径遍历、config 路径校验；重命名 explain 目录；新增 CHANGELOG.md；修复 shared.js 和 knowledge.js 多个问题；新增 12 个测试

- 用户需求：安全审计与质量修复：修复 Run Web UI CSRF、路径遍历、审计日志静默、MCP stdin 限制、UTF-8 截断、ReDoS 防护、guardian-cmd 参数校验、decisions.js 路径遍历、config 路径校验；重命名 explain 目录；新增 CHANGELOG.md；修复 shared.js 和 knowledge.js 多个问题；新增 12 个测试
- AI 总结：对全部源码进行深度安全审计，修复 Run Web UI CSRF 防护（Origin 头校验）、静态文件路径遍历、审计日志静默失败、MCP stdin 行长度限制、UTF-8 安全截断、安全扫描 ReDoS 防护、guardian-cmd passthrough 参数校验、decisions.js 日期路径遍历、config 路径安全校验；修复 shared.js 和 knowledge.js 多个代码质量问题；重命名 explain 目录；新增 CHANGELOG.md；新增 12 个测试。
- 变更文件：`Run/server.js`、`Run/lib/audit.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/lib/security.js`、`plugins/project-guardian/scripts/lib/knowledge.js`、`plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/decisions.js`、`plugins/project-guardian/scripts/lib/shared.js`、`plugins/project-guardian/cmd/guardian-cmd.js`、`tests/guardian.test.js`、`package.json`、`.gitignore`、`CHANGELOG.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`
  - `Run/public/app.js`
  - `Run/public/styles.css`
  - `Run/server.js`
  - `memory/AI_CHANGELOG.md`
  - `memory/DECISIONS.md`
  - `memory/STATE.md`
  - `memory/decisions/2026-06-03-run-command-catalog.md`
  - `memory/decisions/2026-06-03-run-visual-layer.md`
  - `memory/decisions/2026-06-04-cli-module-and-run-ops.md`
  - `memory/decisions/2026-06-04-run-command-catalog-module.md`
  - `memory/decisions/2026-06-08-ai-ide.md`
  - `memory/decisions/2026-06-08-hybrid-search-and-contributing.md`
  - `package.json`
  - `plugins/project-guardian/cmd/guardian-cmd.js`
  - `plugins/project-guardian/scripts/guardian.js`
  - `plugins/project-guardian/scripts/lib/adapters.js`
  - `plugins/project-guardian/scripts/lib/config.js`
  - `plugins/project-guardian/scripts/lib/decisions.js`
  - `plugins/project-guardian/scripts/lib/doc-validation.js`
  - `plugins/project-guardian/scripts/lib/git-utils.js`
  - `plugins/project-guardian/scripts/lib/handover.js`
  - `plugins/project-guardian/scripts/lib/knowledge.js`
  - `plugins/project-guardian/scripts/lib/mcp.js`
  - `plugins/project-guardian/scripts/lib/reviews.js`
  - `plugins/project-guardian/scripts/lib/security.js`
  - `tests/guardian.test.js`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-58-48-498-explore-yj1hs3.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-58-53-692-explore-racit6.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-20-109-explore-dft1se.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-37-830-explore-e352sw.json`
  - `.codely-cli/auto-saves/chat-auto-save-2026-07-12-07-59-44-107-explore-951za9.json`
  - `.codely-cli/settings.json`
  - `CHANGELOG.md`
  - `memory/decisions/2026-07-12-10.md`
  - `plugins/project-guardian/scripts/lib/shared.js`
  - `plugins/project-guardian/scripts/lib/validators.js`
- 变更行：N/A（新建文件和重构）
- 业务原因：解决架构分析中识别的工具函数重复、核心记忆文件列表不一致和循环依赖隐患。
- 技术说明：新建 `shared.js` 和 `validators.js`，更新 9 个模块引用。
  ```text
  Staged changes:
  {explaiw => explain}/PROJECT_FILES_EXPLANATION.md | 0
   1 file changed, 0 insertions(+), 0 deletions(-)
  
  Unstaged changes:
  .gitignore                                         |   6 +
   Run/lib/audit.js                                   |  30 +-
   Run/public/app.js                                  |   4 +-
   Run/public/styles.css                              |  69 +-
   Run/server.js                                      |  40 +-
   explain/PROJECT_FILES_EXPLANATION.md               | 216 +++---
   memory/AI_CHANGELOG.md                             | 858 ++++++++++++---------
   memory/DECISIONS.md                                | 473 ++++++------
   memory/STATE.md                                    | 239 +++---
   memory/decisions/2026-06-03-run-command-catalog.md |  28 +-
   memory/decisions/2026-06-03-run-visual-layer.md    |  24 +-
   .../decisions/2026-06-04-cli-module-and-run-ops.md |  24 +-
   .../2026-06-04-run-command-catalog-module.md       |  22 +-
   memory/decisions/2026-06-08-ai-ide.md              |   9 +
   .../2026-06-08-hybrid-search-and-contributing.md   |   9 +
   package.json                                       |   3 +-
   plugins/project-guardian/cmd/guardian-cmd.js       |  27 +
   plugins/project-guardian/scripts/guardian.js       |  90 +--
   plugins/project-guardian/scripts/lib/adapters.js   |   8 +-
   plugins/project-guardian/scripts/lib/config.js     |  20 +-
   plugins/project-guardian/scripts/lib/decisions.js  |  75 +-
   .../project-guardian/scripts/lib/doc-validation.js |   9 +-
   plugins/project-guardian/scripts/lib/git-utils.js  |  13 +-
   plugins/project-guardian/scripts/lib/handover.js   |  36 +-
   plugins/project-guardian/scripts/lib/knowledge.js  |  41 +-
   plugins/project-guardian/scripts/lib/mcp.js        |  16 +-
   plugins/project-guardian/scripts/lib/reviews.js    |  51 +-
   plugins/project-guardian/scripts/lib/security.js   |  25 +-
   tests/guardian.test.js                             | 160 +++-
   29 files changed, 1405 insertions(+), 1220 deletions(-)
  ```
- 验证方式：已运行 `npm run lint`（全部通过）、`npm test`（84 个测试全部通过）。
- 风险：重构可能引入回归；需保持零依赖和 Windows 兼容。
- 敏感信息检查：本次没有写入生产密码、真实 token、客户隐私或其它敏感数据。
- 下一步：按计划继续 P2（统一审计和密钥检测）和 P3（拆分 Run/server.js 和 knowledge.js 展示逻辑）。

### 2026-07-12 09:17 - P0-P3架构重构+安全统一+TOCTOU修复+i18n+migrate-memory+guardian-cmd白名单补充

- 用户需求：阅读项目全部记忆文件，整理所有遗留问题和待完善功能，一次性完成。
- AI 总结：按 P0-P3 优先级完成架构重构：P1 拆分 guardian.js（855→341行）为 init.js/check.js/hooks-ci.js/update.js，消除 validateMcpConfig 重复；P2 在 shared.js 统一密钥检测和脱敏函数（containsLikelySecret/redactLikelySecret），消除 3 套不一致正则和 2 处 redactLikelySecret 复制；P3 创建 guardian-bridge.js 解耦 Run 屄对插件内部模块的直接依赖，拆分 knowledge.js 为 knowledge.js + brief.js；修复 Run 审计日志 TOCTOU 竞态（添加重入保护）；新增 i18n 消息机制（messages.js）；新增 guardian migrate-memory 命令；补充 guardian-cmd 白名单（git-branch、git-stash）；新增 6 个测试覆盖密钥检测、大文件、审计重入等场景；修复 containsLikelySecret 的 lastIndex bug。
- 变更文件：`guardian.js`、`lib/init.js`、`lib/check.js`、`lib/hooks-ci.js`、`lib/update.js`、`lib/brief.js`、`lib/messages.js`、`lib/migrate.js`、`lib/shared.js`、`lib/validators.js`、`lib/config.js`、`lib/knowledge.js`、`lib/security.js`、`lib/manual-memory.js`、`lib/mcp.js`、`cmd/guardian-cmd.js`、`Run/lib/audit.js`、`Run/lib/commands.js`、`Run/lib/guardian-bridge.js`、`Run/server.js`、`tests/guardian.test.js`、`package.json`
- 业务原因：项目已过多轮功能迭代，架构耦合度问题（工具函数重复、循环依赖、Run 屄直接依赖插件内部模块）影响可维护性和后续扩展；密钥检测不一致导致安全风险；TOCTOU 竞态可能导致审计日志 hash 链断裂；i18n 和 migrate-memory 是 STATE.md 中记录的下一步功能。
- 技术说明：P1 拆分保持所有函数行为不变，仅移动代码位置；P2 统一密钥检测时保留 security.js 的高熵检测和 manual-memory.js 的中文关键词；P3 的 guardian-bridge.js 是纯转发层无性能开销；TOCTOU 修复使用同步重入标志而非异步队列，因为 Node.js 单线程模型下同步代码块本身是原子的；i18n 的 t() 函数支持 {0} 占位符参数替换。
- 验证方式：已运行 `npm run lint`（全部通过）、`npm test`（90 个测试全部通过）。
- 风险：guardian.js 拆分后路由逻辑更清晰但文件结构有变化，团队成员需了解新模块位置；i18n 目前只迁移了 verify 命令的输出，后续可逐步迁移其他命令；migrate-memory 会移动文件，使用前应先备份。
- 敏感信息检查：本次没有写入生产密码、真实 token、私钥、客户隐私或其它敏感数据。
- 下一步：提交前运行 `guardian verify` 确认记忆质量检查通过；后续可继续向 i18n 迁移更多命令输出。
