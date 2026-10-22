---
name: deploy-main
description: Releases a specific, user-approved Dashboard K COFFEE commit from the verified Vercel Develop preview to the main Production branch. Use only after the user explicitly approves the exact commit SHA and preview URL. Never deploy unapproved changes.
---

# Release Dashboard K COFFEE to Production

This skill handles only the final Production release. It is never invoked automatically after a Develop deployment. The user's explicit approval of the exact reviewed commit is required in the active conversation.

## Required approval and evidence

1. Confirm the user explicitly approved the exact commit SHA and Vercel Develop preview URL in the active conversation. A general “OK”, an approval for another commit, or an earlier approval does not authorize this release.
2. Confirm Nhi reported the Vercel Develop preview clean and error-free and Khoa passed an independent review of that exact commit.
3. Confirm the approved SHA still matches the reviewed commit on `develop`. Check that no relevant changes have been added since approval.
4. Confirm Vercel is configured with `main` as its Production branch and that the expected PR/merge route is available. If the repository's configured branches, Vercel mapping, or approval evidence is unclear, stop and report the blocker.

## Production release

1. Keep all implementation work on `develop`. Do not switch the working checkout to `main` to edit or recreate changes.
2. Use the repository's normal reviewed PR/merge process to merge the approved Develop commit into `main`. Respect branch protections and required checks.
3. Never use force-push, `git push origin develop:main`, direct branch overwrite, or an unreviewed Vercel Production deployment. Do not bypass a blocked PR or failed check.
4. Wait for Vercel's Production deployment to complete. Verify its commit SHA, status, and Production URL before reporting success. A merge or push alone is not proof of a successful deployment.

## Close-out

Report the approved SHA, PR/merge result, Vercel Production status and URL, and any remaining risks. If any required gate fails, stop before Production and report concrete evidence.
