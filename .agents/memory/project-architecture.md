# Project architecture memory

Last checked: 2026-10-22. Sources: `README.md`, `GUIDELINE/rules.md`, `GUIDELINE/style.md`, `.agents/rules/ui-modifications.md`, and the visible `Dev/src` directory structure. Recheck source files for each task; this note is an index, not authority over code or live infrastructure.

- The application lives under `Dev/`; project docs describe a React + TypeScript + Vite app. The source tree has `components`, `pages`, `services`, `store`, `hooks`, `lib`, and `styles` areas.
- Supabase is used for backend/database. Read `GUIDELINE/rules.md` and inspect current migrations, RLS, and source before any database or access-control change. Never infer current credentials or production state from this note.
- `GUIDELINE/rules.md` governs environment, permissions, data, tracking, and release. It describes Develop vs Official separation and restricts release/data changes. Confirm current branch/SHA and actual environment before any deployment or migration.
- `GUIDELINE/style.md` governs responsive desktop/tablet/mobile UI and Light/Dark design. `.agents/rules/ui-modifications.md` says default UI changes affect Light mode only unless the user explicitly requests Dark mode too.
- User-defined Coder boundary: HTML/CSS only, no Flexbox. This may not permit changes to React/TypeScript behavior. PM must surface that conflict instead of silently weakening the role boundary.
