# AI 变更日志

本文件记录应在聊天会话之外长期保留的 AI 协助开发上下文。

## 2026 记录

### 2026-06-03 11:46 - 新增 Run 可视化运行层

- 用户需求：创建 `Run/` 文件夹，在其中实现用户可自行部署的网页或窗口可视化功能，隔离可视化内容和插件本体，但仍作为插件的一部分维护。
- AI 总结：新增 `Run/` 可选本地 Web 控制台，包含无第三方依赖的 Node.js HTTP server、静态页面、样式和浏览器交互；默认监听 `127.0.0.1`，通过只读白名单调用现有 Project Guardian CLI。
- 变更文件：`Run/server.js`、`Run/public/index.html`、`Run/public/styles.css`、`Run/public/app.js`、`Run/README.md`、`package.json`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/decisions/2026-06-03-run-visual-layer.md`。
- 业务原因：完全依赖命令行会增加零基础用户和非技术管理者的使用门槛；可视化层可以降低查看状态、运行检查、生成 brief 和查询项目知识的成本，同时保持核心 CLI/MCP 稳定。
- 技术说明：`Run/server.js` 不使用 shell 拼接命令，而是通过固定参数调用 Node.js 和 `guardian.js`；`/api/command` 只允许只读命令，`brief` 和 `query` 限制问题长度和返回数量；`package.json` 增加 `npm run ui` 并把 `Run` 纳入发布范围。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和 `node Run/server.js --help`；新增 Run API 回归测试覆盖状态接口、写入命令拒绝和 `brief --mode full` 调用，当前 48 个测试通过，审计 0 漏洞。`npm.cmd pack --dry-run` 普通运行因 npm 缓存目录权限失败，提权重跑被当前环境审批/用量限制拦截，需用户本机补跑确认发布包。
- 风险：当前 Web UI 没有登录鉴权，不能直接暴露公网；默认只读，后续如果增加写入能力，必须先做确认、预览和审计。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实使用后评估是否增加复审日历、记忆只读预览、写入确认流程或桌面窗口包装。

### 2026-06-03 11:11 - 修复按需读取误判风险

- 用户需求：修复 token 按需读取机制的风险，避免 Agent 因为限制只读部分记忆而漏掉需要全量上下文的情况。
- AI 总结：为 `guardian brief` 增加 `--mode auto|quick|deep|full`；`quick` 只读核心两份，`deep` 强制包含决策和 AI 变更日志，`full` 读取全部核心记忆；MCP `guardian_brief` 新增 `mode` 参数并严格校验；CLI 输出增加升级触发条件，强调按需读取不是硬限制。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`AGENTS.md`、AI 规则模板、Project Guardian 文档、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：按需读取能节省 token，但如果 Agent 把它误解成硬限制，可能在 bug、回归、历史不清楚或高风险模块中漏读 `AI_CHANGELOG.md`、`DECISIONS.md` 或 `HANDOVER.md`。
- 技术说明：`brief` 默认仍是 `auto`，但支持手动指定 `quick`、`deep`、`full`；无效或缺失的 `--mode` 值会失败；MCP schema 通过 enum 限制 mode；模板和文档同步写明升级规则。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian brief "普通小改动" --mode quick --limit 2`、`guardian brief "修复登录回归" --mode deep --limit 2` 和 `guardian brief "新人接手" --mode full --limit 2`；当前 47 个测试通过，审计 0 漏洞，发布 dry-run 包含 CLI、MCP、规则模板、Skill 和文档。
- 风险：`deep` 和 `full` 会增加 token 消耗；但这是高风险任务下有意付出的上下文成本。后续如果核心记忆继续变大，可增加短摘要或 MCP resources。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实 AI IDE 接入后观察是否正确使用 `mode`，必要时增加配置化默认模式或按目录自动升级。

### 2026-06-03 10:32 - 建立 token 预算读取机制

