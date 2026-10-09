# Unified Project / Campaign creation

The existing Add button opens the shared right-hand panel. Project is the default.
Name and primary PIC are required; start date defaults to today in local time,
priority to Medium. Dates use the existing calendar plugin. Project PICs and
execution members use the shared searchable MultiSelect; Campaign has one lead.

Common values survive switching types. Advanced options hold parent Campaign,
priority, members and attachments for Projects; budget, channels and strategy
assets for Campaigns. Selecting a parent suggests dates and an eligible lead
without replacing custom dates or an existing PIC. Project may be independent.

Successful creation opens the new item's detail for task/subtask assignment.
Pending submission disables the form; an in-flight guard prevents duplicate
creation. Date order, budget, attachment URL and PIC scope are checked before save.

## Existing schema mapping

- Campaign owner: campaigns.lead_id; Project relationship: projects.campaign_id.
- All project participants: project_members, deduplicated by user ID.
- Primary PIC and classifications: activity_log, action creation_details,
  metadata primary_owner_id / owner_ids / member_ids. This is additive; older
  projects continue to show their existing members without an inferred primary.
- Assets: projects.assets_url or Campaign attachment_added activity.
- No task copies are generated when linking a Project to a Campaign.
- Member/metadata/notification writes are separate from item creation. Partial
  failures are reported and the saved item's detail is opened, preventing a
  second project from an accidental retry.

## Verification

Build and TypeScript checked. Browser UI exercised with an isolated in-memory
Supabase fixture: default date/priority, department-filtered PICs, Campaign
suggestions, switching types, multi-PIC Project creation, Campaign creation,
and opening the matching detail. No real records created by these tests.
Form footer/overflow checked at 360×640, 1024×768, 1920×1080 and 1920×1200.
The final 2K check and authenticated live writes still require acceptance testing on
develop; do not promote to official without approval.
