import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { meeting_id, party, content } = await req.json();
  if (!meeting_id || !party || !content?.trim()) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 });
  try {
    const { rows: [c] } = await sql`
      INSERT INTO commitments (meeting_id, party, content) VALUES (${meeting_id}, ${party}, ${content.trim()}) RETURNING *
    `;
    return NextResponse.json(c);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