- 用户需求：为 Project Guardian 设计并实现 token 消耗控制方案，让 Agent 只读取正确、关键、必要的记忆内容；可以通过 skill 或工具按需读取文件，减少每次对话成本，同时不影响现有功能和安全规则。
- AI 总结：新增 `guardian brief` 和 MCP `guardian_brief`，在读取大型记忆文件前输出预算友好的读取计划、必读文件、按需文件、建议 `query --limit` 和粗略 token 估算；AI 规则模板、Project Guardian skill、VS Code tasks 和主要文档已同步改为“先 brief、再核心记忆、历史文件按需读取”。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`AGENTS.md`、`plugins/project-guardian/assets/templates/*`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 业务原因：项目记忆越完整，AI 每轮全量读取的成本越高；先用读取计划和查询片段控制上下文，可以保留交接价值，同时降低小任务、日常答疑和新人接手时的 token 消耗。
- 技术说明：`brief` 根据配置中的记忆路径读取核心文件大小，估算 token，按关键词把问题路由到决策、变更日志或交接文件；MCP 新增只读工具 `guardian_brief`；`guardian query --limit` 与 MCP `guardian_query.limit` 继续作为片段数量控制层。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian brief "token 成本控制" --limit 2` 和 `guardian brief "新人接手" --limit 2`；当前 45 个测试通过，审计 0 漏洞，发布 dry-run 包含 CLI、MCP、模板、Skill 和文档。
- 风险：token 估算是近似值，不等同于模型 tokenizer；关键词路由不是语义检索；如果 `PROJECT_CONTEXT` 或 `STATE` 继续变大，后续可能还需要短摘要文件、MCP resources 或向量检索。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：真实 AI IDE 接入后观察是否仍有全量读取倾向，必要时增加更短的摘要层、分页查询或缓存片段。

### 2026-06-02 18:32 - 强化 MCP 参数校验与查询限量

- 用户需求：继续完善 MCP，多轮测试，发现问题与风险就继续修复；完成后再分析 token 成本和优化方案。
- AI 总结：MCP server 启动时会强校验 `mcp.readOnly` 和 `mcp.allowedTools`，配置写错会拒绝启动；MCP 工具调用会按 schema 拒绝多余参数、错误类型和越界 `limit`；`guardian query` 和 MCP `guardian_query` 新增 `limit`，可把查询返回片段控制在 1 到 10 个。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/*`。
- 业务原因：MCP 接入 AI IDE 后，如果配置写错或参数被静默忽略，可能导致写入工具意外开放或查询结果过长；强校验和查询限量能降低误操作风险和 token 成本。
- 技术说明：`scripts/lib/mcp.js` 新增 MCP 配置 normalize/validate 和工具参数 schema 校验；`guardian.js` 复用同一套 MCP 配置校验，并让 `query` 支持 `--limit`；MCP `guardian_query` 会把数字 `limit` 映射为 CLI `--limit`。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`guardian query MCP --limit 1`、`guardian query MCP --limit 11` 和 `guardian query MCP --limit 2`；当前 43 个测试通过，新增 MCP 环境只读、MCP 参数校验、MCP 配置启动失败、MCP query limit 和 CLI query limit 回归测试。`npm.cmd pack --dry-run` 因沙箱外部权限用量限制未能在本轮重跑。
- 风险：MCP 仍不做身份认证或逐次审批；`limit` 只能控制输出片段数量，不能替代语义检索或更精细的摘要压缩。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 后，真实 MCP 客户端接入时观察默认 limit、分页查询、摘要模式或 MCP prompts/resources 的需求。

### 2026-06-02 18:11 - 建立决策复审检测机制

