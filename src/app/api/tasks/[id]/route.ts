import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();

  try {
    const { rows: [task] } = await sql`
      UPDATE tasks SET status = ${status}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(task);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
