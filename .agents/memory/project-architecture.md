# Project architecture memory

Last checked: 2026-10-22. Sources: `README.md`, `GUIDELINE/rules.md`, `GUIDELINE/style.md`, `.agents/rules/ui-modifications.md`, and the visible `Dev/src` directory structure. Recheck source files for each task; this note is an index, not authority over code or live infrastructure.

- The application lives under `Dev/`; project docs describe a React + TypeScript + Vite app. The source tree has `components`, `pages`, `services`, `store`, `hooks`, `lib`, and `styles` areas.
- Supabase is used for backend/database. Read `GUIDELINE/rules.md` and inspect current migrations, RLS, and source before any database or access-control change. Never infer current credentials or production state from this note.
- `GUIDELINE/rules.md` governs environment, permissions, data, tracking, and release. It describes Develop vs Official separation and restricts release/data changes. Confirm current branch/SHA and actual environment before any deployment or migration.
- `GUIDELINE/style.md` governs responsive desktop/tablet/mobile UI and Light/Dark design. `.agents/rules/ui-modifications.md` says default UI changes affect Light mode only unless the user explicitly requests Dark mode too.
- User-defined Coder boundary: HTML/CSS only, no Flexbox. This may not permit changes to React/TypeScript behavior. PM must surface that conflict instead of silently weakening the role boundary.

## Agent and delivery facts checked on 2026-10-22

- The active role definitions are the four flat files `.agents/agents/pm.md`, `coder.md`, `tester.md`, and `reviewer.md`. Hiệp and Tùng can be selected as main agents; Nhi and Khoa are available as subagents. Sidebar chat titles are not additional agent definitions.
- An Antigravity run using Tùng completed a documentation/agent-only source upload in one request: local and remote `develop` matched at commit `6b16a535dd0abad62fc2fe95d7fa072cf04c48ca`. Vercel Preview for that commit was not checked. This is historical evidence, not the current branch or deployment state; recheck live state before every release.
- Earlier sessions showed that tool availability can differ by model/session. A past inability to run a command is not evidence that the current agent lacks that tool.
- On 2026-10-22, the older `hiep` conversation had a seven-tool read/communication schema and could not call `run_command`, although the DASHBOARD project permission preset was Turbo and no file-write deny rule was visible. A newly created Hiệp Agent conversation successfully used `run_command` to read `git branch --show-current` and received `develop`. This is evidence about those sessions, not a permanent app-wide mode or permission rule.