- 用户需求：完善复审功能，要求修改功能后能判断是否有问题、是否需要记录与复审；需要复审时创建复审文件并记录内容；到复审时间后由 AI 或人工检测，复审完成后标记正常，后续无需继续复审。
- AI 总结：新增 `guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`；`guardian verify` 会检测 `memory/decisions/*.md` 中到期未完成的决策复审并失败；复审完成会在对应决策文件追加复审结果，标记正常和无需继续复审；MCP 增加 `guardian_reviews_due` 与 `guardian_review_complete`。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/HANDOVER.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：复审时间如果只写在决策文件中，团队容易忘记检查临时方案、安全权限、质量闸门或兼容策略；把复审纳入 `verify` 后，AI 和人工都能在提交前发现到期事项。
- 技术说明：复审扫描只读取 `memory/decisions/*.md`，解析 `Review after` 或 `复审时间` 中的 `YYYY-MM-DD`；到期且没有完成标记时失败；`guardian reviews complete` 会追加复审状态、完成时间、复审人、结论、验证方式和“无需继续复审”。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、`guardian reviews` 和 `guardian reviews due`；新增到期复审阻塞 verify、完成复审后恢复通过、MCP 只读隐藏写入工具和 package script 的回归测试。
- 风险：复审检测依赖标准字段格式；如果团队手工改坏字段名或日期格式，可能需要人工修正文档或后续增强解析规则。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 后，观察真实团队是否需要复审责任人配置、交互式复审表单或复审历史列表。

### 2026-06-02 17:56 - 生成 Word 版软著申请材料包

- 用户需求：在 `docs/ip/` 文件夹下创建一个 Word 文档，并写入软著申请需要的材料内容。
- AI 总结：新增 `docs/ip/Project_Guardian_软著申请材料包.docx`，把官方材料要求摘要、申请表信息准备、著作权人证明、软件说明书内容、源程序鉴别材料建议、文档鉴别材料建议、提交前清单、当前质量记录和人工确认事项整理成 Word 版材料包。
- 变更文件：`docs/ip/Project_Guardian_软著申请材料包.docx`、`docs/ip/QUALITY_REPORT.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：软著申请通常需要申请表、软件鉴别材料和相关证明文件；Word 材料包方便人工补齐申请主体、版本、开发完成日期、首次发表日期和权属信息，并用于后续打印、转 PDF 或交给代理机构复核。
- 技术说明：Word 文档使用 Word OpenXML 结构生成，包含 `[Content_Types].xml`、`word/document.xml`、`word/styles.xml` 和 relationships 文件；文件位于已忽略的 `docs/ip/` 下，不会上传到 Gitee。
- 验证方式：已运行 `git check-ignore -v docs\ip\Project_Guardian_软著申请材料包.docx`，确认 Word 文档命中 `.gitignore`；已检查 `.docx` 压缩包结构，确认包含核心 Word 文件。
- 风险：Word 文档中的申请主体、版本、完成日期、首次发表日期和权属方式仍需人工确认；正式提交前应以中国版权保护中心登记系统、政务服务事项说明或代理机构最新要求为准。
- 敏感信息检查：未写入身份证号、手机号、生产密码、真实 token、私钥或客户隐私数据。
- 下一步：打开 Word 文档补齐人工确认字段，并按最终版本同步申请表、说明书和源程序页眉。

### 2026-06-02 17:51 - 修复 AI 变更日志时间精度校验

- 用户需求：`AI_CHANGELOG.md` 的记录时间不精确，后续不能继续全部写成 `00:00`；旧记录如果无法修正可以不管。
- AI 总结：确认当前 `timestamp()` 已按本地真实小时分钟生成时间；新增质量闸门，`validate-docs` 只检查最新一条 changelog，如果标题时间仍是 `00:00` 就失败；同时修复 `latestChangelogText` 误取最旧记录的问题，确保最新记录按文件顶部第一条判断。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/STANDARD.md`、`plugins/project-guardian/docs/WORKFLOW.md`、`零基础超简单入门.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`、`memory/DECISIONS.md`。
- 业务原因：AI 交接记录需要能追踪真实发生时间；大量 `00:00` 会让后续接手者无法判断修改先后和实际节奏。
- 技术说明：新增 `hasMidnightTimestamp` 校验最新 changelog 标题；`latestChangelogText` 改为取第一条 `###` 记录到下一条记录之前，符合当前“新记录在最前面”的文档习惯；旧历史中的 `00:00` 不触发校验。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test` 和 `npm.cmd run verify`；新增 `validate-docs` 拒绝最新 `00:00` 和检查文件顶部最新记录的回归测试，当前 38 个测试通过。
- 风险：如果有人真的在 00:00 整点生成记录，校验也会要求人工改成更精确或可区分的时间；这是为了避免占位时间继续扩散。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认时间精度修复、MCP 权限修复、文档、测试和记忆文件一起提交。

### 2026-06-02 00:00 - 修复 MCP 工具调用权限风险

- 用户需求：修复问题与风险。
- AI 总结：为 `guardian mcp` 新增配置化工具权限控制，支持 `mcp.readOnly`、`mcp.allowedTools` 和 `PROJECT_GUARDIAN_MCP_READ_ONLY=1`；MCP 工具列表会按配置隐藏不可用工具，工具调用会阻止被禁用命令执行；`doctor` 会校验错误 MCP 配置。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/skills/project-guardian/SKILL.md`、`tests/guardian.test.js`、`project-guardian.config.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`零基础超简单入门.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：支持 MCP 的 AI IDE 可以直接调用本地 Guardian 命令，如果不提供项目级工具限制，公开仓库或多人协作环境中更容易误调用写入类工具。
- 技术说明：默认配置保留原有全部 MCP 工具；开启只读后隐藏并阻止 `guardian_update`、`guardian_decision_add` 和 `guardian_handover`；配置 `allowedTools` 后只暴露指定工具；MCP 模块仍通过子进程复用现有 CLI 逻辑。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和 MCP 只读冒烟测试；新增 MCP 只读模式、工具允许列表和 MCP 配置校验回归测试。
- 风险：MCP 当前仍不做身份认证或逐次审批；权限限制是项目配置层面的工具过滤，真实 IDE 接入后仍要依赖仓库权限、Git 权限、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认 MCP 权限代码、文档、测试和记忆文件一起提交。

