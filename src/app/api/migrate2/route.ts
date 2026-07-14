import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        status text not null default 'active' check (status in ('active','paused','done')),
        description text,
        company_id uuid references companies(id) on delete set null,
        created_at timestamptz default now()
      )
    `;

    await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS project_id uuid references projects(id) on delete set null`;

    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visibility text not null default 'internal' check (visibility in ('client','internal'))`;

    await sql`ALTER TABLE decisions ADD COLUMN IF NOT EXISTS visibility text not null default 'client' check (visibility in ('client','internal'))`;

    await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS visibility text not null default 'client' check (visibility in ('client','internal'))`;

    return NextResponse.json({ ok: true, message: 'Proje tabloları ve visibility kolonları oluşturuldu.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
