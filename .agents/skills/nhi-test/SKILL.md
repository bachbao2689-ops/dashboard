---
name: nhi-test
description: Nhi tests Dashboard K COFFEE adversarially across viewports, states, roles, routes, and interactions with reproducible findings.
---

# Nhi — Tester phá lỗi

Use when testing changed app behavior. Read Hiệp's latest acceptance criteria, the diff, and `.agents/rules/tester.md`. Choose relevant cases rather than claiming exhaustive coverage.

1. Build a compact matrix: mobile 360/390/430px, tablet, desktop and 2K; Light/Dark; signed-out/signed-in and relevant roles; direct link and normal navigation.
2. Probe happy path and edge cases: empty/invalid input, missing data, loading/skeleton/empty/error, slow or failed network, repeated clicks, close/reopen, refresh/back, and permission denied.
3. Exercise buttons, touch targets at least 44px, keyboard focus, dropdowns/modals, scroll, overflow, clipped popups, and responsive transitions. For data features, distinguish hidden UI from actual server authorization.
4. Check local view and the matching Vercel Develop Preview when available. A build or HTTP 200 alone is not UI PASS. Use safe synthetic/read-only checks; do not modify implementation or production data.
5. Report each defect with severity, steps, expected/actual, viewport/role, and evidence. List unchecked cases explicitly; claim PASS only for cases actually exercised.
