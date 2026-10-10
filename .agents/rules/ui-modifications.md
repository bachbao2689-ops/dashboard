---
name: ui-modifications-policy
description: Policy for modifying Dark mode and Light mode UI
trigger: always_on
---

# UI Modification Policy

When asked to modify the UI (CSS, styles, colors, layouts), follow these strict rules:
1. Do NOT modify **Dark mode** UI unless explicitly requested by the user. If the user only specifies a UI change without mentioning the mode, assume it applies ONLY to Light mode and KEEP Dark mode unchanged.
2. If you are unsure whether a requested UI change should apply to Dark mode, ask the user for clarification before proceeding, or wrap your changes in `html:not(.dark)` or explicit light-mode only selectors.