### 2026-06-02 00:00 - 准备软著申请材料包

- 用户需求：先不改核心代码，在 `docs/ip/` 下写好软著申请需要的文档材料，并通过 Git 忽略该目录，避免上传到 Gitee。
- AI 总结：新增本地软著材料包，包含申请信息准备表、软件说明书、提交前清单、源程序鉴别材料整理指南、质量报告和目录说明；新增 `.gitignore` 规则忽略 `docs/ip/`；同步项目记忆说明本轮变更。
- 变更文件：`.gitignore`、`docs/ip/README.md`、`docs/ip/SOFT_COPYRIGHT_APPLICATION_INFO.md`、`docs/ip/SOFT_COPYRIGHT_MANUAL.md`、`docs/ip/SOFT_COPYRIGHT_CHECKLIST.md`、`docs/ip/SOURCE_CODE_MATERIAL_GUIDE.md`、`docs/ip/QUALITY_REPORT.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：软著申请需要标准化申请表信息、文档鉴别材料、源程序材料整理口径和质量记录；这些材料包含申请主体和权属信息，默认不应提交到公开 Gitee 仓库。
- 技术说明：本轮不修改 Project Guardian 核心 CLI、模板、测试或运行逻辑；`.gitignore` 增加 `docs/ip/` 后，该目录在本地可用但不会作为 Git 未跟踪文件出现。
- 验证方式：已运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check` 和 `git check-ignore -v docs\ip\README.md docs\ip\SOFT_COPYRIGHT_MANUAL.md`；36 个测试通过，审计结果 0 个漏洞，`docs/ip/` 已确认被 `.gitignore` 忽略。
- 风险：申请主体、版本号、开发完成日期、首次发表日期和权属方式必须由人工确认；文档中的“待填写”字段正式提交前必须补齐。
- 敏感信息检查：未写入身份证号、手机号、生产密码、真实 token、私钥或客户隐私数据；`docs/ip/` 已被 Git 忽略。
- 下一步：人工填写申请信息，并在正式提交前根据中国版权保护中心登记系统或代理机构的最新要求复核材料。

