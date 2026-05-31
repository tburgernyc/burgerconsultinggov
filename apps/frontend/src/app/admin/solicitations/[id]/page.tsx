'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Solicitation = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; response_deadline: string; };
type Quote = { id: string; vendor_id: string; vendor_name: string; total_amount: number; labor_rate_hourly: number; pay_when_paid_confirmed: boolean; recommendation: string; status: string; notes: string; ai_evaluation?: { rank?: number; rationale?: string; risk_flags?: string[]; sca_compliant?: boolean; }; };
type AiEval = { recommended_vendor: string; recommended_award_price: number; evaluation_summary: string; key_risks: string[]; };

const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function recBadge(r: string) {
  if (r === 'AWARD' || r === 'PROCEED') return 'pv-badge-green';
  if (r === 'CLARIFY') return 'pv-badge-gold';
  if (r === 'REJECT') return 'pv-badge-red';
  return 'pv-badge-gray';
}

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
    } finally { setEvaluating(false); }
  }

  async function generateProposal() {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/proposals/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitation_id: id }),
      });
      if (!r.ok) { alert(`Proposal generation failed (${r.status})`); return; }
      setProposalDone(true);
    } finally { setGenerating(false); }
  }

  return (
    <AdminShell
      title={id}
      subtitle={sol ? `${sol.agency} · ${sol.status?.replace(/_/g,' ')}` : 'Loading…'}
      actions={
        <Link href="/admin/solicitations" className="pv-btn pv-btn-outline pv-btn-sm">← Pipeline</Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Details Card */}
        {sol && (
          <div className="pv-card pv-card-gold-border pv-fade">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.125rem', marginBottom: '1.5rem' }}>
              {[
                ['Agency', sol.agency || '—'],
                ['NAICS', sol.naics || '—'],
                ['Est. Value', sol.estimated_value ? fmt(sol.estimated_value) : '—'],
                ['Triage Score', sol.triage_score != null ? `${sol.triage_score}/10` : 'Not Run'],
                ['Status', (sol.status || '').replace(/_/g,' ')],
                ['Deadline', sol.response_deadline ? new Date(sol.response_deadline).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>{l}</div>
                  <div style={{ fontWeight: 700, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Action Toolbar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--pv-border)' }}>
              <button onClick={triggerTriage} className="pv-btn pv-btn-primary pv-btn-sm">Run Triage</button>
              <button onClick={triggerSourcing} className="pv-btn pv-btn-navy pv-btn-sm">Trigger Sourcing</button>
              <button onClick={evaluateQuotesAI} disabled={evaluating || quotes.length === 0} className="pv-btn pv-btn-outline pv-btn-sm">
                {evaluating ? 'Evaluating…' : '🤖 AI Evaluate Quotes'}
              </button>
              <button onClick={generateProposal} disabled={generating} className="pv-btn pv-btn-outline pv-btn-sm">
                {generating ? 'Generating…' : '✦ Generate Proposal'}
              </button>
              {proposalDone && <Link href="/admin/proposals" className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)' }}>View Proposal →</Link>}
            </div>
          </div>
        )}

        {/* AI Evaluation */}
        {aiEval && (
          <div className="pv-card pv-fade" style={{ borderLeft: '4px solid #3B82F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)' }}>AI Quote Evaluation</span>
              {aiEval.recommended_vendor && <span className="pv-badge pv-badge-green" style={{ marginLeft: 'auto' }}>→ {aiEval.recommended_vendor}</span>}
              {aiEval.recommended_award_price > 0 && <span className="pv-badge pv-badge-navy">{fmt(aiEval.recommended_award_price)}</span>}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--pv-text-mid)', lineHeight: 1.65, marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
              {aiEval.evaluation_summary}
            </p>
            {aiEval.key_risks?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {aiEval.key_risks.map((r, i) => <span key={i} className="pv-badge pv-badge-red" style={{ fontSize: '0.65rem' }}>⚠ {r}</span>)}
              </div>
            )}
          </div>
        )}

        {/* Quotes */}
        <div className="pv-fade pv-d1">
          <div className="pv-section-label">Vendor Quotes ({quotes.length})</div>
          {quotes.length === 0 ? (
            <div className="pv-card">
              <div className="pv-empty">
                <div className="pv-empty-icon">📋</div>
                <div className="pv-empty-title">No quotes received yet</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)' }}>Trigger sourcing to send RFQ emails to matched vendors.</p>
              </div>
            </div>
          ) : (
            <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead>
                    <tr><th>Vendor</th><th>Amount</th><th>Labor Rate</th><th>PWP</th><th>AI Rank</th><th>Recommendation</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} style={{ background: q.ai_evaluation?.rank === 1 ? 'var(--pv-success-bg)' : undefined }}>
                        <td style={{ fontWeight: 700 }}>{q.vendor_name || q.vendor_id}</td>
                        <td style={{ fontWeight: 700, color: 'var(--pv-navy)' }}>{fmt(q.total_amount)}</td>
                        <td style={{ color: 'var(--pv-text-mid)' }}>{q.labor_rate_hourly ? `$${q.labor_rate_hourly}/hr` : '—'}</td>
                        <td><span className={`pv-badge ${q.pay_when_paid_confirmed ? 'pv-badge-green' : 'pv-badge-red'}`}>{q.pay_when_paid_confirmed ? 'Yes' : 'No'}</span></td>
                        <td>{q.ai_evaluation?.rank ? <span className="pv-badge pv-badge-blue">#{q.ai_evaluation.rank}</span> : '—'}</td>
                        <td><span className={`pv-badge ${recBadge(q.recommendation)}`}>{q.recommendation || 'PENDING'}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}
