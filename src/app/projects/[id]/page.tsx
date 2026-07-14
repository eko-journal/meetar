'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
type Visibility = 'client' | 'internal';

interface Task { id: string; title: string; assignee: string | null; due_date: string | null; status: TaskStatus; priority: Priority; visibility: Visibility; }
interface Decision { id: string; content: string; visibility: Visibility; }
interface Commitment { id: string; party: 'me' | 'them'; content: string; resolved: boolean; visibility: Visibility; }
interface Meeting { id: string; title: string; type: string; scheduled_at: string; tasks: Task[]; decisions: Decision[]; commitments: Commitment[]; }

interface Project {
  id: string; name: string; status: 'active' | 'paused' | 'done';
  description: string | null; company_id: string | null; company_name: string | null;
  meetings: Meeting[];
  stats: { total_tasks: number; done_tasks: number; pending_commitments: number };
}

const priorityStyle: Record<Priority, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEF2F2', text: '#B91C1C', label: 'Yüksek' },
  medium: { bg: '#FFF7ED', text: '#C08457', label: 'Orta' },
  low:    { bg: '#F1F6E8', text: '#5F7F3F', label: 'Düşük' },
};

const meetingTypeLabel: Record<string, string> = { customer: 'Müşteri', internal: 'İç', partner: 'Ortak' };
const meetingTypeStyle: Record<string, { bg: string; text: string }> = {
  customer: { bg: '#EFF6FF', text: '#6A9BCC' },
  internal: { bg: '#F0EDE4', text: '#6E665A' },
  partner:  { bg: '#F1F6E8', text: '#788C5D' },
};

const statusOptions = [
  { value: 'active', label: 'Aktif', bg: '#F1F6E8', text: '#5F7F3F' },
  { value: 'paused', label: 'Beklemede', bg: '#FFF7ED', text: '#C08457' },
  { value: 'done',   label: 'Tamamlandı', bg: 'var(--warm)', text: 'var(--text3)' },
];

