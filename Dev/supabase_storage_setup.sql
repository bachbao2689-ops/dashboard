-- 1. Create the 'attachments' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

-- 2. Create policy to allow public viewing
create policy "Allow public viewing of attachments"
on storage.objects for select
to public
using ( bucket_id = 'attachments' );

-- 3. Create policy to allow authenticated users to upload
create policy "Allow authenticated users to upload attachments"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'attachments' );

-- 4. Create policy to allow users to update their own uploads
create policy "Allow users to update attachments"
on storage.objects for update
to authenticated
using ( bucket_id = 'attachments' );

-- 5. Create policy to allow users to delete their own uploads
create policy "Allow users to delete attachments"
on storage.objects for delete
to authenticated
using ( bucket_id = 'attachments' );