### 2026-05-28 00:00 - 新增 MCP 工具入口

- 用户需求：继续完善当前插件的功能。
- AI 总结：新增 `guardian mcp` stdio MCP server，不引入第三方依赖，通过 MCP 暴露 `guardian_query`、`guardian_update`、`guardian_decision_add`、`guardian_verify`、`guardian_doctor`、`guardian_scan_secrets`、`guardian_handover`、`guardian_conflicts` 和 `guardian_adapters_doctor`；补充 MCP 文档、测试、文件总览和项目记忆。
- 变更文件：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`零基础超简单入门.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：规则文件只能提醒 AI 阅读项目记忆，MCP 可以让支持 MCP 的 AI IDE 直接调用查询、更新、验证和决策记录工具，减少手工切换终端的摩擦。
- 技术说明：MCP server 使用 stdio JSON-RPC，主 CLI 只增加 `mcp` 分发，具体工具定义和 CLI 子命令映射放在 `scripts/lib/mcp.js`。工具调用通过子进程执行既有 Guardian 命令，避免重复实现业务逻辑。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run` 和真实 stdio MCP 冒烟测试；新增 MCP initialize、tools/list 和 `guardian_query` 回归测试。
- 风险：当时 MCP 尚无工具限制，接入后能执行本地 Guardian 命令；2026-06-02 已新增 `mcp.readOnly` 和 `mcp.allowedTools` 缓解误调用风险，但仍需依赖本地仓库权限、Git 权限、代码评审和 `guardian verify`。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认新增 MCP 文件、测试、文档和记忆文件一起提交。

### 2026-05-15 00:00 - 完整审查启动、适配和环境说明

- 用户需求：全面检测代码是否正确、文档是否更新最新内容、用户如何启动和适配、是否有大变化、环境要求，以及是否存在漏洞、缺点或小风险，并一并修复。
- AI 总结：复核全局 CLI 初始化业务项目时的 `package.json` scripts 已使用可移植命令；优化结构化决策缺省文案，避免被误解为未完成项；新增 `package-lock.json` 让 `npm audit` 可重复运行；零基础教程、文件说明和项目记忆补充环境要求、启动方式、VS Code tasks 前提、当前限制和风险说明。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/continue-rule.md`、`plugins/project-guardian/assets/templates/zh-CN/continue-rule.md`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`package-lock.json`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：Project Guardian 需要在全局 CLI、源码内置和多 IDE 适配场景下都能被新人正确启动，不能把某台机器的安装路径写进可提交配置。
- 技术说明：`addPackageScripts` 会判断 CLI 脚本是否在目标项目内部；在项目内部时保留本地脚本路径，在外部安装场景下写入 `guardian ...`。结构化决策缺少可选字段时使用“暂无记录”，避免被误解为未完成项。
- 验证方式：已运行 `npm.cmd run verify`、`npm.cmd audit --audit-level=moderate`、`git diff --check`、`npm.cmd pack --dry-run`、旧路径/过期表述扫描和临时目录冒烟测试。
- 风险：VS Code tasks 仍默认依赖 `guardian` 已在 PATH 中；如果团队只复制插件源码，需要使用本地脚本路径或调整 tasks 命令。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交到 Gitee 前复查 `git status`，确认 `package-lock.json` 和本次记忆更新一并提交。

### 2026-05-15 00:00 - 扩展 AI IDE 适配器

- 用户需求：核实 Project Guardian 可以被哪些 AI IDE 调用，做更多兼容和适配，并全面审查是否有遗漏。
- AI 总结：新增 `windsurf`、`cline`、`continue`、`claude`、`gemini`、`vscode` 适配器和 `vscode-copilot` 别名；新增 `guardian adapters doctor`；VS Code 生成 `.vscode/tasks.json`；适配器模板按 `project-guardian.config.json` 注入真实记忆路径；README 和插件文档新增 AI IDE 支持矩阵。
- 变更文件：`plugins/project-guardian/scripts/lib/adapters.js`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/*`、`tests/guardian.test.js`、`README.md`、`plugins/project-guardian/docs/CLI_AND_CI.md`、`plugins/project-guardian/docs/INTEGRATION.md`、`plugins/project-guardian/docs/STANDARD.md`、`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/DECISIONS.md`。
- 业务原因：Project Guardian 应作为跨 IDE 的项目记忆工作流，而不是只绑定 Codex；团队需要知道当前项目到底安装了哪些 AI 工具规则。
- 技术说明：CLI 仍是最稳定通用层。规则文件适配器只生成提示和任务文件，不默认生成所有 IDE 配置；已有同名文件仍会保留。`renderTemplate` 会把模板里的默认 `memory/...` 替换为项目配置中的真实路径。
- 验证方式：运行 `npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js adapters doctor`、`node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd pack --dry-run` 和临时目录适配器冒烟测试。
- 风险：各 IDE 的规则文件格式可能演进；VS Code 当前是 tasks + Copilot instructions，不是原生扩展；MCP Server 已在 2026-05-28 变更中实现，但仍需要真实 IDE 联调反馈。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续优先评估 MCP prompts/resources、权限细化，再考虑原生 VS Code 或 JetBrains 插件。