function VisibilityBtn({ visibility, onToggle }: { visibility: Visibility; onToggle: () => void }) {
  const isClient = visibility === 'client';
  return (
    <button onClick={onToggle} title={isClient ? 'Müşteriye görünür — tıkla gizlemek için' : 'İç — tıkla müşteriye açmak için'}
      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, flexShrink: 0,
        background: isClient ? '#EFF6FF' : 'var(--warm)', color: isClient ? '#6A9BCC' : 'var(--text3)' }}>
      {isClient ? '👁 Müşteri' : '🔒 İç'}
    </button>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'customer' | 'internal'>('all');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  useEffect(() => {
    fetch(`/api/projects/${id}`).then(r => r.json()).then(p => {
      if (p.error) { setErrorMsg('Proje yüklenemedi.'); return; }
      setProject(p);
      setLoading(false);
    });
  }, [id]);

  async function patchProject(fields: Record<string, string | null>) {
    try {
      await fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      setProject(prev => prev ? { ...prev, ...fields } : prev);
    } catch { setErrorMsg('Kaydedilemedi.'); }
  }

  async function toggleVisibility(type: 'task' | 'decision' | 'commitment', itemId: string, current: Visibility, meetingId: string) {
    const next: Visibility = current === 'client' ? 'internal' : 'client';
    const endpoint = type === 'task' ? `/api/tasks/${itemId}` : type === 'decision' ? `/api/decisions/${itemId}` : `/api/commitments/${itemId}`;
    try {
      await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility: next }) });
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          meetings: prev.meetings.map(m => {
            if (m.id !== meetingId) return m;
            return {
              ...m,
              tasks: type === 'task' ? m.tasks.map(t => t.id === itemId ? { ...t, visibility: next } : t) : m.tasks,
              decisions: type === 'decision' ? m.decisions.map(d => d.id === itemId ? { ...d, visibility: next } : d) : m.decisions,
              commitments: type === 'commitment' ? m.commitments.map(c => c.id === itemId ? { ...c, visibility: next } : c) : m.commitments,
            };
          }),
        };
      });
    } catch { setErrorMsg('Görünürlük güncellenemedi.'); }
  }

  function generateClientSummary(): string {
    if (!project) return '';
    const customerMeetings = project.meetings.filter(m => m.type === 'customer');
    if (!customerMeetings.length) return 'Müşteri toplantısı bulunamadı.';

    let text = '';
    for (const m of customerMeetings) {
      const clientDecisions = m.decisions.filter(d => d.visibility === 'client');
      const clientTasks = m.tasks.filter(t => t.visibility === 'client');
      const myComm = m.commitments.filter(c => c.visibility === 'client' && c.party === 'me');
      const theirComm = m.commitments.filter(c => c.visibility === 'client' && c.party === 'them');
      if (!clientDecisions.length && !clientTasks.length && !myComm.length && !theirComm.length) continue;

      text += `📅 ${m.title} — ${new Date(m.scheduled_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}\n\n`;
      if (clientDecisions.length) { text += `KARARLAR\n`; clientDecisions.forEach(d => { text += `▸ ${d.content}\n`; }); text += '\n'; }
      if (clientTasks.length) { text += `GÖREVLER\n`; clientTasks.forEach(t => { text += `□ ${t.title}${t.assignee ? ` — ${t.assignee}` : ''}${t.due_date ? ` — ${t.due_date}` : ''}\n`; }); text += '\n'; }
      if (myComm.length) { text += `BİZİM TAAHHÜTLERİMİZ\n`; myComm.forEach(c => { text += `• ${c.content}\n`; }); text += '\n'; }
      if (theirComm.length) { text += `ONLARIN TAAHHÜTLERİ\n`; theirComm.forEach(c => { text += `• ${c.content}\n`; }); text += '\n'; }
      text += '───────────────────\n\n';
    }
    return text.trim() || 'Müşteriye gösterilecek içerik yok.';
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generateClientSummary()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  async function deleteProject() {
    if (!window.confirm('Bu projeyi silmek istediğine emin misin? Toplantılar silinmez, sadece proje bağlantısı kaldırılır.')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/projects');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Yükleniyor...</p>
    </div>
  );

  if (!project) return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 13, color: 'var(--text3)' }}>Proje bulunamadı. <Link href="/projects" style={{ color: 'var(--clay)' }}>Projelere dön</Link></p>
    </div>
  );

  const { stats } = project;
  const progressPct = stats.total_tasks > 0 ? Math.round((stats.done_tasks / stats.total_tasks) * 100) : 0;
  const statusOpt = statusOptions.find(s => s.value === project.status) ?? statusOptions[0];
  const filteredMeetings = project.meetings.filter(m => meetingFilter === 'all' || m.type === meetingFilter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      {errorMsg && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#B91C1C', zIndex: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
          {errorMsg}
        </div>
      )}

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="20" height="20" viewBox="0 0 140 140" fill="none">
            <path d="M107 39A48 48 0 1 0 107 101" stroke="#D97757" strokeWidth="11" strokeLinecap="round"/>
            <circle cx="70" cy="70" r="7" fill="#788C5D"/>
          </svg>
          <Link href="/projects" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none' }}>← Projeler</Link>
        </div>
        <button onClick={deleteProject} style={{ fontSize: 12, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer' }}>Projeyi Sil</button>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <select value={project.status} onChange={e => { setProject(p => p ? { ...p, status: e.target.value as Project['status'] } : p); patchProject({ status: e.target.value }); }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: statusOpt.bg, color: statusOpt.text }}>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {project.company_name && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{project.company_name}</span>}
          </div>

          {editingName ? (
            <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
              onBlur={() => { if (nameVal.trim()) { patchProject({ name: nameVal.trim() }); } setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { if (nameVal.trim()) patchProject({ name: nameVal.trim() }); setEditingName(false); } if (e.key === 'Escape') setEditingName(false); }}
              style={{ fontSize: 24, fontWeight: 700, color: 'var(--black)', border: '1px solid var(--clay)', borderRadius: 8, padding: '4px 10px', fontFamily: 'inherit', width: '100%', outline: 'none', marginBottom: 12 }} />
          ) : (
            <h1 onDoubleClick={() => { setNameVal(project.name); setEditingName(true); }}
              style={{ fontSize: 24, fontWeight: 700, color: 'var(--black)', margin: '0 0 12px', cursor: 'text' }}>{project.name}</h1>
          )}

          {/* İlerleme */}
          {stats.total_tasks > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: 'var(--warm)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--sage)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {stats.done_tasks}/{stats.total_tasks} görev · {progressPct}%
              </span>
            </div>
          )}
        </div>

        {/* Müşteri Özeti */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
          <button onClick={() => setSummaryOpen(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              👁 Müşteri Özeti
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{summaryOpen ? '▲' : '▼'}</span>
          </button>
          {summaryOpen && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={copyToClipboard}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: copied ? 'var(--sage-lt)' : 'var(--warm)', color: copied ? 'var(--sage)' : 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  {copied ? '✓ Kopyalandı' : '📋 Kopyala'}
                </button>
                <a href={`mailto:?subject=${encodeURIComponent(project.name + ' — Toplantı Özeti')}&body=${encodeURIComponent(generateClientSummary())}`}
                  style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, background: 'var(--warm)', color: 'var(--text2)', border: '1px solid var(--border)', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 600 }}>
                  ✉ E-posta
                </a>
              </div>
              <pre style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-mono)', wordBreak: 'break-word', background: 'var(--ivory)', borderRadius: 8, padding: '12px 16px' }}>
                {generateClientSummary()}
              </pre>
            </div>
          )}
        </div>

        {/* Toplantılar */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Toplantılar ({project.meetings.length})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'customer', 'internal'] as const).map(f => (
                <button key={f} onClick={() => setMeetingFilter(f)}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: meetingFilter === f ? 'var(--clay)' : 'var(--warm)',
                    color: meetingFilter === f ? 'white' : 'var(--text2)', fontWeight: meetingFilter === f ? 600 : 400 }}>
                  {f === 'all' ? 'Tümü' : f === 'customer' ? 'Müşteri' : 'İç'}
                </button>
              ))}
            </div>
          </div>

          {filteredMeetings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 24px', margin: 0 }}>Bu filtrede toplantı yok.</p>
          ) : (
            filteredMeetings.map(m => {
              const ts = meetingTypeStyle[m.type] ?? meetingTypeStyle.internal;
              const clientItems = [...m.tasks.filter(t => t.visibility === 'client'), ...m.decisions.filter(d => d.visibility === 'client'), ...m.commitments.filter(c => c.visibility === 'client')].length;
              const internalItems = [...m.tasks.filter(t => t.visibility === 'internal'), ...m.decisions.filter(d => d.visibility === 'internal'), ...m.commitments.filter(c => c.visibility === 'internal')].length;

              return (
                <div key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ts.bg, color: ts.text }}>{meetingTypeLabel[m.type]}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{m.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(m.scheduled_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {clientItems > 0 && <span style={{ fontSize: 11, color: '#6A9BCC', fontFamily: 'var(--font-mono)' }}>👁 {clientItems} müşteri öğesi</span>}
                        {internalItems > 0 && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>🔒 {internalItems} iç öğe</span>}
                      </div>

                      {/* Görevler */}
                      {m.tasks.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', margin: '0 0 4px' }}>GÖREVLER</p>
                          {m.tasks.map(t => (
                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                              <span style={{ fontSize: 12, color: t.status === 'done' ? 'var(--text3)' : 'var(--text1)', flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                              {t.assignee && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{t.assignee}</span>}
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 600, background: priorityStyle[t.priority].bg, color: priorityStyle[t.priority].text }}>{priorityStyle[t.priority].label}</span>
                              <VisibilityBtn visibility={t.visibility} onToggle={() => toggleVisibility('task', t.id, t.visibility, m.id)} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Kararlar */}
                      {m.decisions.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', margin: '0 0 4px' }}>KARARLAR</p>
                          {m.decisions.map(d => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                              <span style={{ color: 'var(--clay)', fontSize: 11 }}>▸</span>
                              <span style={{ fontSize: 12, color: 'var(--text1)', flex: 1 }}>{d.content}</span>
                              <VisibilityBtn visibility={d.visibility} onToggle={() => toggleVisibility('decision', d.id, d.visibility, m.id)} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Taahhütler */}
                      {m.commitments.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', margin: '0 0 4px' }}>TAAHHÜTLEr</p>
                          {m.commitments.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 600, background: c.party === 'me' ? '#EFF6FF' : '#F1F6E8', color: c.party === 'me' ? '#6A9BCC' : '#788C5D' }}>
                                {c.party === 'me' ? 'Ben' : 'Onlar'}
                              </span>
                              <span style={{ fontSize: 12, color: 'var(--text1)', flex: 1, textDecoration: c.resolved ? 'line-through' : 'none', opacity: c.resolved ? 0.5 : 1 }}>{c.content}</span>
                              <VisibilityBtn visibility={c.visibility} onToggle={() => toggleVisibility('commitment', c.id, c.visibility, m.id)} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link href={`/meetings/${m.id}`} style={{ fontSize: 12, color: 'var(--clay)', textDecoration: 'none', fontWeight: 600, flexShrink: 0, marginTop: 2 }}>Düzenle →</Link>
                  </div>
                </div>
              );
            })
          )}

          {project.meetings.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
                Bu projeye henüz toplantı bağlanmamış.
                <br />
                <Link href="/" style={{ color: 'var(--clay)' }}>Yeni toplantı oluştururken</Link> bu projeyi seçebilirsin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
