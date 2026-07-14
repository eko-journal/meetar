'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Company { id: string; name: string; }

interface Project {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'done';
  description: string | null;
  company_id: string | null;
  company_name: string | null;
  meeting_count: number;
  open_task_count: number;
  last_meeting_at: string | null;
}

const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#F1F6E8', text: '#5F7F3F', label: 'Aktif' },
  paused: { bg: '#FFF7ED', text: '#C08457', label: 'Beklemede' },
  done:   { bg: 'var(--warm)', text: 'var(--text3)', label: 'Tamamlandı' },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', company_id: '', status: 'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/companies').then(r => r.json()),
    ]).then(([p, c]) => {
      setProjects(Array.isArray(p) ? p : []);
      setCompanies(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, []);

  async function createProject() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: form.company_id || null }),
      });
      const p = await res.json();
      setProjects(prev => [p, ...prev]);
      setForm({ name: '', description: '', company_id: '', status: 'active' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ivory)' }}>
      <Nav active="projects" />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', margin: 0 }}>
            Projeler
          </p>
          <button
            onClick={() => setShowForm(p => !p)}
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, background: 'var(--clay)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
          >
            + Yeni Proje
          </button>
        </div>

        {showForm && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 24px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              autoFocus
              placeholder="Proje adı"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              style={inp}
            />
            <input
              placeholder="Açıklama (opsiyonel)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={inp}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))} style={{ ...inp, flex: 1 }}>
                <option value="">Şirket seç (opsiyonel)</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ ...inp, maxWidth: 140 }}>
                <option value="active">Aktif</option>
                <option value="paused">Beklemede</option>
                <option value="done">Tamamlandı</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createProject} disabled={saving || !form.name.trim()}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: saving || !form.name.trim() ? 'var(--warm)' : 'var(--clay)', color: saving || !form.name.trim() ? 'var(--text3)' : 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>
                Oluştur
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--warm)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                İptal
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 8 }}>Henüz proje yok.</p>
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Müşteri hesaplarını ve inisiyatiflerini projelerle yönet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(p => {
              const s = statusStyle[p.status];
              return (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--clay)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.text }}>{s.label}</span>
                        {p.company_name && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{p.company_name}</span>}
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--black)', margin: 0 }}>{p.name}</p>
                      {p.description && <p style={{ fontSize: 13, color: 'var(--text2)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 20, flexShrink: 0, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: p.open_task_count > 0 ? 'var(--copper)' : 'var(--text3)' }}>{p.open_task_count}</p>
                        <p style={{ margin: 0 }}>açık görev</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--black)' }}>{p.meeting_count}</p>
                        <p style={{ margin: 0 }}>toplantı</p>
                      </div>
                      {p.last_meeting_at && (
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: 'var(--black)' }}>
                            {new Date(p.last_meeting_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                          </p>
                          <p style={{ margin: 0 }}>son toplantı</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
  fontSize: 13, color: 'var(--black)', background: 'white', outline: 'none',
  fontFamily: 'inherit', width: '100%',
};

export function Nav({ active }: { active: 'home' | 'dashboard' | 'projects' }) {
  return (
    <nav style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 140 140" fill="none">
          <path d="M107 39A48 48 0 1 0 107 101" stroke="#D97757" strokeWidth="11" strokeLinecap="round"/>
          <circle cx="70" cy="70" r="7" fill="#788C5D"/>
        </svg>
        <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--black)', letterSpacing: '-0.3px' }}>meetar</span>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
        <Link href="/projects" style={{ color: active === 'projects' ? 'var(--clay)' : 'var(--text2)', fontWeight: active === 'projects' ? 600 : 400, textDecoration: 'none' }}>Projeler</Link>
        <Link href="/dashboard" style={{ color: active === 'dashboard' ? 'var(--clay)' : 'var(--text2)', fontWeight: active === 'dashboard' ? 600 : 400, textDecoration: 'none' }}>Dashboard</Link>
        <Link href="/" style={{ color: active === 'home' ? 'var(--clay)' : 'var(--text2)', fontWeight: active === 'home' ? 600 : 400, textDecoration: 'none' }}>+ Yeni Toplantı</Link>
      </div>
    </nav>
  );
}
