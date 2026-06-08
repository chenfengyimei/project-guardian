# 项目状态

最后更新：2026-06-08 11:51

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
- AI 规则模板、Skill、VS Code tasks、README、CLI/CI、接入、规范、工作流和零基础教程已切换为“先 brief、再核心记忆、历史文件按需读取”的默认方式。
- `guardian brief` 已新增 `--mode auto|quick|deep|full`，输出升级触发条件，解决按需读取可能误判或被误解为硬限制的问题。
- 新增 `plugins/project-guardian/cmd/guardian-cmd.js` 受控命令层，AI IDE 可优先通过固定命令 ID 执行 Git、npm、Node 和 Project Guardian 常见命令，并自动写入 `.project-guardian/cmd-audit.jsonl`。
- 新增并增强 `Run/` 可选本地可视化层，提供网页控制台查看项目状态、可收起侧边栏功能导航、文档样式核心记忆预览、运行 `guardian init`、模板化手动追加记忆、生成 brief、知识查询独立输出，以及固定 CLI 全量命令目录；命令操作会按专用模块、只读检查、写入维护和终端服务分组，支持命令搜索、短操作日志和写入前固定 Git diff 预览，写入类命令必须输入 `RUN_COMMAND`，需要参数的命令会在弹窗里填写后再运行。
- 本仓库已经自举使用自己的 Project Guardian 记忆文件，后续变更可以按它推荐给其它团队的同一套工作流审查。

## 已完成

