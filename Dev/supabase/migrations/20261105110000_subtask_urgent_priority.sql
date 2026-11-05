-- Keep Project/Campaign subtask priorities aligned with the UI options.
alter table public.project_subtasks
  drop constraint if exists project_subtasks_priority_valid;
alter table public.project_subtasks
  add constraint project_subtasks_priority_valid
  check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.campaign_subtasks
  drop constraint if exists campaign_subtasks_priority_valid;
alter table public.campaign_subtasks
  add constraint campaign_subtasks_priority_valid
  check (priority in ('low', 'medium', 'high', 'urgent'));
