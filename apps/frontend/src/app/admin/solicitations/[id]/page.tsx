'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const API = '/api/proxy';

type AiEval = { recommended_vendor: string; recommended_award_price: number; evaluation_summary: string; key_risks: string[]; };


export default function SolicitationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sol, setSol] = useState<Solicitation | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [aiEval, setAiEval] = useState<AiEval | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [proposalDone, setProposalDone] = useState(false);

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

  async function evaluateQuotesAI() {
    if (quotes.length === 0) { alert('No quotes to evaluate yet.'); return; }
    setEvaluating(true);
    try {
      const r = await fetch(`${API}/api/quotes/evaluate/${id}`, { method: 'POST' });
      if (!r.ok) { alert(`Evaluation failed (${r.status})`); return; }
      const d = await r.json();
      setAiEval(d.evaluation);
      const updated = await fetch(`${API}/api/quotes/${id}`).then(x => x.json());
      setQuotes(Array.isArray(updated) ? updated : []);
    } finally {
      setEvaluating(false);
    }
  }

  async function generateProposal() {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitation_id: id }),
      });
      if (!r.ok) { alert(`Proposal generation failed (${r.status})`); return; }
      setProposalDone(true);
    } finally {
      setGenerating(false);
    }
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
            <button onClick={evaluateQuotesAI} disabled={evaluating || quotes.length === 0} className="btn btn-outline btn-sm">
              {evaluating ? 'Evaluating...' : '🤖 AI Evaluate Quotes'}
            </button>
            <button onClick={generateProposal} disabled={generating} className="btn btn-outline btn-sm">
              {generating ? 'Generating...' : '✨ Generate Proposal'}
            </button>
            {proposalDone && (
              <Link href="/admin/proposals" className="btn btn-success btn-sm">View Proposal →</Link>
            )}
          </div>

          {aiEval && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #c7d2fe' }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.5rem', fontSize: '0.95rem' }}>🤖 AI Quote Evaluation</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.5rem' }}>{aiEval.evaluation_summary}</p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                <div><span style={{ color: 'var(--muted)' }}>Recommended Vendor:</span> <strong>{aiEval.recommended_vendor}</strong></div>
                {aiEval.recommended_award_price && (
                  <div><span style={{ color: 'var(--muted)' }}>Suggested Price:</span> <strong>${Number(aiEval.recommended_award_price).toLocaleString()}</strong></div>
                )}
              </div>
              {aiEval.key_risks?.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#991b1b' }}>
                  Risks: {aiEval.key_risks.join(' · ')}
                </div>
              )}
            </div>
          )}
        </>
      ) : <p style={{ color: 'var(--muted)' }}>Solicitation not found.</p>}

      <section>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>Vendor Quotes ({quotes.length})</h2>
        {quotes.length === 0 ? <div className="empty-state">No quotes received yet.</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Vendor</th><th>Amount</th><th>Labor Rate</th><th>PWP</th><th>AI Rank</th><th>Recommendation</th><th>Status</th></tr></thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} style={{ background: q.ai_evaluation?.rank === 1 ? '#f0fdf4' : undefined }}>
                    <td>{q.vendor_name || q.vendor_id}</td>
                    <td>${Number(q.total_amount || 0).toLocaleString()}</td>
                    <td>{q.labor_rate_hourly ? `$${q.labor_rate_hourly}/hr` : '—'}</td>
                    <td><span className={`badge ${q.pay_when_paid_confirmed ? 'badge-green' : 'badge-red'}`}>{q.pay_when_paid_confirmed ? 'Yes' : 'No'}</span></td>
                    <td>{q.ai_evaluation?.rank ? <span className="badge badge-blue">#{q.ai_evaluation.rank}</span> : '—'}</td>
                    <td><span className={`badge ${q.recommendation === 'AWARD' || q.recommendation === 'PROCEED' ? 'badge-green' : q.recommendation === 'CLARIFY' ? 'badge-yellow' : q.recommendation === 'REJECT' ? 'badge-red' : 'badge-gray'}`}>{q.recommendation || 'PENDING'}</span></td>
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
type Quote = { id: string; vendor_id: string; vendor_name: string; total_amount: number; labor_rate_hourly: number; pay_when_paid_confirmed: boolean; recommendation: string; status: string; ai_evaluation?: { rank?: number; rationale?: string; risk_flags?: string[]; sca_compliant?: boolean; }; };