- 创建了插件结构，包括 `.codex-plugin/plugin.json`、skill 元数据、模板、CLI 脚本、根目录 README、工作流文档、规范文档、接入文档和零基础教程。
- 实现了初始命令：`init`、`update`、`handover`、`check`、`doctor`、`validate-docs`、`query`、`install-hooks` 和 `install-ci`。
- 加入了更严格的路线图要求，覆盖仓库完整性、默认质量闸门、决策质量、配置、安全扫描、CI 行为和自动化测试。
- 已经对本仓库运行自举初始化，并填入真实记忆内容，而不是保留空模板。
- 新增 `package.json` 和 `tests/` 下的 Node 测试套件，覆盖初始化、校验、check 失败、hooks、CI 生成、决策记录、安全扫描、查询和合并冲突提示。
- 更新了面向用户的文档，让 `guardian verify` 成为提交前和 CI 中推荐使用的默认命令。
- 新增 `guardian` / `project-guardian` package 二进制入口、`guardian --version`、可配置适配器生成，以及 Cursor 和 GitHub Copilot 模板。
- 新增独立适配器模块，并补充 `guardian init --adapter ...` 会把所选适配器写入新配置的回归测试。
- 新增 `explaiw/PROJECT_FILES_EXPLANATION.md`，集中说明当前所有文档、代码、配置、资源和测试文件的职责。
- 已将本仓库自举项目记忆从根目录和 `docs/` 迁移到 `memory/`，并同步默认配置、CLI、AI 规则、插件文档和测试。
- 新增 `guardian adapters doctor`，可以查看各 AI IDE 适配器是否已安装，并给出缺失文件和安装命令。
- 新增 Windsurf、Cline、Continue、Claude Code、Gemini CLI、VS Code 适配模板，VS Code 还包含 `.vscode/tasks.json` 任务入口。
- 已复核全局 CLI 初始化业务项目时的 `package.json` scripts 生成逻辑；外部 CLI 使用 `guardian ...`，项目内源码模式使用本地脚本路径。
- Continue 规则模板已经补充规则头，VS Code tasks 和跨 IDE 适配限制已经在 README、CLI/CI、接入和标准文档中说明。
- 新增 `package-lock.json`，让 `npm audit` 可以稳定运行；当前项目没有第三方运行依赖，审计结果为 0 个漏洞。
- 新增 `guardian mcp` stdio MCP server，支持 MCP 的 AI IDE 可以直接调用 query、update、decision、verify、doctor、scan-secrets、handover、conflicts 和 adapters doctor。
- 新增 MCP 工具权限控制，`doctor` 会校验错误的 MCP 配置，测试覆盖只读模式、工具允许列表和配置错误。
- 新增本地软著申请材料包 `docs/ip/`，包含申请信息准备表、软件说明书、提交清单、源程序整理指南和质量报告；该目录已加入 `.gitignore`，默认不上传到 Gitee。
- 新增 `docs/ip/Project_Guardian_软著申请材料包.docx`，把软著申请需要的材料整理成 Word 版材料包，并确认该文件被 Git 忽略。
- 新增 AI 变更日志时间精度校验，后续最新 changelog 记录不能继续使用 `00:00` 占位时间。
- 新增 `guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`，并让 `guardian verify` 自动检测到期未完成的决策复审。
- 新增 `guardian query --limit` 和 MCP `guardian_query.limit`，用于控制查询返回片段数量，降低 MCP 接入后的上下文和 token 成本。
- 新增 `guardian brief`、MCP `guardian_brief`、VS Code Brief task 和 `guardian:brief` package script，用于在查询或读取记忆前做 token 预算路由。
- 新增 brief 三档升级机制：`quick`、`deep`、`full`；MCP `guardian_brief.mode` 会严格校验允许值，CLI 对缺失或错误 mode 会失败。
- 新增 `Run/server.js` 和 `Run/public/*`，并通过 `npm run ui` 启动本地可视化界面；package 发布范围已包含 `Run`。Run server 现在会按 `project-guardian.config.json` 解析核心记忆路径，初始化、模板化手动追加记忆和命令操作里的写入类 CLI 都需要确认词。
- 新增 `plugins/project-guardian/scripts/lib/manual-memory.js` 和 `guardian append-memory`，让 Run 控制台与 CLI 共用同一套手动追加记忆模板、核心记忆白名单和基础敏感词拦截。
- 新增 `Run/lib/commands.js`，把 Run 控制台的固定 CLI 命令目录、公开命令描述、写入参数构造和字段校验从 `Run/server.js` 中拆出，降低可视化后端主文件耦合。
- 新增 `plugins/project-guardian/scripts/lib/config.js`、`plugins/project-guardian/scripts/lib/doc-validation.js` 和 `plugins/project-guardian/scripts/lib/knowledge.js`，把配置加载/校验、文档质量校验、query/brief 检索与读取计划格式化从 `guardian.js` 中拆出。
- Run 控制台命令操作页新增命令搜索、浏览器本地短操作日志和写入类命令弹窗里的固定 Git diff 预览；后端新增只读 `/api/diff-preview`，不接收用户传入 Git 参数。
- 新增 `plugins/project-guardian/scripts/lib/git-utils.js` 和 `plugins/project-guardian/scripts/lib/security.js`，继续从 `guardian.js` 拆出 Git/diff/文件扫描与安全扫描逻辑；Run 控制台新增服务端本地审计日志 `.project-guardian/run-audit.jsonl` 和 `/api/audit-log`，并在 `.gitignore` 中忽略本地审计目录。
- Run 控制台新增 `MCP 系统` 页面，通过 `/api/status` 展示 MCP 启动命令、协议版本、配置有效性、只读状态、`allowedTools` 和工具启用/禁用状态；页面只做本地配置摘要，不启动 stdio MCP 长连接。
- MCP 模块现在提供可复用的工具执行器，Run 控制台通过 `/api/mcp/call` 调用同一套 MCP 工具定义、权限过滤和参数校验；写入类 MCP 工具必须输入 `RUN_MCP`，审计日志只记录工具名和参数名。
- 新增 `plugins/project-guardian/scripts/lib/decisions.js`、`plugins/project-guardian/scripts/lib/reviews.js` 和 `plugins/project-guardian/scripts/lib/handover.js`，把决策记录、复审检测/完成和交接指南生成继续从 `guardian.js` 中拆出；主 CLI 现在更偏命令编排。
- 新增 `Run/lib/audit.js`，把 Run 服务端本地审计日志、hash 链完整性校验、敏感摘要脱敏和可选 `GUARDIAN_RUN_TOKEN` API 口令保护从 `Run/server.js` 中拆出；Run 页面会显示审计链完整性。
- 新增 `guardian-cmd` package bin、受控命令目录和自动命令审计日志；AI 规则模板、VS Code tasks、README、CLI/CI、接入、规范、工作流和文件说明已同步要求 AI IDE 优先使用受控命令替代项。

## 进行中

- 暂无正在进行的未验证功能；受控命令层已完成本轮代码、文档、测试和记忆收尾。

## 下一步

1. 提交到 Gitee 前复查 `git status`，确认 `cmd/` 受控命令层、AI 规则模板、VS Code tasks、文档、测试和记忆一起提交，且 `.project-guardian/` 与 `docs/ip/` 不被 Git 跟踪。
2. 后续根据真实 AI IDE 高频命令继续补充 `guardian-cmd` 白名单；没有替代项时仍可临时直跑 shell，但应评估是否新增受控命令 ID。
3. 如果团队需要企业级命令审计，应把 `.project-guardian/cmd-audit.jsonl` 和 Run 审计日志采集到集中日志或不可变存储，并补充登录鉴权、访问控制、HTTPS 和保留策略。

## 已知问题

