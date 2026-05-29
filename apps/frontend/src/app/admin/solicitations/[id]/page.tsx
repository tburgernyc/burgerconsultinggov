'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const API = '/api/proxy';

export default function SolicitationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sol, setSol] = useState<Solicitation | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetch(`${API}/api/solicitations/list`)
      .then(r => r.json())
      .then((data: Solicitation[]) => setSol(Array.isArray(data) ? data.find(s => s.solicitation_id === id) || null : null));
    fetch(`${API}/api/quotes/${id}`).then(r => r.json()).then(d => setQuotes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  async function triggerTriage() {
    const url = prompt('PDF URL:');
    if (!url) return;
    await fetch(`${API}/api/triage/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitation_id: id, pdf_url: url }) });
    window.location.reload();
  }

  async function triggerSourcing() {
    await fetch(`${API}/api/sourcing/trigger/${id}`, { method: 'POST' });
    window.location.reload();
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/admin/solicitations" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← Back to Pipeline</Link>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)', margin: '0.5rem 0' }}>{id}</h1>
      </div>
      {sol ? (
        <>
          <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              {[['Agency', sol.agency || '—'], ['NAICS', sol.naics || '—'], ['Est. Value', sol.estimated_value ? `$${Number(sol.estimated_value).toLocaleString()}` : '—'], ['Triage Score', sol.triage_score ?? 'Not Run'], ['Status', sol.status || '—']].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div><div style={{ fontWeight: 700 }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={triggerTriage} className="btn btn-primary btn-sm">Run Triage</button>
            <button onClick={triggerSourcing} className="btn btn-navy btn-sm">Trigger Sourcing</button>
          </div>
        </>
      ) : <p style={{ color: 'var(--muted)' }}>Solicitation not found.</p>}

      <section>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>Vendor Quotes ({quotes.length})</h2>
        {quotes.length === 0 ? <div className="empty-state">No quotes received yet.</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Vendor</th><th>Amount</th><th>Labor Rate</th><th>PWP</th><th>Recommendation</th><th>Status</th></tr></thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td>{q.vendor_name || q.vendor_id}</td>
                    <td>${Number(q.total_amount || 0).toLocaleString()}</td>
                    <td>{q.labor_rate_hourly ? `$${q.labor_rate_hourly}/hr` : '—'}</td>
                    <td><span className={`badge ${q.pay_when_paid_confirmed ? 'badge-green' : 'badge-red'}`}>{q.pay_when_paid_confirmed ? 'Yes' : 'No'}</span></td>
                    <td><span className={`badge ${q.recommendation === 'PROCEED' ? 'badge-green' : q.recommendation === 'CLARIFY' ? 'badge-yellow' : 'badge-gray'}`}>{q.recommendation || 'PENDING'}</span></td>
                    <td><span className="badge badge-blue">{q.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type Solicitation = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; response_deadline: string; };
type Quote = { id: string; vendor_id: string; vendor_name: string; total_amount: number; labor_rate_hourly: number; pay_when_paid_confirmed: boolean; recommendation: string; status: string; };
