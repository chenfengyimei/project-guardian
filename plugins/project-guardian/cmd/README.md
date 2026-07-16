# Project Guardian 受控命令层

`cmd/` 目录提供一层面向 AI IDE 的受控命令替代入口。它的目标不是开放一个万能 shell，而是把常见的 Git、npm、Node 和 Project Guardian 操作收敛成固定命令目录，并在每次调用时自动写入一行本地 JSONL 日志。

## 使用方式

如果已经全局安装 npm 包：

```bash
guardian-cmd list
guardian-cmd git-status
guardian-cmd npm-test
guardian-cmd guardian-verify
```

如果项目只是把插件源码放在仓库内：

```bash
node plugins/project-guardian/cmd/guardian-cmd.js list
node plugins/project-guardian/cmd/guardian-cmd.js git-status
node plugins/project-guardian/cmd/guardian-cmd.js guardian-query "登录模块怎么改" --limit 3
```

`run` 只是兼容写法，下面两条等价：

```bash
guardian-cmd git-status
guardian-cmd run git-status
```

## 日志位置

每次调用都会追加到目标项目根目录：

```text
.project-guardian/cmd-audit.jsonl
```

默认 `.gitignore` 会忽略 `.project-guardian/`，所以本地命令日志不会污染代码提交。单行日志示例：

```json
{"timestamp":"2026-06-08T10:00:00.000Z","method":"git-status","args":[],"cwd":"D:\\ai\\project_ai","kind":"exec","ok":true,"exitCode":0,"durationMs":42}
```

日志会记录调用时间、受控命令 ID、参数摘要、工作目录、命令类型、是否成功、退出码和耗时。参数会做上下文感知脱敏：无论使用 `--token=value` 还是 `--token value`，敏感选项的值都会被替换；疑似 password、secret、token、api_key、private_key 和长 token 字符串不会完整写入日志。

如果审计日志无法写入，`guardian-cmd` 会在 STDERR 中提示 `Failed to write command audit log`。原本成功的命令会返回失败状态，避免 AI IDE 误以为“已执行且已记录”；原本失败的命令仍保留原始失败退出码，并额外提示日志写入失败。

## 安全边界

- 只允许固定命令目录，不支持任意 shell。
- 子进程使用参数数组执行，不拼接 shell 字符串。
- `git-status`、`npm-test` 等无参数命令会拒绝额外参数。
- 文件路径类参数必须是项目内相对路径，不能使用绝对路径或 `..` 越界。
- 这个日志是本地追踪，不是企业级不可篡改审计；需要正式审计时，应把 `.project-guardian/cmd-audit.jsonl` 采集到集中日志系统。

## 常用命令

查看完整目录：

```bash
guardian-cmd list
```

当前内置分类：

- 基础：`help`、`list`、`log-path`、`pwd`、`ls`
- Git：`git-status`、`git-diff-stat`、`git-diff-name-only`、`git-diff-check`、`git-log`、`git-branch`、`git-stash`
- npm：`npm-lint`、`npm-test`、`npm-verify`、`npm-audit`
- Node：`node-check`
- Project Guardian：`guardian-help`、`guardian-version`、`guardian-commands`、`guardian-init`、`guardian-update`、`guardian-append-memory`、`guardian-decision-add`、`guardian-doctor`、`guardian-check`、`guardian-validate-docs`、`guardian-verify`、`guardian-scan-secrets`、`guardian-reviews`、`guardian-reviews-due`、`guardian-reviews-complete`、`guardian-handover`、`guardian-conflicts`、`guardian-install-adapters`、`guardian-adapters-doctor`、`guardian-install-hooks`、`guardian-install-ci`、`guardian-query`、`guardian-brief`、`guardian-migrate-memory`、`guardian-repair-memory`

`guardian-repair-memory` 默认只读报告；只有显式传入 `--write` 才会修改记忆文件。

`guardian-migrate-memory` 会安全迁移旧版记忆路径；应先传 `--dry-run` 查看计划，确认后再执行写入。迁移拒绝覆盖现有目标，也不会把配置改向源和目标都不存在的空路径；移动失败时会回滚本轮已经完成的移动。

`guardian mcp` 是长时间运行的 stdio 服务，建议在 AI IDE 的 MCP 配置里启动，不放进 `guardian-cmd` 的普通短命令目录。

## 新增替代命令的标准

如果 AI IDE 经常需要执行某个系统命令，优先在 `guardian-cmd.js` 中新增一个受控命令 ID，而不是让 Agent 长期直接运行原始 shell。

新增时需要同时满足：

- 命令参数是固定白名单，或有明确校验。
- 不接受用户拼接的可执行文件名。
- 不启用 `shell: true`。
- 日志里不写入完整密钥、正文大段内容或客户隐私。
- 补充自动化测试，验证成功路径、拒绝非法参数路径和日志写入。
