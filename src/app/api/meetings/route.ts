import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const { rows: meetings } = await sql`
      SELECT m.id, m.title, m.type, m.summary, m.scheduled_at, m.created_at,
             c.name as company_name
      FROM meetings m
      LEFT JOIN companies c ON c.id = m.company_id
      ORDER BY m.scheduled_at DESC
    `;

    for (const m of meetings) {
      const { rows: tasks } = await sql`SELECT * FROM tasks WHERE meeting_id = ${m.id}`;
      const { rows: decisions } = await sql`SELECT * FROM decisions WHERE meeting_id = ${m.id}`;
      const { rows: commitments } = await sql`SELECT * FROM commitments WHERE meeting_id = ${m.id}`;
      m.tasks = tasks;
      m.decisions = decisions;
      m.commitments = commitments;
    }

    return NextResponse.json(meetings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
