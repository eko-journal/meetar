-- meetar veritabanı şeması
-- Supabase SQL Editor'e yapıştır ve çalıştır

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  created_at timestamptz default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete set null,
  name text not null,
  role text,
  email text,
  created_at timestamptz default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('customer','internal','partner')),
  company_id uuid references companies(id) on delete set null,
  scheduled_at timestamptz default now(),
  summary text,
  raw_notes text,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_id uuid references meetings(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  assignee text,
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table commitments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  party text not null check (party in ('me','them')),
  content text not null,
  due_date date,
  resolved boolean default false,
  created_at timestamptz default now()
);

-- updated_at otomatik güncelle
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
