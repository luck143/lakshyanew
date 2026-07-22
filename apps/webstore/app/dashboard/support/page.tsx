// apps/webstore/app/dashboard/support/page.tsx
'use client';
import { getUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  body?: string;
};

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      if (!u) router.push('/login');
      else {
        // tickets resource not yet wired — local placeholder list
        try {
          const raw = localStorage.getItem('lakshya_tickets');
          setTickets(raw ? JSON.parse(raw) : []);
        } catch {
          setTickets([]);
        }
        setLoading(false);
      }
    });
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required');
      return;
    }
    const t: Ticket = {
      id: crypto.randomUUID(),
      subject: subject.trim(),
      body: body.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const next = [t, ...tickets];
    setTickets(next);
    localStorage.setItem('lakshya_tickets', JSON.stringify(next));
    setSubject('');
    setBody('');
    setOk('Ticket created (local until SupportTickets API ships)');
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>Support</h1>
      </header>

      <form className="auth-form" onSubmit={submit} style={{ maxWidth: 560, marginBottom: 32 }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>New ticket</h2>
        {error && <div className="error">{error}</div>}
        {ok && <div className="success">{ok}</div>}
        <label>
          Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </label>
        <label>
          Message
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
        </label>
        <button className="btn" type="submit">Submit ticket</button>
      </form>

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your tickets</h2>
      {tickets.length === 0 ? (
        <div className="empty-state"><p>No tickets yet.</p></div>
      ) : (
        <ul className="ticket-list">
          {tickets.map((t) => (
            <li key={t.id} className="ticket-item">
              <div className="ticket-head">
                <strong>{t.subject}</strong>
                <span className={`badge status-${t.status}`}>{t.status}</span>
              </div>
              <p>{t.body}</p>
              <small>{new Date(t.createdAt).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}