-- Run after the member directory migration, inside a rollback transaction.
-- Reuses existing identities only as SQL claims, never creates login accounts.
create temp table account_checks(name text, passed boolean);
grant insert, select on account_checks to authenticated, anon;
create temp table account_test_actors as
  select 'admin' kind,id,auth_id,email,department_id from public.users where role='admin' and is_active and auth_id is not null order by id limit 1;
insert into account_test_actors
  select 'staff',id,auth_id,email,department_id from public.users where role='member' and is_active and auth_id is not null order by id limit 1;
insert into account_test_actors
  select 'leader',id,auth_id,email,department_id from public.users where role='leader' and is_active and auth_id is not null order by id limit 1;
grant select on account_test_actors to authenticated, anon;
create function pg_temp.assert_account(label text, actual boolean) returns void language plpgsql as $$
begin
 if not coalesce(actual,false) then raise exception 'FAIL: %',label; end if;
 insert into account_checks values(label,true);
end $$;
create function pg_temp.denied_account(label text, statement text) returns void language plpgsql as $$
begin
 begin
   execute statement;
 exception when insufficient_privilege then
   insert into account_checks values(label,true); return;
 end;
 raise exception 'FAIL: expected permission denial: %',label;
end $$;
select pg_temp.assert_account('real admin staff and leader identities present',(select count(*)=3 from account_test_actors));
select pg_temp.assert_account('users RLS enabled',(select relrowsecurity from pg_class where oid='public.users'::regclass));
select pg_temp.assert_account('directory tables published',(select count(*)=2 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename in ('users','departments')));
set local role anon;
select pg_temp.denied_account('anonymous cannot read accounts','select * from public.users');
select pg_temp.denied_account('anonymous cannot write accounts','update public.users set role=''admin''');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',auth_id,'role','authenticated')::text,true) is not null from account_test_actors where kind='staff';
set local role authenticated;
select pg_temp.assert_account('staff reads own actual rank',exists(select 1 from users where auth_id=auth.uid() and role='member'));
select pg_temp.assert_account('staff sees active directory',exists(select 1 from users where is_active and role='leader'));
update users set name=name,avatar_url=avatar_url,last_sign_in_at=now() where auth_id=auth.uid();
select pg_temp.assert_account('staff can update own profile',exists(select 1 from users where auth_id=auth.uid() and last_sign_in_at>=transaction_timestamp()));
select pg_temp.denied_account('staff cannot promote own role','update users set role=''admin'' where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot promote own level','update users set employment_level=''Manager'' where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot change department','update users set department_id=null where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot relink identity','update users set auth_id=null where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot change account email','update users set email=''altered@example.invalid'' where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot deactivate self','update users set is_active=false where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot forge creation time','update users set created_at=now() where auth_id=auth.uid()');
with changed as (update users set name='Forbidden' where id=(select id from account_test_actors where kind='leader') returning id)
select pg_temp.assert_account('staff cannot edit peer account',not exists(select 1 from changed));
select pg_temp.denied_account('staff cannot delete accounts','delete from users where auth_id=auth.uid()');
select pg_temp.denied_account('staff cannot truncate accounts','truncate users cascade');
select pg_temp.denied_account('staff cannot insert a privileged account','insert into users(id,email,name,role,is_active) values(-900001,''account-fixture@example.invalid'',''Fixture'',''admin'',true)');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',auth_id,'role','authenticated')::text,true) is not null from account_test_actors where kind='leader';
set local role authenticated;
select pg_temp.assert_account('department leader is not global manager',not dashboard_private.account_is_manager());
with changed as (update users set is_active=false where id=(select id from account_test_actors where kind='staff') returning id)
select pg_temp.assert_account('leader cannot remove staff accounts',not exists(select 1 from changed));
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',auth_id,'role','authenticated')::text,true) is not null from account_test_actors where kind='admin';
set local role authenticated;
select pg_temp.assert_account('admin reads complete member list',(select count(*) from users) >= (select count(*) from account_test_actors));
select pg_temp.assert_account('admin recognized from real identity',dashboard_private.account_is_manager());
insert into users(id,email,name,role,is_active) values(-900001,'account-fixture@example.invalid','Fixture','member',true);
select pg_temp.assert_account('admin can add member',exists(select 1 from users where id=-900001));
update users set is_active=false where id=-900001;
select pg_temp.assert_account('admin retains removed members in management',exists(select 1 from users where id=-900001 and not is_active));
update users set is_active=true where id=-900001;
select pg_temp.assert_account('admin can restore member',exists(select 1 from users where id=-900001 and is_active));
select pg_temp.denied_account('admin cannot replace another identity','update users set auth_id=gen_random_uuid() where id=-900001');
select pg_temp.denied_account('admin cannot accidentally deactivate self','update users set is_active=false where auth_id=auth.uid()');
select pg_temp.denied_account('admin cannot accidentally demote self','update users set role=''member'' where auth_id=auth.uid()');
reset role;
-- Verify an existing imported profile can still be claimed by its verified owner.
update users set auth_id=null where id=(select id from account_test_actors where kind='staff');
select set_config('request.jwt.claims',jsonb_build_object('sub',auth_id,'role','authenticated')::text,true) is not null from account_test_actors where kind='staff';
set local role authenticated;
select pg_temp.assert_account('verified first-login owner sees matching imported profile',exists(select 1 from users where id=(select id from account_test_actors where kind='staff')));
select pg_temp.denied_account('claim cannot also change access','update users set auth_id=auth.uid(),role=''admin'' where id=(select id from account_test_actors where kind=''staff'')');
update users set auth_id=auth.uid(),last_sign_in_at=now() where id=(select id from account_test_actors where kind='staff');
select pg_temp.assert_account('verified first-login can link unchanged Staff',exists(select 1 from users where auth_id=auth.uid() and role='member'));
reset role;
-- Exercise a global Manager with SQL-only, uncommitted role changes.
update users set role='manager',employment_level='Manager' where id=(select id from account_test_actors where kind='staff');
set local role authenticated;
select pg_temp.assert_account('Manager recognized from current database role',dashboard_private.account_is_manager());
update users set is_active=false where id=-900001;
select pg_temp.assert_account('Manager manages Staff',exists(select 1 from users where id=-900001 and not is_active));
select pg_temp.denied_account('Manager cannot promote a Staff to Admin','update users set role=''admin'' where id=-900001');
select pg_temp.denied_account('Manager cannot edit Admin','update users set name=name where id=(select id from account_test_actors where kind=''admin'')');
reset role;
update users set is_active=false where id=(select id from account_test_actors where kind='staff');
set local role authenticated;
select pg_temp.assert_account('inactive account has no management rights',not dashboard_private.account_is_manager());
select pg_temp.assert_account('inactive account can read own deactivation',(select count(*)=1 from users));
with changed as (update users set is_active=true where auth_id=auth.uid() returning id)
select pg_temp.assert_account('inactive account cannot reactivate itself',not exists(select 1 from changed));
reset role;
-- Unknown/removed identity cannot read accounts or bootstrap access.
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true) is not null;
set local role authenticated;
select pg_temp.assert_account('missing account sees no directory',(select count(*)=0 from users));
select pg_temp.denied_account('missing Auth identity cannot insert Staff','insert into users(id,auth_id,email,name,role,is_active) values(-900002,auth.uid(),''unknown@example.invalid'',''Fixture'',''member'',true)');
reset role;
select jsonb_build_object('passed',count(*),'checks',jsonb_agg(name)) as account_permission_verification from account_checks;
