'use client';

import { useState } from 'react';

type Priority = 'high' | 'medium' | 'low';
type Party = 'me' | 'them';

interface Task {
  title: string;
  assignee: string | null;
  due_date: string | null;
  priority: Priority;
}

interface Decision {
  content: string;
}

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

export default function Home() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'customer' | 'internal' | 'partner'>('internal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/meetings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, notes }),
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
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">meetar</h1>
        <p className="text-gray-500 text-sm mb-8">Toplantı notunu gir, AI çıkarsın</p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Toplantı başlığı"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600"
              required
            />
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-600"
            >
              <option value="internal">İç toplantı</option>
              <option value="customer">Müşteri</option>
              <option value="partner">Ortak</option>
            </select>
          </div>

          <textarea
            placeholder="Toplantı notlarını veya Teams transkriptini buraya yapıştır..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={10}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-600 resize-none"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-gray-950 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
          </button>
        </form>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <section className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Özet</h2>
              <div className="text-sm leading-relaxed whitespace-pre-line text-gray-200">
                {result.summary}
              </div>
            </section>

            {result.tasks.length > 0 && (
              <section className="bg-gray-900 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Görevler ({result.tasks.length})
                </h2>
                <div className="space-y-2">
                  {result.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                      <input type="checkbox" className="mt-0.5 accent-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-100">{task.title}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {task.assignee && (
                            <span className="text-xs text-gray-500">{task.assignee}</span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-gray-500">· {task.due_date}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
                        {priorityLabel[task.priority]}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.decisions.length > 0 && (
              <section className="bg-gray-900 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Kararlar ({result.decisions.length})
                </h2>
                <ul className="space-y-2">
                  {result.decisions.map((d, i) => (
                    <li key={i} className="text-sm text-gray-200 flex gap-2">
                      <span className="text-gray-600 mt-0.5">▸</span>
                      {d.content}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.commitments.length > 0 && (
              <section className="bg-gray-900 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Taahhütler ({result.commitments.length})
                </h2>
                <div className="space-y-2">
                  {result.commitments.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        c.party === 'me'
                          ? 'bg-blue-950 text-blue-300'
                          : 'bg-purple-950 text-purple-300'
                      }`}>
                        {c.party === 'me' ? 'Ben' : 'Karşı taraf'}
                      </span>
                      <span className="text-gray-200">{c.content}</span>
                      {c.due_date && (
                        <span className="text-gray-500 shrink-0 ml-auto">{c.due_date}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.next_meeting_topics.length > 0 && (
              <section className="bg-gray-900 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Sonraki toplantıya taşı
                </h2>
                <ul className="space-y-1.5">
                  {result.next_meeting_topics.map((t, i) => (
                    <li key={i} className="text-sm text-gray-400 flex gap-2">
                      <span className="text-gray-700">·</span> {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
