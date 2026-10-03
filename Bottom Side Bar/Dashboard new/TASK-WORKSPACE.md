# Task workspace

The Task tab adds Kanban, grouped list, weekly dates, and a detail drawer using existing Task Master fields.

- `task-workspace.js` and `task-workspace.css`: shared local/live UI.
- `.apps-script-target/TaskWorkspace.js`: `apiMoveTask`, scoped status updates with Manager/PIC checks, row + ID matching, and previous-status conflict checks.
- `node build-task-workspace.mjs`: embeds the shared UI into the existing Apps Script bundle without replacing the newer live application with the older local `app.js`.
- `node --test analytics.test.mjs task-workspace.test.mjs`: date/analytics and task mutation regression checks.

After changing the workspace files, run the build before `clasp push` and updating the existing deployment. Do not rebuild the entire Apps Script application from root `app.js`: the live bundle has newer registration and data-refresh integration.

Kanban maps Pending to Cần làm, On going to Đang thực hiện, Feedback to Cần phản hồi, and Done to Hoàn tất. Unrecognized/cancelled states are retained in Trạng thái khác. Calendar uses deadline and airDate as day-based milestones, with unscheduled tasks in a separate expandable list. Attachments use the existing sourceLink field. No checklist completion or comment counts are invented.

Verification: browser checks cover local drag/drop, status selection, view switching, create-form display, desktop drawer, and mobile layout. Live checks cover real Task Master data in all three views and the detail drawer. Server mutation tests use mocked Sheets; production task records were not changed for testing.
