'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { ADMIN_API as API } from '@/lib/api';
import { fmt, scoreClass, SOLICITATION_STATUS_BADGE as STATUS_BADGE } from '@/lib/format';

type Solicitation = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; response_deadline: string; created_at: string; };

const STATUSES = ['PENDING_TRIAGE','TRIAGE_COMPLETE','READY_FOR_SOURCING','SOURCING_IN_PROGRESS','PRICING_PENDING','PROPOSAL_DRAFT','SUBMITTED','AWARDED','REJECTED'];

const PAGE_LOAD_TIME = Date.now();

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

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = solicitations.filter(x => x.status === s).length;
    return acc;
  }, {});

  return (
    <AdminShell
      title="Solicitation Pipeline"
      subtitle={`${solicitations.length} total solicitations tracked by Hermes`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('ALL')}
            className={`pv-btn pv-btn-sm ${filter === 'ALL' ? 'pv-btn-navy' : 'pv-btn-outline'}`}
          >
            All <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>({solicitations.length})</span>
          </button>
          {STATUSES.map(s => (
            counts[s] > 0 && (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`pv-btn pv-btn-sm ${filter === s ? 'pv-btn-navy' : 'pv-btn-outline'}`}
              >
                {s.replace(/_/g, ' ')}
                <span style={{ opacity: 0.65, marginLeft: '0.25rem' }}>({counts[s]})</span>
              </button>
            )
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
        ) : filtered.length === 0 ? (
          <div className="pv-card">
            <div className="pv-empty">
              <div className="pv-empty-icon">📋</div>
              <div className="pv-empty-title">No solicitations in this status</div>
            </div>
          </div>
        ) : (
          <div className="pv-card pv-fade" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th>Solicitation #</th>
                    <th>Agency</th>
                    <th>NAICS</th>
                    <th>Value</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const deadline = s.response_deadline ? new Date(s.response_deadline) : null;
                    const daysLeft = deadline ? Math.ceil((deadline.getTime() - PAGE_LOAD_TIME) / 86400000) : null;
                    return (
                      <tr key={s.solicitation_id}>
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem' }}>{s.solicitation_id}</span>
                        </td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pv-text-mid)', fontSize: '0.83rem' }}>
                          {s.agency || '—'}
                        </td>
                        <td><span className="pv-badge pv-badge-navy" style={{ fontSize: '0.65rem' }}>{s.naics || '—'}</span></td>
                        <td style={{ fontWeight: 600 }}>{s.estimated_value ? fmt(s.estimated_value) : '—'}</td>
                        <td>
                          <span className={`pv-badge ${scoreClass(s.triage_score)}`}>
                            {s.triage_score != null ? `${s.triage_score}/10` : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className={`pv-badge ${STATUS_BADGE[s.status] || 'pv-badge-gray'}`} style={{ fontSize: '0.62rem' }}>
                            {(s.status || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {daysLeft !== null ? (
                            <span style={{ fontSize: '0.78rem', color: daysLeft <= 3 ? 'var(--pv-danger)' : daysLeft <= 7 ? 'var(--pv-warning)' : 'var(--pv-muted)', fontWeight: daysLeft <= 7 ? 700 : 400, fontFamily: "'DM Sans', sans-serif" }}>
                              {daysLeft > 0 ? `${daysLeft}d` : 'Passed'}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <Link href={`/admin/solicitations/${s.solicitation_id}`} className="pv-btn pv-btn-navy pv-btn-sm">View</Link>
                            {!s.triage_score && (
                              <button onClick={() => runTriage(s.solicitation_id)} className="pv-btn pv-btn-primary pv-btn-sm">Triage</button>
                            )}
                            {s.status === 'READY_FOR_SOURCING' && (
                              <Link href={`/admin/prospects?sol=${s.solicitation_id}`} className="pv-btn pv-btn-primary pv-btn-sm">Outreach →</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
