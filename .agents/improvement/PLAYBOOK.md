# Agent improvement loop

Run this after each meaningful development task. This improves the agents' instructions, memory, and eval coverage; it does not fine-tune model weights.

## 1. Collect evidence
PM asks each role that participated for a short close-out:
- Coder: what constraint or project convention was unclear or missing?
- Tester: what failure mode or test gap did the task expose?
- Reviewer: what requirement, role boundary, or acceptance criterion was missed or ambiguous?

Only record specific observations tied to a file, behavior, finding, or user-confirmed preference. Do not collect secrets, customer data, or raw private conversation.

## 2. Decide what to promote
- Fix a one-off implementation defect in the code; do not automatically turn it into a global agent rule.
- Promote a lesson into a role rule only if the user confirms it, it is a reproducible agent failure, or the same pattern appears in at least two tasks.
- Put stable architecture/style facts in `.agents/memory/README.md` or a focused memory file; put behavior constraints in `AGENTS.md` or the relevant `.agents/rules/` and `.agents/agents/` files.
- Keep the rule short, actionable, and assigned to the role that can apply it. Remove duplicates and superseded guidance.

## 3. Add eval coverage
- For a confirmed failure, draft a synthetic regression case in `.agents/evals/golden.jsonl` using the schema described in `.agents/evals/README.md`.
- Mark new cases `draft`. A human verifies the expected outcome before changing a case to `approved` or counting it toward the 1,000-case target.
- Never add duplicate, unverifiable, sensitive, or invented “gold” answers.

## 4. Version and verify
- Record date, affected agent/rule, evidence, change, and eval case ID (if any) in `.agents/improvement/CHANGELOG.md`.
- Check that updated role files agree with `AGENTS.md` and do not conflict with the user's latest direction.
- Re-run the relevant eval or review pass when a harness exists. If none exists, state that the update is instruction-level and has not been automatically benchmarked.
- PM reports each proposed/persisted improvement in the task close-out. Do not silently rewrite long-term guidance.
