import pg from 'pg';

const connectionString = `postgresql://postgres:${encodeURIComponent(process.env.DB_PASSWORD || '')}@db.jxrwphjriuqbpdpwpqcn.supabase.co:5432/postgres`;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

await client.connect();
await client.query(`
  create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid references public.workspaces(id) on delete cascade,
    name text not null,
    objective text,
    start_date date,
    end_date date,
    budget numeric,
    channels text[] not null default '{}',
    lead_id bigint references public.users(id) on delete set null,
    department_id uuid references public.departments(id) on delete set null,
    status text not null default 'draft',
    created_by bigint references public.users(id) on delete set null,
    created_at timestamptz not null default now()
  );
  alter table public.projects add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
  alter table public.projects add column if not exists department_id uuid references public.departments(id) on delete set null;
  alter table public.projects add column if not exists assets_url text;
  alter table public.tasks add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
  create table if not exists public.campaign_members (
    campaign_id uuid not null references public.campaigns(id) on delete cascade,
    user_id bigint not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (campaign_id, user_id)
  );
  create table if not exists public.campaign_subtasks (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.campaigns(id) on delete cascade,
    title text not null,
    assignee_id bigint references public.users(id) on delete set null,
    due_date date,
    status text not null default 'todo',
    created_at timestamptz not null default now()
  );
`);
await client.end();
