# Add decision review detection and completion workflow

日期：2026-06-02

## 决策记录

### 2026-06-02 - Add decision review detection and completion workflow

- 背景：决策文件已经有 `Review after` / `复审时间` 字段，但没有自动发现到期复审、完成复审和停止后续提醒的机制。
- 决策：新增 `guardian reviews`、`guardian reviews due` 和 `guardian reviews complete`，扫描 `memory/decisions/*.md` 的复审时间；到期未完成时 `guardian verify` 失败；复审完成后在对应决策文件追加复审结果，并写明“无需继续复审”。
- 备选方案：继续只靠人工查看决策文件；把复审做成复杂数据库任务系统；只在文档里提醒但不进入质量闸门。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/scripts/lib/mcp.js`、`tests/guardian.test.js`、README、Project Guardian 文档和项目记忆文件。
- 关联变更：MCP 新增 `guardian_reviews_due` 和 `guardian_review_complete`；package scripts 新增 `guardian:reviews`；`verify` 新增 `reviews` 步骤。
- 验证方式：新增回归测试覆盖到期复审阻塞 `verify`、完成复审后恢复通过、MCP 只读隐藏写入工具和 package scripts；运行 lint、测试和完整 verify。
- 风险：复审检测依赖标准字段名和日期格式；手工写坏字段时仍可能需要人工修正或后续增强解析。
- 复审时间：2026-07-02。
- 后续动作：观察真实团队是否需要交互式复审、复审责任人字段、复审历史列表或配置化提前提醒。

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:18
- 复审人：AI 或人工复审者
- 复审结论：Still valid - review workflow running correctly as demonstrated by current session: reviews due/list/complete all work, verify blocks on due reviews, MCP tools exposed, all tests pass
- 验证方式：Verified: reviews.js implements findDueReviews/completeReview/runReviewValidation, guardian.js dispatches reviews/reviews due/reviews complete, verify integrates review step, we successfully completed 5 reviews this session
- 后续复审：无需继续复审
