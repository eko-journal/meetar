import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        notes text,
        created_at timestamptz default now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid primary key default gen_random_uuid(),
        company_id uuid references companies(id) on delete set null,
        name text not null,
        role text,
        email text,
        created_at timestamptz default now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS meetings (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        type text not null check (type in ('customer','internal','partner')),
        company_id uuid references companies(id) on delete set null,
        scheduled_at timestamptz default now(),
        summary text,
        raw_notes text,
        created_at timestamptz default now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
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
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS decisions (
        id uuid primary key default gen_random_uuid(),
        meeting_id uuid references meetings(id) on delete cascade,
        content text not null,
        created_at timestamptz default now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS commitments (
        id uuid primary key default gen_random_uuid(),
        meeting_id uuid references meetings(id) on delete cascade,
        party text not null check (party in ('me','them')),
        content text not null,
        due_date date,
        resolved boolean default false,
        created_at timestamptz default now()
      )
    `;

    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      DROP TRIGGER IF EXISTS tasks_updated_at ON tasks
    `;

    await sql`
      CREATE TRIGGER tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
    `;

    return NextResponse.json({ ok: true, message: 'Tablolar başarıyla oluşturuldu.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
