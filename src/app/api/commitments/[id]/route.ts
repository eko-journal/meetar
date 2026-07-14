import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ['content', 'resolved', 'party'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });

  try {
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    const { rows: [c] } = await sql.query(
      `UPDATE commitments SET ${sets} WHERE id = $1 RETURNING *`,
      values
    );
    return NextResponse.json(c);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await sql`DELETE FROM commitments WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
