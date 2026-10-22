# Memory policy

Memory has three layers. Keep working context separate from durable project knowledge; promote only confirmed, reusable facts.

## 1. Working memory — current task/context window
Contains the active user request, current files/diff, decisions, and immediate commands. Use it to complete the current task. Do not treat a guess as a project fact.

## 2. Short-term memory — session buffer
At a meaningful handoff or context limit, write a brief session note: goal, completed work, current state, decisions with reasons, pending tasks, and checks/evidence. Keep it factual and dated. Store notes under `.agents/memory/sessions/` only when the project needs resumable session history; do not commit private user data or secrets.

## 3. Long-term memory — curated project knowledge
Store stable, reusable facts such as confirmed architecture, naming/style conventions, data definitions, and lessons repeatedly validated by the user. Prefer concise Markdown files tracked with the project for a small local setup. Use vector search or SQL only when there is a real retrieval/scale need and an approved store; document ownership, retention, access controls, deletion, and backup before adding one. Never imply that vector/SQL storage already exists unless verified.

## Promotion and maintenance
- Promote a fact only after it is confirmed by the user or corroborated by project files. Include source/date when useful.
- Keep instructions in `AGENTS.md`/rules; keep reference facts in memory. Avoid duplicating the same rule in multiple files.
- Do not store credentials, tokens, customer-identifying data, or raw private conversations. Use redacted or synthetic examples.
- Remove stale facts when contradicted. Mark uncertain information as an open question rather than durable truth.
- Session notes are optional and should be created only when they improve continuity; do not log every prompt.
