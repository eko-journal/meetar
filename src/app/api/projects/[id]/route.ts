import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { rows: [project] } = await sql`
      SELECT p.*, c.name as company_name
      FROM projects p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = ${id}
    `;
    if (!project) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    const { rows: meetings } = await sql`
      SELECT m.*, c.name as company_name
      FROM meetings m
      LEFT JOIN companies c ON c.id = m.company_id
      WHERE m.project_id = ${id}
      ORDER BY m.scheduled_at DESC
    `;

    for (const m of meetings) {
      const { rows: tasks } = await sql`SELECT * FROM tasks WHERE meeting_id = ${m.id} ORDER BY created_at ASC`;
      const { rows: decisions } = await sql`SELECT * FROM decisions WHERE meeting_id = ${m.id} ORDER BY created_at ASC`;
      const { rows: commitments } = await sql`SELECT * FROM commitments WHERE meeting_id = ${m.id} ORDER BY created_at ASC`;
      m.tasks = tasks;
      m.decisions = decisions;
      m.commitments = commitments;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTasks = meetings.flatMap((m: any) => m.tasks as { status: string }[]);
    project.meetings = meetings;
    project.stats = {
      total_tasks: allTasks.length,
      done_tasks: allTasks.filter(t => t.status === 'done').length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pending_commitments: meetings.flatMap((m: any) => m.commitments as { resolved: boolean }[]).filter(c => !c.resolved).length,
    };

    return NextResponse.json(project);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ['name', 'status', 'description', 'company_id'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });

  try {
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    const { rows: [p] } = await sql.query(`UPDATE projects SET ${sets} WHERE id = $1 RETURNING *`, values);
    return NextResponse.json(p);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await sql`UPDATE meetings SET project_id = null WHERE project_id = ${id}`;
    await sql`DELETE FROM projects WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
