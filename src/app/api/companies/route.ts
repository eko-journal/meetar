import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await sql`SELECT id, name FROM companies ORDER BY name ASC`;
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'İsim boş olamaz' }, { status: 400 });

  try {
    const { rows: [company] } = await sql`
      INSERT INTO companies (name) VALUES (${name.trim()})
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `;
    return NextResponse.json(company);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
