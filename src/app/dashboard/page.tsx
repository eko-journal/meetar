'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

interface Task {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: Priority;
  meeting_title: string;
  meeting_type: string;
}

interface Meeting {
  id: string;
  title: string;
  type: string;
  summary: string;
  scheduled_at: string;
  created_at: string;
  company_name: string | null;
  tasks: Task[];
  decisions: { id: string; content: string }[];
  commitments: { id: string; party: string; content: string; resolved: boolean }[];
}

const priorityStyle: Record<Priority, { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEF2F2', text: '#B91C1C', label: 'Yüksek' },
  medium: { bg: '#FFF7ED', text: '#C08457', label: 'Orta'   },
  low:    { bg: '#F1F6E8', text: '#5F7F3F', label: 'Düşük'  },
};

const meetingTypeLabel: Record<string, string> = {
  customer: 'Müşteri',
  internal: 'İç',
  partner: 'Ortak',
};

const meetingTypeStyle: Record<string, { bg: string; text: string }> = {
  customer: { bg: '#EFF6FF', text: '#6A9BCC' },
  internal: { bg: 'var(--warm)', text: 'var(--text2)' },
  partner:  { bg: 'var(--sage-lt)', text: 'var(--sage)' },
};

export default function Dashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'open' | 'all'>('open');
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/meetings').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([m, t]) => {
      setMeetings(Array.isArray(m) ? m : []);
      setTasks(Array.isArray(t) ? t : []);
      setLoading(false);
    });
  }, []);

  async function toggleTask(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'open' : 'done';
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  }

  const filteredTasks = taskFilter === 'open'
    ? tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
    : tasks;

  const openTaskCount = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const pendingCommitments = meetings.flatMap(m => m.commitments?.filter(c => !c.resolved) ?? []).length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 140 140" fill="none">
            <path d="M107 39A48 48 0 1 0 107 101" stroke="#D97757" strokeWidth="11" strokeLinecap="round"/>
            <circle cx="70" cy="70" r="7" fill="#788C5D"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--black)', letterSpacing: '-0.3px' }}>meetar</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <Link href="/dashboard" style={{ color: 'var(--clay)', fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
          <Link href="/" style={{ color: 'var(--text2)', textDecoration: 'none' }}>+ Yeni Toplantı</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>

        {/* Özet kartlar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          <StatCard label="Toplantı" value={meetings.length} />
          <StatCard label="Açık görev" value={openTaskCount} accent={openTaskCount > 0 ? 'var(--copper)' : undefined} />
          <StatCard label="Bekleyen taahhüt" value={pendingCommitments} accent={pendingCommitments > 0 ? '#B91C1C' : undefined} />
        </div>

        {/* Görevler */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Label>Görevler</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['open', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: taskFilter === f ? 'var(--clay)' : 'var(--warm)',
                    color: taskFilter === f ? 'white' : 'var(--text2)',
                    fontWeight: taskFilter === f ? 600 : 400,
                  }}
                >
                  {f === 'open' ? 'Açık' : 'Tümü'}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', padding: '16px 0' }}>Görev yok.</p>
          ) : (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10 }}>
              {filteredTasks.map((task, i) => {
                const s = priorityStyle[task.priority];
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px',
                    borderBottom: i < filteredTasks.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => toggleTask(task)}
                      style={{ marginTop: 3, accentColor: 'var(--clay)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: task.status === 'done' ? 'var(--text3)' : 'var(--black)', margin: 0, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{task.meeting_title}</span>
                        {task.assignee && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>· {task.assignee}</span>}
                        {task.due_date && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>· {task.due_date}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.text, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Toplantı geçmişi */}
        <div>
          <Label style={{ marginBottom: 12 }}>Toplantı Geçmişi</Label>
          {meetings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', padding: '16px 0' }}>Henüz toplantı yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meetings.map(m => {
                const ts = meetingTypeStyle[m.type] ?? meetingTypeStyle.internal;
                const expanded = expandedMeeting === m.id;
                return (
                  <div key={m.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedMeeting(expanded ? null : m.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ts.bg, color: ts.text }}>
                          {meetingTypeLabel[m.type]}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--black)' }}>{m.title}</span>
                        {m.company_name && (
                          <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>· {m.company_name}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(m.scheduled_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{expanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {expanded && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {m.summary && (
                          <p style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-line', lineHeight: 1.7, margin: 0 }}>{m.summary}</p>
                        )}
                        {m.tasks?.length > 0 && (
                          <SubSection label="Görevler">
                            {m.tasks.map(t => (
                              <li key={t.id} style={{ fontSize: 13, color: t.status === 'done' ? 'var(--text3)' : 'var(--text1)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                                {t.title}
                              </li>
                            ))}
                          </SubSection>
                        )}
                        {m.decisions?.length > 0 && (
                          <SubSection label="Kararlar">
                            {m.decisions.map(d => (
                              <li key={d.id} style={{ fontSize: 13, color: 'var(--text1)' }}>
                                <span style={{ color: 'var(--clay)', marginRight: 6 }}>▸</span>{d.content}
                              </li>
                            ))}
                          </SubSection>
                        )}
                        {m.commitments?.length > 0 && (
                          <SubSection label="Taahhütler">
                            {m.commitments.map(c => (
                              <li key={c.id} style={{ fontSize: 13, color: 'var(--text1)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                                <span style={{
                                  fontSize: 10, padding: '1px 6px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
                                  background: c.party === 'me' ? '#EFF6FF' : 'var(--sage-lt)',
                                  color: c.party === 'me' ? '#6A9BCC' : 'var(--sage)',
                                }}>
                                  {c.party === 'me' ? 'Ben' : 'Onlar'}
                                </span>
                                {c.content}
                              </li>
                            ))}
                          </SubSection>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, color: accent ?? 'var(--black)', margin: 0, letterSpacing: '-0.5px' }}>{value}</p>
    </div>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', display: 'block', ...style }}>
      {children}
    </p>
  );
}

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{label}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ul>
    </div>
  );
}
