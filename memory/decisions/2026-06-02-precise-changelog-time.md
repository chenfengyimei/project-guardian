# Reject placeholder midnight time in the latest AI changelog entry

日期: 2026-06-02

## 决策记录

### 2026-06-02 - Reject placeholder midnight time in the latest AI changelog entry

- 背景：项目记忆中多条 AI 变更日志被手写为 `00:00`，导致交接时难以判断真实修改时间和先后顺序。
- 决策：不批量重写旧历史；从本次修复开始，`validate-docs` 只检查最新一条 changelog，如果标题时间是 `00:00` 则失败。最新记录按文件顶部第一条 `###` 记录判断。
- 备选方案：批量修改全部旧记录；完全依赖人工注意；只修 `timestamp()` 而不加质量闸门。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`tests/guardian.test.js`、`memory/AI_CHANGELOG.md` 和 Project Guardian 文档。
- 关联变更：`latestChangelogText` 改为取第一条记录；新增 `hasMidnightTimestamp` 校验；文档说明新记录必须使用真实本地 `YYYY-MM-DD HH:mm` 时间。
- 验证方式：运行新增回归测试和完整 `guardian verify`。
- 风险：真实 00:00 整点生成的记录也会被要求人工修正为更可区分的时间。
- 复审时间：2026-07-02。
- 后续动作：观察团队是否还会手写占位时间，必要时在 `guardian update` 输出中增加更明显提示。
