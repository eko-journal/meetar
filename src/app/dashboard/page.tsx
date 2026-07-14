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
  created_at: string;
  tasks: Task[];
  decisions: { id: string; content: string }[];
  commitments: { id: string; party: string; content: string; resolved: boolean }[];
}

const priorityColor: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const priorityLabel: Record<Priority, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

const meetingTypeLabel: Record<string, string> = {
  customer: 'Müşteri',
  internal: 'İç',
  partner: 'Ortak',
};

const meetingTypeColor: Record<string, string> = {
  customer: 'bg-blue-950 text-blue-300',
  internal: 'bg-gray-800 text-gray-400',
  partner: 'bg-purple-950 text-purple-300',
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
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-lg">meetar</span>
        <div className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-white font-medium">Dashboard</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors">+ Yeni Toplantı</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* Özet kartlar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Toplantı</p>
            <p className="text-3xl font-bold">{meetings.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Açık görev</p>
            <p className={`text-3xl font-bold ${openTaskCount > 0 ? 'text-yellow-400' : ''}`}>{openTaskCount}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Bekleyen taahhüt</p>
            <p className={`text-3xl font-bold ${pendingCommitments > 0 ? 'text-red-400' : ''}`}>{pendingCommitments}</p>
          </div>
        </div>

        {/* Görevler */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Görevler</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setTaskFilter('open')}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${taskFilter === 'open' ? 'bg-white text-gray-950' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Açık
              </button>
              <button
                onClick={() => setTaskFilter('all')}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${taskFilter === 'all' ? 'bg-white text-gray-950' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Tümü
              </button>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="text-gray-600 text-sm py-4">Görev yok.</p>
          ) : (
            <div className="bg-gray-900 rounded-xl divide-y divide-gray-800">
              {filteredTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => toggleTask(task)}
                    className="mt-0.5 accent-white cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-600' : 'text-gray-100'}`}>
                      {task.title}
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                      <span className="text-xs text-gray-600">{task.meeting_title}</span>
                      {task.assignee && <span className="text-xs text-gray-500">· {task.assignee}</span>}
                      {task.due_date && <span className="text-xs text-gray-500">· {task.due_date}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${priorityColor[task.priority]}`}>
                    {priorityLabel[task.priority]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Toplantı geçmişi */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Toplantı Geçmişi</h2>
          {meetings.length === 0 ? (
            <p className="text-gray-600 text-sm py-4">Henüz toplantı yok.</p>
          ) : (
            <div className="space-y-3">
              {meetings.map(m => (
                <div key={m.id} className="bg-gray-900 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedMeeting(expandedMeeting === m.id ? null : m.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meetingTypeColor[m.type]}`}>
                        {meetingTypeLabel[m.type]}
                      </span>
                      <span className="text-sm font-medium">{m.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-600">
                        {new Date(m.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="text-gray-600 text-xs">{expandedMeeting === m.id ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {expandedMeeting === m.id && (
                    <div className="border-t border-gray-800 p-4 space-y-4">
                      {m.summary && (
                        <p className="text-sm text-gray-400 whitespace-pre-line leading-relaxed">{m.summary}</p>
                      )}
                      {m.tasks?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Görevler</p>
                          <ul className="space-y-1">
                            {m.tasks.map(t => (
                              <li key={t.id} className={`text-sm flex gap-2 ${t.status === 'done' ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                <span>·</span>{t.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.decisions?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Kararlar</p>
                          <ul className="space-y-1">
                            {m.decisions.map(d => (
                              <li key={d.id} className="text-sm text-gray-300 flex gap-2"><span>▸</span>{d.content}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.commitments?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Taahhütler</p>
                          <ul className="space-y-1">
                            {m.commitments.map(c => (
                              <li key={c.id} className="text-sm text-gray-300 flex gap-2 items-start">
                                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${c.party === 'me' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'}`}>
                                  {c.party === 'me' ? 'Ben' : 'Onlar'}
                                </span>
                                {c.content}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