| 问题 | 影响 | 负责人 | 备注 |
| --- | --- | --- | --- |
| 查询仍是关键词检索，不是语义检索 | 不同表达方式的问题可能搜不到答案 | 维护者 | RAG 和向量检索规划在后续迭代 |
| 决策记录会同时写入索引和单独决策文件 | 文档输出略多 | 维护者 | 这是为了兼容现有 `memory/DECISIONS.md`，同时降低未来协作冲突 |
| Gitee Go 语法可能因账号模板不同而变化 | 团队可能需要调整生成的流水线细节 | 仓库负责人 | CLI 保持工作流小而可配置 |
| 已有项目保留旧配置时仍会写旧路径 | 旧项目不会自动迁移到 `memory/` | 维护者 | 本次保持尊重显式配置；旧项目迁移时应同步更新 `project-guardian.config.json` |
| AI IDE 规则格式会变化 | 某些适配器模板未来可能失效 | 维护者 | 已新增 `adapters doctor` 帮助发现缺失文件；仍需定期复核官方规则格式 |
| MCP 不做身份认证或逐次审批 | 支持 MCP 的 IDE 仍能调用已开放的本地 Guardian 命令 | 维护者 | 已新增 `mcp.readOnly` 和 `mcp.allowedTools` 降低误调用风险；仍需依赖仓库权限、Git 权限和代码评审 |
| 记忆读取仍会消耗模型上下文 | 其它项目接入后，AI 读取规则、核心记忆和查询片段会增加少量 token | 维护者 | 使用 `guardian brief` / `guardian_brief` 先做读取计划，再用 `guardian_query.limit` 或 `guardian query --limit` 控制返回片段数；风险升高时用 `--mode deep` 或 `--mode full`，默认不做 RAG 全量注入 |
| 复审检测依赖标准字段 | 手工改坏 `复审时间` 或完成标记会导致漏检或误报 | 维护者 | 使用 `guardian decision add --review-after` 和 `guardian reviews complete` 生成标准内容 |
| `guardian-cmd` 只能覆盖白名单命令 | 没有替代项时 AI IDE 仍可能需要临时直跑 shell | 维护者 | 优先运行 `guardian-cmd list`；高频直跑命令应补进 `plugins/project-guardian/cmd/guardian-cmd.js` 并补测试 |

## 风险区域

- `plugins/project-guardian/scripts/guardian.js` 和 `plugins/project-guardian/scripts/lib/*.js` 共同承接 CLI 行为，修改时需要重点测试命令入口、配置、文档校验、query/brief、MCP、hooks、CI、决策、复审、交接和扫描。
- `plugins/project-guardian/cmd/guardian-cmd.js` 只允许固定白名单命令；新增替代项时必须校验参数、禁止任意 shell、记录日志并补测试。
- Run 审计日志有本地 hash 链和可选 `GUARDIAN_RUN_TOKEN`，但仍然不是企业集中审计或不可变存储；如果离开 localhost 或多人共享，需要单独补登录鉴权、访问控制、HTTPS、集中采集和保留策略。
- 文档校验既要严格阻止空模板，又不能严格到让新团队难以逐步接入。
- 安全扫描必须隐藏敏感值，也要避免在普通文档中产生过多误报。
- hooks 和 CI 应保持追加式或明确生成，不能覆盖团队已有自动化。

## 最新 AI 协助变更

- 任务：新增系统级受控命令日志功能，让 AI IDE 执行常见命令时先从插件 `cmd/` 目录找到替代入口，并由代码自动追加命令审计日志。
- 总结：新增 `plugins/project-guardian/cmd/guardian-cmd.js` 和 `cmd/README.md`；新增 `guardian-cmd` package bin；固定命令目录覆盖 Git、npm、Node 和主要 Project Guardian 子命令；每次调用自动写入 `.project-guardian/cmd-audit.jsonl`，失败和非法参数也会记录；AI 规则模板和 VS Code tasks 已改为优先使用 `guardian-cmd`。
- 文件：`plugins/project-guardian/cmd/*`、`package.json`、`package-lock.json`、`tests/guardian.test.js`、`AGENTS.md`、`.cursorrules`、AI 规则模板、VS Code tasks、README、Project Guardian 文档、`explaiw/PROJECT_FILES_EXPLANATION.md` 和项目记忆文件。
- 验证：已运行 `node --check plugins/project-guardian/cmd/guardian-cmd.js`、`node --check plugins/project-guardian/scripts/guardian.js`、`node plugins/project-guardian/cmd/guardian-cmd.js list`、`node --test --test-name-pattern "guardian-cmd|package exposes" tests/guardian.test.js`、`node --test --test-name-pattern "guardian-cmd" tests/guardian.test.js`、`node plugins/project-guardian/cmd/guardian-cmd.js npm-lint`、`node plugins/project-guardian/cmd/guardian-cmd.js npm-test`、`node plugins/project-guardian/cmd/guardian-cmd.js guardian-verify`、`node plugins/project-guardian/cmd/guardian-cmd.js git-diff-check` 和 `node plugins/project-guardian/cmd/guardian-cmd.js npm-audit`；全量测试 71 个通过，`guardian verify` 通过，npm audit 0 漏洞，diff 检查只有 Windows LF/CRLF 提示。
- 后续：`guardian-cmd` 不是任意 shell，也不是企业集中审计；没有白名单替代项的命令仍可能需要临时直跑，后续按真实使用频率补命令 ID。
