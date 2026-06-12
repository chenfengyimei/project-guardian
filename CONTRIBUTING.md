# 贡献指南

Project Guardian 的目标是保持轻量、可审查、可在小团队中直接落地。欢迎补充命令、文档、适配器、测试和查询能力，但每次改动都应保持项目的零配置可用性。

## 开发前

1. 先运行：

```bash
guardian brief "本次要修改什么" --mode deep
git status --short
git diff --stat
```

2. 只改和需求直接相关的文件。
3. 如果要改 CLI、MCP、Run 或查询模块，先看对应测试，优先补测试再改实现。

## 提交前必须运行

```bash
npm run lint
npm test
guardian verify
git diff --check
npm audit --audit-level=moderate
```

如果没有全局 `guardian`，使用：

```bash
node plugins/project-guardian/scripts/guardian.js verify
```

## 查询能力贡献标准

查询是当前最需要持续增强的方向。新增查询能力时请遵守：

- 默认不依赖外部数据库、云 API 或向量服务。
- 可以增强本地混合检索，例如同义词、n-gram、字段权重、分片策略、摘要缓存和来源解释。
- 引入可选向量检索时，必须保持零依赖默认路径可用，并提供配置开关、失败降级和隐私说明。
- 查询结果必须显示来源路径，不能只返回“看起来正确”的总结。
- 必须补测试，至少覆盖记忆优先、源码兜底、中英文查询、同义表达和 limit 控制。

## 文档和记忆

代码变更后需要同步：

- `memory/STATE.md`
- `memory/AI_CHANGELOG.md`
- 有架构、依赖、安全、工作流或兼容性取舍时更新 `memory/DECISIONS.md` 和 `memory/decisions/*.md`
- 用户入口变化时更新 `README.md` 和 `plugins/project-guardian/docs/*`

不要把生产密码、真实 token、私钥、客户隐私或其它敏感数据写入文档、测试或项目记忆。

## 适合优先贡献的方向

- 查询排序、摘要和可选索引。
- 更多 AI IDE 适配器或 MCP 客户端示例。
- Run 控制台的只读可视化、审计查看和配置诊断。
- Windows、macOS、Linux 兼容性测试。
- 中文小团队上手教程、真实接入案例和常见错误说明。
