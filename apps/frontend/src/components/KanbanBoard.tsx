'use client';

import { useEffect, useState } from 'react';
import { ADMIN_API } from '@/lib/api';

type Solicitation = {
  solicitation_id: string;
  triage_score: number;
  status: string;
  pdf_url: string;
  created_at: string | null;
};

export default function KanbanBoard() {
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Route through the authenticated admin proxy — /api/solicitations/list is no
    // longer publicly reachable on the backend.
    fetch(`${ADMIN_API}/api/solicitations/list`)
      .then((res) => res.json())
      .then((data) => setSolicitations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading solicitations...</p>;

  const ready = solicitations.filter(s => s.status === 'READY_FOR_SOURCING');
  const rejected = solicitations.filter(s => s.status === 'REJECTED');

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '280px', padding: '1rem', border: '1px solid #22c55e', borderRadius: '8px' }}>
        <h2 style={{ color: '#22c55e', marginTop: 0 }}>Ready for Sourcing ({ready.length})</h2>
        {ready.length === 0 && <p style={{ color: '#888' }}>None yet.</p>}
        <ul>
          {ready.map(s => (
            <li key={s.solicitation_id}>
              {s.solicitation_id} — Score: {s.triage_score}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, minWidth: '280px', padding: '1rem', border: '1px solid #ef4444', borderRadius: '8px' }}>
        <h2 style={{ color: '#ef4444', marginTop: 0 }}>Rejected ({rejected.length})</h2>
        {rejected.length === 0 && <p style={{ color: '#888' }}>None yet.</p>}
        <ul>
          {rejected.map(s => (
            <li key={s.solicitation_id}>
              {s.solicitation_id} — Score: {s.triage_score}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
