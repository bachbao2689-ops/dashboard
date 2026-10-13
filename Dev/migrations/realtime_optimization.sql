-- Enable Realtime for Comments and Activity Log to support instant notifications
begin;
  -- Remove them first if they exist to avoid duplicate errors, or just try to add
  alter publication supabase_realtime add table project_comments;
  alter publication supabase_realtime add table activity_log;
commit;
