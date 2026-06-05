# Use per-decision files

Date: 2026-05-14

## Decision Record
### 2026-05-14 - Use per-decision files

- Context: Multiple maintainers may edit decision history during handover or review.
- Decision: Mirror new structured decisions into memory/decisions while keeping memory/DECISIONS.md compatible.
- Alternatives considered: None recorded.
- Affected files/modules: plugins/project-guardian/scripts/guardian.js, memory/decisions
- Related change: P4 collaboration conflict handling and the new `guardian decision add` command.
- Verification: npm.cmd test and guardian verify
- Risks: Decision content is duplicated for compatibility.
- Review after: 2026-06-14
- Follow-up: Consider turning memory/DECISIONS.md into a pure index after teams adopt the directory.

## 复审结果

- 复审状态：正常
- 复审完成时间：2026-06-05 17:16
- 复审人：AI 或人工复审者
- 复审结论：Still valid - memory/decisions/ directory holds 18 decision files, DECISIONS.md syncs consistently with per-decision references, guardian decision add command works
- 验证方式：Verified: 18 files in memory/decisions/, DECISIONS.md references all of them via '决策文件' links, test and verify pass
- 后续复审：无需继续复审
