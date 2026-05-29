'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Solicitation = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; response_deadline: string; created_at: string; };

const STATUSES = ['PENDING_TRIAGE','TRIAGE_COMPLETE','READY_FOR_SOURCING','SOURCING_IN_PROGRESS','PRICING_PENDING','PROPOSAL_DRAFT','SUBMITTED','AWARDED','REJECTED'];

export default function SolicitationPipelinePage() {
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetch(`${API}/api/solicitations/list`)
      .then(r => r.json())
      .then(d => setSolicitations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function runTriage(id: string) {
    const url = prompt('Enter PDF URL for this solicitation:');
    if (!url) return;
    await fetch(`${API}/api/triage/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitation_id: id, pdf_url: url }),
    });
    window.location.reload();
  }

  const filtered = filter === 'ALL' ? solicitations : solicitations.filter(s => s.status === filter);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Solicitation Pipeline</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{solicitations.length} total solicitations tracked</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {['ALL', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-navy' : 'btn-outline'}`}>
            {s.replace(/_/g, ' ')}
            {s !== 'ALL' && <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({solicitations.filter(x => x.status === s).length})</span>}
          </button>
        ))}
      </div>

      {loading ? <div style={{ color: 'var(--muted)' }}>Loading...</div> : (
        filtered.length === 0 ? (
          <div className="empty-state">No solicitations in this status.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Solicitation #</th><th>Agency</th><th>NAICS</th><th>Value</th><th>Score</th><th>Status</th><th>Deadline</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.solicitation_id} style={{ background: s.triage_score >= 8 ? '#f0fdf4' : s.triage_score >= 6 ? '#fefce8' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{s.solicitation_id}</td>
                    <td>{s.agency || '—'}</td>
                    <td><span className="badge badge-gold">{s.naics || '—'}</span></td>
                    <td>{s.estimated_value ? `$${Number(s.estimated_value).toLocaleString()}` : '—'}</td>
                    <td><span className={`badge ${s.triage_score >= 8 ? 'badge-green' : s.triage_score >= 6 ? 'badge-yellow' : s.triage_score ? 'badge-red' : 'badge-gray'}`}>{s.triage_score ?? 'N/A'}</span></td>
                    <td><span className="badge badge-blue">{s.status?.replace(/_/g,' ') || '—'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{s.response_deadline ? new Date(s.response_deadline).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <a href={`/admin/solicitations/${s.solicitation_id}`} className="btn btn-navy btn-sm">View</a>
                        {(!s.triage_score) && <button onClick={() => runTriage(s.solicitation_id)} className="btn btn-primary btn-sm">Triage</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
