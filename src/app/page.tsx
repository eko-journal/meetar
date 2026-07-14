'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Priority = 'high' | 'medium' | 'low';
type Party = 'me' | 'them';

interface Company { id: string; name: string; }

interface Task {
  title: string;
  assignee: string | null;
  due_date: string | null;
  priority: Priority;
}

interface Decision { content: string; }

interface Commitment {
  party: Party;
  content: string;
  due_date: string | null;
}

interface ExtractResult {
  summary: string;
  tasks: Task[];
  decisions: Decision[];
  commitments: Commitment[];
  next_meeting_topics: string[];
}

const priorityStyle: Record<Priority, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEF2F2', text: '#B91C1C', label: 'Yüksek' },
  medium: { bg: '#FFF7ED', text: '#C08457', label: 'Orta'   },
  low:    { bg: '#F1F6E8', text: '#5F7F3F', label: 'Düşük'  },
};

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, color: 'var(--black)',
  background: 'white', outline: 'none', fontFamily: 'inherit', width: '100%',
};

export default function Home() {
  const [title, setTitle]       = useState('');
  const [type, setType]         = useState<'customer' | 'internal' | 'partner'>('internal');
  const [notes, setNotes]       = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [addingCompany, setAddingCompany] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<ExtractResult | null>(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCompanies(data);
    });
  }, []);

  async function handleAddCompany() {
    if (!newCompany.trim()) return;
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompany.trim() }),
    });
    const company = await res.json();
    if (company?.id) {
      setCompanies(prev => [...prev, company].sort((a, b) => a.name.localeCompare(b.name)));
      setCompanyId(company.id);
      setNewCompany('');
      setAddingCompany(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/meetings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, notes, company_id: companyId || null, meeting_date: meetingDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 140 140" fill="none">
            <path d="M107 39A48 48 0 1 0 107 101" stroke="#D97757" strokeWidth="11" strokeLinecap="round"/>
            <circle cx="70" cy="70" r="7" fill="#788C5D"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--black)', letterSpacing: '-0.3px' }}>meetar</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <Link href="/dashboard" style={{ color: 'var(--text2)', textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/" style={{ color: 'var(--clay)', fontWeight: 600, textDecoration: 'none' }}>+ Yeni Toplantı</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 28, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Toplantı notunu gir, AI çıkarsın
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>

          {/* Başlık + Tür */}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Toplantı başlığı"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              style={{ ...inputStyle, width: 'auto', color: 'var(--text2)' }}
            >
              <option value="internal">İç toplantı</option>
              <option value="customer">Müşteri</option>
              <option value="partner">Ortak</option>
            </select>
          </div>

          {/* Tarih */}
          <input
            type="datetime-local"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            style={{ ...inputStyle, color: meetingDate ? 'var(--black)' : 'var(--text3)', width: 'auto' }}
          />

          {/* Şirket seçimi */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {addingCompany ? (
              <>
                <input
                  type="text"
                  placeholder="Şirket adı"
                  value={newCompany}
                  onChange={e => setNewCompany(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCompany())}
                  autoFocus
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={handleAddCompany}
                  style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--clay)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Ekle
                </button>
                <button type="button" onClick={() => setAddingCompany(false)}
                  style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--warm)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                  İptal
                </button>
              </>
            ) : (
              <>
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  style={{ ...inputStyle, color: companyId ? 'var(--black)' : 'var(--text3)' }}
                >
                  <option value="">Şirket seç (opsiyonel)</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setAddingCompany(true)}
                  style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--warm)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, whiteSpace: 'nowrap' }}>
                  + Yeni
                </button>
              </>
            )}
          </div>

          {/* Notlar */}
          <textarea
            placeholder="Toplantı notlarını veya Teams transkriptini buraya yapıştır..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={10}
            required
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--border)' : 'var(--clay)',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '11px 0', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
          >
            {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
          </button>
        </form>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #B91C1C', color: '#B91C1C', borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section label="Özet">
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>{result.summary}</p>
            </Section>

            {result.tasks.length > 0 && (
              <Section label={`Görevler (${result.tasks.length})`}>
                {result.tasks.map((task, i) => {
                  const s = priorityStyle[task.priority];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < result.tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <input type="checkbox" style={{ marginTop: 3, accentColor: 'var(--clay)', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, color: 'var(--black)', margin: 0 }}>{task.title}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {task.assignee && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{task.assignee}</span>}
                          {task.due_date && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>· {task.due_date}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </Section>
            )}

            {result.decisions.length > 0 && (
              <Section label={`Kararlar (${result.decisions.length})`}>
                {result.decisions.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < result.decisions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ color: 'var(--clay)', marginTop: 1 }}>▸</span>
                    <p style={{ fontSize: 14, color: 'var(--text1)', margin: 0, lineHeight: 1.5 }}>{d.content}</p>
                  </div>
                ))}
              </Section>
            )}

            {result.commitments.length > 0 && (
              <Section label={`Taahhütler (${result.commitments.length})`}>
                {result.commitments.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: i < result.commitments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap',
                      background: c.party === 'me' ? '#EFF6FF' : 'var(--sage-lt)',
                      color: c.party === 'me' ? '#6A9BCC' : 'var(--sage)',
                    }}>
                      {c.party === 'me' ? 'Ben' : 'Karşı taraf'}
                    </span>
                    <p style={{ fontSize: 14, color: 'var(--text1)', margin: 0, lineHeight: 1.5 }}>{c.content}</p>
                    {c.due_date && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{c.due_date}</span>}
                  </div>
                ))}
              </Section>
            )}

            {result.next_meeting_topics.length > 0 && (
              <Section label="Sonraki toplantıya taşı">
                {result.next_meeting_topics.map((t, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'var(--text2)', margin: '4px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--border)' }}>·</span> {t}
                  </p>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 12, margin: '0 0 12px' }}>{label}</p>
      {children}
    </div>
  );
}
