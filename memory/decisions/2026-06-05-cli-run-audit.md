# 拆分决策复审交接模块并增强 Run 本地审计

日期: 2026-06-05

## 决策记录
### 2026-06-05 - 拆分决策复审交接模块并增强 Run 本地审计

- 背景：此前剩余风险是 guardian.js 仍保留 decision/reviews/handover 编排，Run 审计也只是项目本地 JSONL，缺少完整性提示和访问口令。
- 决策：将 decision add、reviews 和 handover 生成拆到独立 CLI 模块；Run 审计拆到 Run/lib/audit.js，并为新审计记录增加 hash 链校验和可选 GUARDIAN_RUN_TOKEN API 保护。
- 备选方案：继续保留在 guardian.js 和 Run/server.js；一次性引入企业集中审计服务；直接开发完整登录系统。
- 影响文件/模块：plugins/project-guardian/scripts/guardian.js, plugins/project-guardian/scripts/lib/decisions.js, plugins/project-guardian/scripts/lib/reviews.js, plugins/project-guardian/scripts/lib/handover.js, Run/lib/audit.js, Run/server.js, Run/public/app.js, tests/guardian.test.js, Run/README.md, plugins/project-guardian/docs/CLI_AND_CI.md
- 关联变更：未指定。
- 验证方式：npm.cmd run lint; npm.cmd test; node plugins/project-guardian/scripts/guardian.js verify; git diff --check
- 风险：Run hash 链只能发现本地日志异常，不是不可篡改或集中审计；GUARDIAN_RUN_TOKEN 是轻量本地口令，不是完整登录鉴权；guardian.js 仍保留部分命令编排。
- 复审时间：2026-07-05
- 后续动作：真实团队使用后评估是否需要集中审计采集、不可变存储、登录鉴权、Run API 路由拆分，以及继续拆分 init/update/check/doctor/query/hooks/CI。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 16:59
- 复审人：AI 或人工复审者
- 复审结论：Still valid - CLI modules (decisions/reviews/handover) split successfully, Run audit hash chain and GUARDIAN_RUN_TOKEN working as designed, docs synced
- 验证方式：Verified: module files exist, audit.js hash chain integrity check works, GUARDIAN_RUN_TOKEN env guard present, guardian verify passed, CLI_AND_CI.md docs up to date
- 后续复审：无需继续复审
