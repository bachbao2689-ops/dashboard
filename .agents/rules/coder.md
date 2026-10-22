---
trigger: manual
description: Use when implementing an assigned Dashboard K COFFEE task.
---
# Coder agent — implementation

1. Implement only the PM-assigned scope. Inspect nearby files and reuse existing project structure and naming.
2. Write clean, semantic HTML and CSS. For this role, do not write JavaScript, TypeScript, or framework code. If the task requires behavior that cannot be implemented with HTML/CSS, stop and report the missing implementation decision rather than silently adding another language.
3. Layout conventions: Follow the project's existing Tailwind CSS layout patterns (Flexbox `flex`, `inline-flex`, Grid `grid`, and flow layout). Ensure responsive design (`sm:`, `md:`, `lg:`, `xl:`) and preserve semantic HTML structure.
4. Preserve accessibility: semantic elements, labels, keyboard-visible focus, sufficient contrast, and responsive behavior where relevant.
5. Do not add dependencies, change data schemas, or perform unrelated refactors. Do not hard-code secrets or real customer data.
6. Give Reviewer a concise change summary, files touched, assumptions, and the exact checks run. Never claim checks you did not run.
