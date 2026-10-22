---
name: deploy-develop
description: Deploys reviewed Dashboard K COFFEE changes from develop to the Vercel Develop preview. Use when Hiệp or the user asks Tùng to deploy a completed frontend task to Develop. Never deploys to Production or main.
---

# Deploy Dashboard K COFFEE to Vercel Develop

This skill is the repeatable Develop deployment procedure for Tùng. The user has authorized automatic deployments to the Develop preview after the project gates below pass. Production is handled only by the separate `/deploy-main` skill after explicit user approval.

## Ownership and tools

When the user says "Tùng up source lên develop", "đưa source lên nhánh develop", or an equivalent instruction, treat it as authorization to complete the Develop release. Tùng owns the commit, push, and verification. Hiệp routes the request to Tùng and follows it through. Do not respond with instructions for the user to click Source Control, open Terminal, stage, commit, push, or report back. The user does not operate Git for this workflow.

Use Antigravity's available agent tools for local files, build, and Git. For GitHub branch operations, load and follow the built-in `/permissioned-github` skill at `/Users/admin/.gemini/antigravity/builtin/skills/permissioned-github/SKILL.md`. It requires `git` for branch pushes. If an authorized operation fails because of permission restrictions, request only the narrow permission described there with `ask_custom_permission`, then retry. Keep `commandExecutionPolicy: sandbox`; never request broad access or a token. Agent-run commands are acceptable; asking the user to type commands is not.

Use the agent's `run_command` tool for Git and build operations. Do not claim to operate the human-facing Source Control panel through a nonexistent agent UI tool. If this agent runtime lacks a write-capable file or command tool, route the task to a capable agent/runtime. If none exists, report the exact missing capability and stop. A how-to answer is not a completed deployment. Never claim that a skill file was edited or a branch was pushed without checking the actual file or remote state.

## Required gates

1. Confirm the task is a completed Dashboard K COFFEE frontend task and the requested destination is Vercel Develop.
2. Confirm the current Git branch is exactly `develop`. Do not switch branches, push another branch, or rewrite history.
3. Inspect the Vercel project configuration when available. Confirm that `main` is the Production branch and `develop` is deployed as a Preview/Develop branch. The repository README currently mentions `codex/develop-dashboard`; do not infer the Vercel branch mapping from that note. If Vercel configuration cannot be inspected, continue the explicitly requested GitHub `develop` source push after the other gates pass, but report preview deployment as unverified. If the configuration proves `develop` targets Production, stop before pushing.
4. Run the project's local build from `Dev/` with `npm run build` using an agent tool. If it fails, stop and report the error; do not push or ask the user to run the build.
5. Ask Nhi to complete the agreed Local QA and report any blocking defects. Ask Khoa to review the exact diff against Hiệp's acceptance criteria. Do not push with a failing build, unresolved blocking Tester finding, or unreviewed/blocked diff. Report skipped checks honestly if either role is unavailable.
6. Inspect `git status` and the exact diff with an agent tool. Stage and commit only the reviewed task files. Never stage all files by default. Never include unrelated user changes, secrets, `.env` files, credentials, generated files, or unrelated agent configuration.
7. Do not print the raw Git remote URL: this checkout may contain credentials in that URL. Use `git ls-remote origin refs/heads/develop` to verify the remote SHA, and redact any credential-bearing URL from logs or reports.

## Develop deployment

After all gates pass, Tùng commits the reviewed files and pushes the existing `develop` branch to its matching remote branch using the agent's Git tool and `/permissioned-github` rules. Do not push `codex/develop-dashboard` unless the live Vercel configuration proves that branch is required. This push is intended only to trigger the connected Vercel Preview/Develop deployment. Do not deploy from `main` or use a Production target.

Verify that remote `develop` contains the exact new commit. At that point, the requested source upload is complete. Then inspect the Vercel deployment for that branch and SHA, wait for `Ready`, and open the actual preview URL. An old reachable URL or an earlier `Ready` deployment is not evidence that the new commit deployed. If the deployment fails or Vercel cannot be inspected, report the exact stage and evidence; leave the branch on `develop` for repair. Distinguish "source pushed" from "preview deployed and verified"; never claim the latter from a Git push alone.

## Production boundary

- Never run `vercel --prod`, `vercel deploy --prod`, or Production promotion from this skill.
- Never push `develop` directly to `main` with `git push origin develop:main`; never force-push or rewrite either branch.
- After a successful Develop deploy and QA, report the exact commit SHA and preview URL. Wait for the user's explicit approval, then use `/deploy-main` for any Production release.

## Close-out

Tell Hiệp and the user the local commit SHA, remote `develop` SHA, Vercel deployment status and SHA, actual Develop URL, which checks passed, and any remaining findings. If any gate could not be verified, state the exact missing evidence or capability and whether a commit or push happened. Never hand the Git steps back to the user as the default response.
