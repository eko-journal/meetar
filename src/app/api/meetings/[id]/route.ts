import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { rows: [meeting] } = await sql`
      SELECT m.*, c.name as company_name
      FROM meetings m
      LEFT JOIN companies c ON c.id = m.company_id
      WHERE m.id = ${id}
    `;
    if (!meeting) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    const { rows: tasks } = await sql`SELECT * FROM tasks WHERE meeting_id = ${id} ORDER BY created_at ASC`;
    const { rows: decisions } = await sql`SELECT * FROM decisions WHERE meeting_id = ${id} ORDER BY created_at ASC`;
    const { rows: commitments } = await sql`SELECT * FROM commitments WHERE meeting_id = ${id} ORDER BY created_at ASC`;

    meeting.tasks = tasks;
    meeting.decisions = decisions;
    meeting.commitments = commitments;

    return NextResponse.json(meeting);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ['title', 'type', 'company_id', 'scheduled_at', 'summary', 'project_id'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });

  try {
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    const { rows: [meeting] } = await sql.query(
      `UPDATE meetings SET ${sets} WHERE id = $1 RETURNING *`,
      values
    );
    return NextResponse.json(meeting);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await sql`DELETE FROM meetings WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
