'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

type Visibility = 'client' | 'internal';

interface Task {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: Priority;
  visibility: Visibility;
}

interface Decision {
  id: string;
  content: string;
  visibility: Visibility;
}

interface Commitment {
  id: string;
  party: 'me' | 'them';
  content: string;
  resolved: boolean;
  visibility: Visibility;
}

interface Meeting {
  id: string;
  title: string;
  type: string;
  company_id: string | null;
  company_name: string | null;
  project_id: string | null;
  scheduled_at: string;
  summary: string | null;
  raw_notes: string | null;
  tasks: Task[];
  decisions: Decision[];
  commitments: Commitment[];
}

interface Project { id: string; name: string; }

interface Company {
  id: string;
  name: string;
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
  internal: { bg: '#F0EDE4', text: '#6E665A' },
  partner:  { bg: '#F1F6E8', text: '#788C5D' },
};

function useError() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useError();

  // Inline editing
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryVal, setSummaryVal] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitleVal, setTaskTitleVal] = useState('');
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [decisionVal, setDecisionVal] = useState('');

  // New item forms
  const [newTask, setNewTask] = useState({ title: '', assignee: '', due_date: '', priority: 'medium' as Priority });
  const [newDecision, setNewDecision] = useState('');
  const [newComm, setNewComm] = useState({ party: 'me' as 'me' | 'them', content: '' });
  const [saving, setSaving] = useState(false);

  const summaryRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/meetings/${id}`).then(r => r.json()),
      fetch('/api/companies').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([m, c, p]) => {
      if (m.error) { setErrorMsg('Toplantı yüklenemedi.'); return; }
      setMeeting(m);
      setCompanies(Array.isArray(c) ? c : []);
      setProjects(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (editingSummary && summaryRef.current) {
      summaryRef.current.style.height = 'auto';
      summaryRef.current.style.height = summaryRef.current.scrollHeight + 'px';
    }
  }, [editingSummary, summaryVal]);

  async function patchMeeting(fields: Record<string, string | null>) {
    if (!meeting) return;
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      setMeeting(prev => prev ? { ...prev, ...fields } : prev);
    } catch {
      setErrorMsg('Kaydedilemedi. Tekrar deneyin.');
    }
  }

  async function saveTitle() {
    if (!titleVal.trim()) { setEditingTitle(false); return; }
    await patchMeeting({ title: titleVal.trim() });
    setEditingTitle(false);
  }

  async function saveSummary() {
    await patchMeeting({ summary: summaryVal.trim() || null });
    setEditingSummary(false);
  }

  // Tasks
  async function toggleTask(task: Task) {
    const newStatus: TaskStatus = task.status === 'done' ? 'open' : 'done';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setMeeting(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t),
      } : prev);
    } catch {
      setErrorMsg('Görev güncellenemedi.');
    }
  }

  async function saveTaskTitle(taskId: string) {
    if (!taskTitleVal.trim()) { setEditingTaskId(null); return; }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitleVal.trim() }),
      });
      if (!res.ok) throw new Error();
      setMeeting(prev => prev ? {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, title: taskTitleVal.trim() } : t),
      } : prev);
      setEditingTaskId(null);
    } catch {
      setErrorMsg('Görev kaydedilemedi.');
    }
  }

  async function toggleVisibility(type: 'task' | 'decision' | 'commitment', itemId: string, current: Visibility) {
    const next: Visibility = current === 'client' ? 'internal' : 'client';
    const endpoint = type === 'task' ? `/api/tasks/${itemId}` : type === 'decision' ? `/api/decisions/${itemId}` : `/api/commitments/${itemId}`;
    try {
      await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility: next }) });
      setMeeting(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: type === 'task' ? prev.tasks.map(t => t.id === itemId ? { ...t, visibility: next } : t) : prev.tasks,
          decisions: type === 'decision' ? prev.decisions.map(d => d.id === itemId ? { ...d, visibility: next } : d) : prev.decisions,
          commitments: type === 'commitment' ? prev.commitments.map(c => c.id === itemId ? { ...c, visibility: next } : c) : prev.commitments,
        };
      });
    } catch { setErrorMsg('Görünürlük güncellenemedi.'); }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm('Bu görevi silmek istediğine emin misin?')) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setMeeting(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) } : prev);
    } catch {
      setErrorMsg('Görev silinemedi.');
    }
  }

  async function addTask() {
    if (!newTask.title.trim() || !meeting) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meeting.id, ...newTask }),
      });
      if (!res.ok) throw new Error();
      const task = await res.json();
      setMeeting(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
      setNewTask({ title: '', assignee: '', due_date: '', priority: 'medium' });
    } catch {
      setErrorMsg('Görev eklenemedi.');
    } finally {
      setSaving(false);
    }
  }

  // Decisions
  async function saveDecision(decisionId: string) {
    if (!decisionVal.trim()) { setEditingDecisionId(null); return; }
    try {
      const res = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: decisionVal.trim() }),
      });
      if (!res.ok) throw new Error();
      setMeeting(prev => prev ? {
        ...prev,
        decisions: prev.decisions.map(d => d.id === decisionId ? { ...d, content: decisionVal.trim() } : d),
      } : prev);
      setEditingDecisionId(null);
    } catch {
      setErrorMsg('Karar kaydedilemedi.');
    }
  }

  async function deleteDecision(decisionId: string) {
    try {
      await fetch(`/api/decisions/${decisionId}`, { method: 'DELETE' });
      setMeeting(prev => prev ? { ...prev, decisions: prev.decisions.filter(d => d.id !== decisionId) } : prev);
    } catch {
      setErrorMsg('Karar silinemedi.');
    }
  }

  async function addDecision() {
    if (!newDecision.trim() || !meeting) return;
    setSaving(true);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meeting.id, content: newDecision.trim() }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMeeting(prev => prev ? { ...prev, decisions: [...prev.decisions, d] } : prev);
      setNewDecision('');
    } catch {
      setErrorMsg('Karar eklenemedi.');
    } finally {
      setSaving(false);
    }
  }

  // Commitments
  async function toggleCommitment(c: Commitment) {
    try {
      const res = await fetch(`/api/commitments/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !c.resolved }),
      });
      if (!res.ok) throw new Error();
      setMeeting(prev => prev ? {
        ...prev,
        commitments: prev.commitments.map(x => x.id === c.id ? { ...x, resolved: !c.resolved } : x),
      } : prev);
    } catch {
      setErrorMsg('Taahhüt güncellenemedi.');
    }
  }

  async function deleteCommitment(cId: string) {
    try {
      await fetch(`/api/commitments/${cId}`, { method: 'DELETE' });
      setMeeting(prev => prev ? { ...prev, commitments: prev.commitments.filter(x => x.id !== cId) } : prev);
    } catch {
      setErrorMsg('Taahhüt silinemedi.');
    }
  }

  async function addCommitment() {
    if (!newComm.content.trim() || !meeting) return;
    setSaving(true);
    try {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meeting.id, ...newComm }),
      });
      if (!res.ok) throw new Error();
      const c = await res.json();
      setMeeting(prev => prev ? { ...prev, commitments: [...prev.commitments, c] } : prev);
      setNewComm({ party: 'me', content: '' });
    } catch {
      setErrorMsg('Taahhüt eklenemedi.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeeting() {
    if (!window.confirm('Bu toplantıyı silmek istediğine emin misin? Tüm görevler, kararlar ve taahhütler de silinecek.')) return;
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Yükleniyor...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Toplantı bulunamadı. <Link href="/dashboard" style={{ color: 'var(--clay)' }}>Dashboard'a dön</Link></p>
      </div>
    );
  }

  const ts = meetingTypeStyle[meeting.type] ?? meetingTypeStyle.internal;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      {errorMsg && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, color: '#B91C1C', zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', whiteSpace: 'nowrap',
        }}>
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
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Dashboard
          </Link>
        </div>
        <button
          onClick={deleteMeeting}
          style={{ fontSize: 12, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          Toplantıyı Sil
        </button>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          {/* Type + Company row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <select
              value={meeting.type}
              onChange={e => {
                setMeeting(prev => prev ? { ...prev, type: e.target.value } : prev);
                patchMeeting({ type: e.target.value });
              }}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: ts.bg, color: ts.text }}
            >
              <option value="customer">Müşteri</option>
              <option value="internal">İç</option>
              <option value="partner">Ortak</option>
            </select>

            <select
              value={meeting.company_id ?? ''}
              onChange={e => {
                const val = e.target.value || null;
                const name = companies.find(c => c.id === val)?.name ?? null;
                setMeeting(prev => prev ? { ...prev, company_id: val, company_name: name } : prev);
                patchMeeting({ company_id: val });
              }}
              style={{ fontSize: 12, color: 'var(--text2)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value="">Şirket seç...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {projects.length > 0 && (
              <select
                value={meeting.project_id ?? ''}
                onChange={e => {
                  const val = e.target.value || null;
                  setMeeting(prev => prev ? { ...prev, project_id: val } : prev);
                  patchMeeting({ project_id: val });
                }}
                style={{ fontSize: 12, color: meeting.project_id ? 'var(--sage)' : 'var(--text3)', background: meeting.project_id ? 'var(--sage-lt)' : 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <option value="">Projeye bağla...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            <input
              type="datetime-local"
              value={meeting.scheduled_at ? meeting.scheduled_at.slice(0, 16) : ''}
              onChange={e => {
                setMeeting(prev => prev ? { ...prev, scheduled_at: e.target.value } : prev);
              }}
              onBlur={e => patchMeeting({ scheduled_at: e.target.value })}
              style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
            />
          </div>

          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              style={{ fontSize: 26, fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.5px', border: '1px solid var(--clay)', borderRadius: 8, padding: '4px 10px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
            />
          ) : (
            <h1
              onDoubleClick={() => { setTitleVal(meeting.title); setEditingTitle(true); }}
              title="Düzenlemek için çift tıkla"
              style={{ fontSize: 26, fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.5px', margin: 0, cursor: 'text' }}
            >
              {meeting.title}
            </h1>
          )}

          {/* Summary */}
          <div style={{ marginTop: 16 }}>
            {editingSummary ? (
              <textarea
                ref={summaryRef}
                autoFocus
                value={summaryVal}
                onChange={e => { setSummaryVal(e.target.value); if (summaryRef.current) { summaryRef.current.style.height = 'auto'; summaryRef.current.style.height = summaryRef.current.scrollHeight + 'px'; } }}
                onBlur={saveSummary}
                onKeyDown={e => { if (e.key === 'Escape') saveSummary(); }}
                placeholder="Toplantı özeti..."
                style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, border: '1px solid var(--clay)', borderRadius: 8, padding: '8px 12px', fontFamily: 'inherit', width: '100%', outline: 'none', resize: 'none', overflow: 'hidden', minHeight: 80 }}
              />
            ) : (
              <p
                onDoubleClick={() => { setSummaryVal(meeting.summary ?? ''); setEditingSummary(true); }}
                title="Düzenlemek için çift tıkla"
                style={{ fontSize: 14, color: meeting.summary ? 'var(--text2)' : 'var(--text3)', lineHeight: 1.7, margin: 0, cursor: 'text', whiteSpace: 'pre-line' }}
              >
                {meeting.summary || 'Özet yok — düzenlemek için çift tıkla'}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ORİJİNAL NOTLAR */}
          {meeting.raw_notes && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setNotesExpanded(p => !p)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                  Orijinal Notlar
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{notesExpanded ? '▲' : '▼'}</span>
              </button>
              {notesExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
                  <pre style={{
                    fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                    margin: 0, fontFamily: 'var(--font-mono)', wordBreak: 'break-word',
                  }}>
                    {meeting.raw_notes}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* GÖREVLER */}
          <Section label="Görevler">
            {meeting.tasks.map(task => {
              const s = priorityStyle[task.priority];
              const isEditing = editingTaskId === task.id;
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => toggleTask(task)}
                    style={{ marginTop: 3, accentColor: 'var(--clay)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={taskTitleVal}
                        onChange={e => setTaskTitleVal(e.target.value)}
                        onBlur={() => saveTaskTitle(task.id)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTaskTitle(task.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                        style={{ fontSize: 14, border: '1px solid var(--clay)', borderRadius: 6, padding: '2px 8px', fontFamily: 'inherit', width: '100%', outline: 'none' }}
                      />
                    ) : (
                      <p
                        onDoubleClick={() => { setTaskTitleVal(task.title); setEditingTaskId(task.id); }}
                        style={{ fontSize: 14, color: task.status === 'done' ? 'var(--text3)' : 'var(--black)', margin: 0, textDecoration: task.status === 'done' ? 'line-through' : 'none', cursor: 'text' }}
                      >
                        {task.title}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {task.assignee && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{task.assignee}</span>}
                      {task.due_date && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>· {task.due_date}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.text }}>{s.label}</span>
                    <button onClick={() => toggleVisibility('task', task.id, task.visibility)}
                      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                        background: task.visibility === 'client' ? '#EFF6FF' : 'var(--warm)', color: task.visibility === 'client' ? '#6A9BCC' : 'var(--text3)' }}>
                      {task.visibility === 'client' ? '👁' : '🔒'}
                    </button>
                    <button onClick={() => { setTaskTitleVal(task.title); setEditingTaskId(task.id); }} style={iconBtn}>✎</button>
                    <button onClick={() => deleteTask(task.id)} style={iconBtn}>×</button>
                  </div>
                </div>
              );
            })}

            {/* Yeni görev */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Yeni görev..."
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
                  style={addInput}
                />
                <input
                  placeholder="Sorumlu"
                  value={newTask.assignee}
                  onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))}
                  style={{ ...addInput, maxWidth: 120 }}
                />
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                  style={{ ...addInput, maxWidth: 140 }}
                />
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Priority }))}
                  style={{ ...addInput, maxWidth: 90 }}
                >
                  <option value="high">Yüksek</option>
                  <option value="medium">Orta</option>
                  <option value="low">Düşük</option>
                </select>
                <AddButton onClick={addTask} disabled={saving || !newTask.title.trim()} />
              </div>
            </div>
          </Section>

          {/* KARARLAR */}
          <Section label="Kararlar">
            {meeting.decisions.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--clay)', marginTop: 1, flexShrink: 0 }}>▸</span>
                {editingDecisionId === d.id ? (
                  <input
                    autoFocus
                    value={decisionVal}
                    onChange={e => setDecisionVal(e.target.value)}
                    onBlur={() => saveDecision(d.id)}
                    onKeyDown={e => { if (e.key === 'Enter') saveDecision(d.id); if (e.key === 'Escape') setEditingDecisionId(null); }}
                    style={{ ...addInput, flex: 1 }}
                  />
                ) : (
                  <p
                    onDoubleClick={() => { setDecisionVal(d.content); setEditingDecisionId(d.id); }}
                    style={{ fontSize: 14, color: 'var(--text1)', margin: 0, flex: 1, cursor: 'text' }}
                  >
                    {d.content}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                  <button onClick={() => toggleVisibility('decision', d.id, d.visibility)}
                    style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                      background: d.visibility === 'client' ? '#EFF6FF' : 'var(--warm)', color: d.visibility === 'client' ? '#6A9BCC' : 'var(--text3)' }}>
                    {d.visibility === 'client' ? '👁' : '🔒'}
                  </button>
                  <button onClick={() => { setDecisionVal(d.content); setEditingDecisionId(d.id); }} style={iconBtn}>✎</button>
                  <button onClick={() => deleteDecision(d.id)} style={iconBtn}>×</button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                placeholder="Yeni karar..."
                value={newDecision}
                onChange={e => setNewDecision(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addDecision(); }}
                style={addInput}
              />
              <AddButton onClick={addDecision} disabled={saving || !newDecision.trim()} />
            </div>
          </Section>

          {/* TAAHHÜTLER */}
          <Section label="Taahhütler">
            {meeting.commitments.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
                  background: c.party === 'me' ? '#EFF6FF' : '#F1F6E8',
                  color: c.party === 'me' ? '#6A9BCC' : '#788C5D',
                }}>
                  {c.party === 'me' ? 'Ben' : 'Onlar'}
                </span>
                <p style={{ fontSize: 14, color: 'var(--text1)', margin: 0, flex: 1, textDecoration: c.resolved ? 'line-through' : 'none', opacity: c.resolved ? 0.5 : 1 }}>
                  {c.content}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => toggleVisibility('commitment', c.id, c.visibility)}
                    style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                      background: c.visibility === 'client' ? '#EFF6FF' : 'var(--warm)', color: c.visibility === 'client' ? '#6A9BCC' : 'var(--text3)' }}>
                    {c.visibility === 'client' ? '👁' : '🔒'}
                  </button>
                  <button
                    onClick={() => toggleCommitment(c)}
                    title={c.resolved ? 'Çözülmedi olarak işaretle' : 'Çözümlendi olarak işaretle'}
                    style={{ fontSize: 13, background: c.resolved ? 'var(--sage-lt)' : 'var(--warm)', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: c.resolved ? 'var(--sage)' : 'var(--text3)', fontFamily: 'inherit', fontWeight: 600 }}
                  >
                    {c.resolved ? '✓ Çözümlendi' : 'Çözümle'}
                  </button>
                  <button onClick={() => deleteCommitment(c.id)} style={iconBtn}>×</button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <select
                value={newComm.party}
                onChange={e => setNewComm(p => ({ ...p, party: e.target.value as 'me' | 'them' }))}
                style={{ ...addInput, maxWidth: 90 }}
              >
                <option value="me">Ben</option>
                <option value="them">Onlar</option>
              </select>
              <input
                placeholder="Yeni taahhüt..."
                value={newComm.content}
                onChange={e => setNewComm(p => ({ ...p, content: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addCommitment(); }}
                style={addInput}
              />
              <AddButton onClick={addCommitment} disabled={saving || !newComm.content.trim()} />
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: '2px 4px', lineHeight: 1,
};

const addInput: React.CSSProperties = {
  flex: 1, fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px',
  fontFamily: 'inherit', outline: 'none', background: 'white', color: 'var(--black)',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function AddButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px', borderRadius: 6, border: 'none', cursor: disabled ? 'default' : 'pointer',
        background: disabled ? 'var(--warm)' : 'var(--clay)', color: disabled ? 'var(--text3)' : 'white',
        fontSize: 13, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
      }}
    >
      Ekle
    </button>
  );
}
