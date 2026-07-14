import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

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
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
