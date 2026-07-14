import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { meeting_id, content } = await req.json();
  if (!meeting_id || !content?.trim()) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 });
  try {
    const { rows: [d] } = await sql`
      INSERT INTO decisions (meeting_id, content) VALUES (${meeting_id}, ${content.trim()}) RETURNING *
    `;
    return NextResponse.json(d);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