### 2026-05-15 00:00 - 迁移项目记忆到 memory 目录

- 用户需求：在根目录创建 `memory` 文件夹，把所有项目记忆迁移进去，避免根目录文件越来越多；同时修改 CLI 和相关代码，确保以后执行初始化不会再把核心记忆创建到根目录。
- AI 总结：将本仓库自举记忆迁移到 `memory/`，把默认 `memoryFiles` 配置改为 `memory/...`，同步项目配置、AI 规则、适配器模板、插件文档、零基础教程、文件总览和测试用例。
- 变更文件：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`、`memory/decisions/*`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、README、Project Guardian 文档和 AI 规则模板。
- 业务原因：项目记忆集中在 `memory/` 后，根目录更清晰，新人也能一眼区分“项目代码/普通文档”和“AI 交接记忆”。
- 技术说明：`guardian init` 仍使用原模板文件名作为来源，但默认目标路径变为 `memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md` 和 `memory/HANDOVER.md`。现有显式配置仍被尊重，旧项目迁移时需要同步更新配置。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js doctor`、`node plugins/project-guardian/scripts/guardian.js validate-docs`、`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify` 和临时目录初始化冒烟测试。
- 风险：旧项目如果保留旧 `project-guardian.config.json`，CLI 会继续按旧配置写入根目录和 `docs/`；这是为了避免自动覆盖团队已有配置。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：观察已有项目迁移反馈，必要时增加显式 `guardian migrate-memory` 命令。

### 2026-05-15 00:00 - 新增全仓库文件说明总览

- 用户需求：在根目录创建 `explaiw` 文件夹和一个 md 文件，把所有文档介绍写入文件，并且把除文档外的代码文件也写入介绍。
- AI 总结：新增 `explaiw/PROJECT_FILES_EXPLANATION.md`，集中说明当前仓库目录结构、文档和规则文件、模板文件、代码配置资源测试文件，以及常见重复文件的区别和维护判断标准。
- 变更文件：`explaiw/PROJECT_FILES_EXPLANATION.md`、`memory/STATE.md`、`memory/AI_CHANGELOG.md`。
- 业务原因：第一次接触仓库的人需要一个总览文件，快速理解每个文件为什么存在、负责什么、什么时候需要更新。
- 技术说明：本次不修改 CLI 代码、测试逻辑、模板或插件运行行为，只新增说明文档并同步 Project Guardian 记忆。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js verify`、`npm.cmd run lint` 和 `npm.cmd test`。
- 风险：该说明文档是当前文件清单的人工总览，后续仓库新增或删除文件时需要同步维护。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：提交前复查新增说明文档是否覆盖当前仓库文件，并在后续文件结构变化时更新它。

### 2026-05-15 00:00 - 将自举记忆切换为中文

- 用户需求：把 Project Guardian 本仓库自己的自举记忆切换成中文，不修改无关内容，只处理项目开始使用时需要读取的记忆文档。
- AI 总结：将根目录项目上下文、状态、决策、AI 变更日志和交接指南翻译为中文，保留原有命令、路径、日期、验证方式和风险含义。
- 变更文件：`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/AI_CHANGELOG.md`、`memory/HANDOVER.md`。
- 业务原因：插件默认语言已经是中文，本仓库自举记忆也应使用中文，方便中文团队和零基础接手者直接理解。
- 技术说明：本次不修改 CLI 代码、测试、模板或插件功能，只更新 Project Guardian 自举记忆内容。
- 验证方式：运行 `node plugins/project-guardian/scripts/guardian.js validate-docs`、`node plugins/project-guardian/scripts/guardian.js verify` 和 `git diff --check`。
- 风险：翻译类修改可能改变表达习惯，但不应改变事实、路径或命令；后续审阅重点是确认语义一致。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续维护本仓库自举记忆时继续优先使用中文。

### 2026-05-15 00:00 - 增加中文优先语言支持

- 用户需求：解释为什么插件仍然显得英文偏重，增加中文适配，分析可能出现的 bug，并改进项目。
- AI 总结：新增 `language` 配置并默认使用 `zh-CN`，为记忆文件和 AI 工具适配器新增中文模板，通过 `guardian init --language en` 保留英文初始化；文档校验现在同时接受中英文标题和字段；生成的 update、handover、decision 内容会按语言配置输出；补充中文初始化、英文初始化、中文文档、中文 query 和中文决策记录回归测试。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`project-guardian.config.json`、`plugins/project-guardian/assets/templates/zh-CN/`、`tests/guardian.test.js`、README、Project Guardian 文档、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md` 和 `memory/HANDOVER.md`。
- 业务原因：目标团队主要使用中文，初次使用者不应先理解英文模板才能保存项目记忆。
- 技术说明：`guardian init --language en` 现在会把选中的配置传给适配器生成逻辑，避免英文项目收到中文 `AGENTS.md` 或 Cursor/Copilot 规则。query 分词增加中文关键词对，便于本地查询匹配中文问题。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、`git diff --check`、语言命令冒烟测试和 package dry-run。
- 风险：已有项目接入后应避免反复切换 `language`，否则新生成的记忆记录可能中英混杂。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：推送到 Gitee 后，在干净机器上从 Gitee URL 安装，并测试 `guardian init` 和 `guardian init --language en`。

### 2026-05-14 15:20 - 增加可移植 CLI 和 AI 工具适配器

- 用户需求：先解决 CLI 易用性问题，再开发其它 AI 工具的适配层，并保持文档同步。
- AI 总结：新增 package `bin` 入口，让工具可以作为 `guardian` 或 `project-guardian` 使用；新增 `--version`；新增通用/Codex、Cursor 和 GitHub Copilot 的可配置适配器生成；新增测试验证适配器创建、保留、package 元数据和配置校验。
- 变更文件：`package.json`、`project-guardian.config.json`、`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/` 下的适配器模板、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 业务原因：团队不应记忆很长的相对 Node 路径；项目记忆工作流应适用于 Cursor、Copilot、Codex 和通用 AI Agent，而不是绑定单一生态。
- 技术说明：`guardian init` 仍然创建核心记忆文件且不覆盖已有内容。`guardian install-adapters --adapter cursor,copilot` 只添加 AI 规则文件，并保留同名已有文件。Git 安装源是 `git+https://gitee.com/chenfengloveyuri/project-guardian.git`。
- 验证方式：`npm.cmd run lint`、`npm.cmd test`、`node plugins/project-guardian/scripts/guardian.js verify`、help/version 冒烟测试和 package dry-run。
- 风险：全局 CLI 使用依赖团队发布或从真实 npm/Git 源安装；Cursor 或 Copilot 改变规则约定时，需要复核适配器格式。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff 后，把 CLI、适配器层和 Gitee 安装源变更提交到 Gitee。

### 2026-05-14 15:50 - 从主 CLI 中解耦适配器解析

- 用户需求：分析目录结构，检查缺失或薄弱点，并对耦合度过高的地方做解耦或重构。
- AI 总结：把适配器解析、校验和模板映射从 `guardian.js` 移动到 `plugins/project-guardian/scripts/lib/adapters.js`。修复一个配置一致性问题：新的 `guardian init --adapter copilot` 以前会创建 Copilot 规则，却仍写入默认 generic/Cursor 适配器配置。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/adapters.js`、`tests/guardian.test.js`、`package.json`、`README.md`、`memory/PROJECT_CONTEXT.md`、`memory/STATE.md`、`memory/DECISIONS.md`、`memory/HANDOVER.md` 和 Project Guardian 文档。
- 业务原因：新增未来 AI 工具适配器时，不应再编辑无关的 CLI 工作流代码；自定义初始化后的新项目不应收到误导性的适配器健康检查。
- 技术说明：`package.json` 的 lint 现在检查新的适配器模块。新增回归测试验证 `init --adapter copilot` 会把 `["copilot"]` 写入新的 `project-guardian.config.json` 并通过 `doctor`。
- 验证方式：最终完整 verify 循环前，`npm.cmd run lint` 和 `npm.cmd test` 已通过。
- 风险：`guardian.js` 仍然是最大文件，依旧同时包含文档、Git、校验、query 和安全逻辑；后续拆分应在本次适配器拆分稳定后小步进行。
- 敏感信息检查：未加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：后续可以考虑把配置加载/校验或文档校验拆成独立模块。

### 2026-05-14 00:00 - 强化 Project Guardian 质量工作流

- 用户需求：按阶段改进路线一步一步完成，运行多轮测试，并在出现错误时立即修复。
- AI 总结：把 CLI 扩展为 verify 优先的工作流，新增可配置记忆路径、更严格文档校验、安全扫描、结构化决策、单独决策文件、合并冲突提示、非交互 query、更强 hook 和 CI 生成、自动化测试，以及仓库自举记忆。
- 变更文件：`plugins/project-guardian/scripts/guardian.js`、`.gitignore`、`package.json`、`tests/guardian.test.js`、`plugins/project-guardian/assets/templates/` 下的模板、根目录记忆文件、根目录文档、插件文档，以及现在对 Git 可见的插件元数据条目。
- 业务原因：插件必须从文档模板工具升级为能主动约束 AI 辅助开发团队交接质量的工具。
- 技术说明：CLI 仍然是只依赖标准库的单个 Node.js 脚本。新增命令和检查可在本地、hooks 和 Gitee CI 中运行，不需要外部服务。
  ```text
  guardian verify = doctor + check + validate-docs + configured security scan
  ```
- 验证方式：代码和文档更新后，`npm.cmd run verify`、直接命令冒烟测试、`git diff --check`、JSON 解析检查和文档一致性扫描通过。
- 风险：更严格的校验规则在真实团队尝试部分文档化项目后可能需要调整。Windows 用户如果被 `npm.ps1` 执行策略阻止，应优先在 PowerShell 中使用 `npm.cmd`。
- 敏感信息检查：未向记忆文件加入生产密码、真实 token、私钥或客户隐私数据。
- 下一步：审阅最终 diff，重新运行验证循环，并总结可提交到 Gitee 的变更集。
