import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT p.*, c.name as company_name,
        COUNT(DISTINCT m.id) as meeting_count,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','cancelled')) as open_task_count,
        MAX(m.scheduled_at) as last_meeting_at
      FROM projects p
      LEFT JOIN companies c ON c.id = p.company_id
      LEFT JOIN meetings m ON m.project_id = p.id
      LEFT JOIN tasks t ON t.meeting_id = m.id
      GROUP BY p.id, c.name
      ORDER BY p.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { name, status, description, company_id } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'İsim gerekli' }, { status: 400 });
  try {
    const { rows: [p] } = await sql`
      INSERT INTO projects (name, status, description, company_id)
      VALUES (${name.trim()}, ${status ?? 'active'}, ${description ?? null}, ${company_id ?? null})
      RETURNING *
    `;
    return NextResponse.json(p);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
