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
