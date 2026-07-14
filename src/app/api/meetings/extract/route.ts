import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

Aşağıdaki JSON formatında cevap ver (başka hiçbir şey yazma):
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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'AI çıkarma hatası' }, { status: 500 });
  }
}
