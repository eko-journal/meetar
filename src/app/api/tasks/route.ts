import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { meeting_id, title, assignee, due_date, priority } = await req.json();
  if (!meeting_id || !title?.trim()) return NextResponse.json({ error: 'meeting_id ve title gerekli' }, { status: 400 });
  try {
    const { rows: [task] } = await sql`
      INSERT INTO tasks (meeting_id, title, assignee, due_date, priority)
      VALUES (${meeting_id}, ${title.trim()}, ${assignee || null}, ${due_date || null}, ${priority || 'medium'})
      RETURNING *
    `;
    return NextResponse.json(task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT t.*, m.title as meeting_title, m.type as meeting_type
      FROM tasks t
      LEFT JOIN meetings m ON m.id = t.meeting_id
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
