# Add strict MCP schema validation and query limit

日期：2026-06-02

## 决策记录

### 2026-06-02 - Add strict MCP schema validation and query limit

- 背景：MCP 客户端如果传入多余参数或错误类型，旧实现会让 CLI 静默忽略部分无效字段；如果 `mcp.allowedTools` 配置写错，`doctor` 能发现，但直接启动 MCP 时仍有配置误用风险。`guardian_query` 固定返回 6 个片段，也不利于控制 token 成本。
- 决策：MCP server 启动时强校验 `mcp` 配置；工具调用时按 schema 拒绝多余参数、错误类型和越界值；`guardian query` 和 MCP `guardian_query` 增加 `limit`，范围 1 到 10。
- 备选方案：继续只依赖 `doctor`；只在文档提示参数格式；把查询结果固定缩短但不提供用户控制。
- 影响文件/模块：`plugins/project-guardian/scripts/lib/mcp.js`、`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 关联变更：`guardian_query.limit` 映射到 CLI `--limit`；`guardian.js` 复用 MCP 配置校验；新增 MCP 环境只读、参数校验、启动失败和 query limit 回归测试。
- 验证方式：运行 lint、Node 测试套件、完整 `guardian verify`、审计、diff check 和 package dry-run。
- 风险：这仍是本地工具边界，不是身份认证；`limit` 只能减少返回片段，不能保证语义命中率。
- 复审时间：2026-07-02。
- 后续动作：真实 MCP 客户端接入后，观察是否需要默认更小的 MCP limit、分页查询、摘要模式或 MCP prompts/resources。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:18
- 复审人：AI 或人工复审者
- 复审结论：Still valid - strict config validation on MCP startup reject bad readOnly/allowedTools, schema validation rejects extra/mistyped params, query/brief tools support limit 1-10, all tests pass
- 验证方式：Verified: validateMcpConfig() checks type of readOnly/allowedTools, tool call dispatching validates input schemas, query/brief tools support --limit, verify passes
- 后续复审：无需继续复审
