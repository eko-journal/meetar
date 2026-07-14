import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { title, type, notes } = await req.json();

  if (!notes?.trim()) {
    return NextResponse.json({ error: 'Notlar boş olamaz' }, { status: 400 });
  }

  const meetingTypeLabel =
    type === 'customer' ? 'Müşteri toplantısı' :
    type === 'partner'  ? 'Ortak toplantısı'   : 'İç toplantı';

  const prompt = `Sen bir toplantı asistanısın. Aşağıdaki toplantı notlarını/transkriptini analiz et ve yapılandırılmış bilgi çıkar.

Toplantı: ${title}
Tür: ${meetingTypeLabel}

Notlar/Transkript:
${notes}

Aşağıdaki JSON formatında cevap ver (başka hiçbir şey yazma, markdown kullanma):
{
  "summary": "3-5 maddelik kısa özet (string, madde işaretleri için \\n- kullan)",
  "tasks": [
    { "title": "görev açıklaması", "assignee": "kim yapacak (bilinmiyorsa null)", "due_date": "tarih (bilinmiyorsa null)", "priority": "high|medium|low" }
  ],
  "decisions": [
    { "content": "alınan karar" }
  ],
  "commitments": [
    { "party": "me|them", "content": "taahhüt içeriği", "due_date": "tarih (bilinmiyorsa null)" }
  ],
  "next_meeting_topics": ["bir sonraki toplantıda konuşulması gereken maddeler"]
}

"me" = toplantıyı giren kişi (Selman), "them" = karşı taraf.
Tarihler varsa ISO formatında yaz (YYYY-MM-DD). Türkçe cevapla.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content ?? '{}';
    const extracted = JSON.parse(raw);

    const { rows: [meeting] } = await sql`
      INSERT INTO meetings (title, type, raw_notes, summary)
      VALUES (${title}, ${type}, ${notes}, ${extracted.summary})
      RETURNING id
    `;

    const meetingId = meeting.id;

    if (extracted.tasks?.length) {
      for (const t of extracted.tasks) {
        await sql`
          INSERT INTO tasks (meeting_id, title, assignee, due_date, priority)
          VALUES (${meetingId}, ${t.title}, ${t.assignee}, ${t.due_date}, ${t.priority ?? 'medium'})
        `;
      }
    }

    if (extracted.decisions?.length) {
      for (const d of extracted.decisions) {
        await sql`
          INSERT INTO decisions (meeting_id, content)
          VALUES (${meetingId}, ${d.content})
        `;
      }
    }

    if (extracted.commitments?.length) {
      for (const c of extracted.commitments) {
        await sql`
          INSERT INTO commitments (meeting_id, party, content, due_date)
          VALUES (${meetingId}, ${c.party}, ${c.content}, ${c.due_date})
        `;
      }
    }

    return NextResponse.json({ ...extracted, meeting_id: meetingId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
