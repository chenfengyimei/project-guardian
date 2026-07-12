# 默认使用中文项目记忆

日期: 2026-05-15

## 决策记录

### 2026-05-15 - 默认使用中文项目记忆

- 背景：目标使用者主要是中文团队和编程经验较少的实习生，英文模板会增加理解成本，也容易让 AI 生成的交接记录脱离实际工作语言。
- 决策：Project Guardian 默认使用 `zh-CN` 模板，同时保留 `guardian init --language en` 给英文团队使用。校验、更新、交接、决策和 AI 工具适配规则必须兼容中英文。
- 备选方案：继续只维护英文模板；或只维护中文模板并移除英文支持。
- 影响文件/模块：`plugins/project-guardian/scripts/guardian.js`、`plugins/project-guardian/assets/templates/zh-CN/`、`project-guardian.config.json`、README、插件文档和测试。
- 关联变更：新增语言配置、中文模板、双语校验规则、中文 query 分词测试，并修复英文初始化仍生成中文规则的问题。
- 验证方式：运行 lint、测试、`guardian verify`、语言初始化冒烟测试和 package dry-run。
- 风险：已有项目反复切换语言会让后续记忆记录中英混杂。
- 复审时间：未安排。
- 后续动作：根据真实团队反馈继续补充中文文案和 AI 工具适配模板。
