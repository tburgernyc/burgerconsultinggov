'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { ADMIN_API as API } from '@/lib/api';
import { winClass as winColor, winColor as winText } from '@/lib/format';

type Proposal = { id: string; solicitation_id: string; agency: string; naics: string; win_probability: number; status: string; created_at: string; };
type ProposalDetail = { solicitation_id: string; technical_approach: string; management_plan: string; pricing_narrative: string; past_performance: string; win_probability: number; status: string; };

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProposalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSolId, setGenSolId] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/proposals`).then(r => r.json()).then(d => setProposals(Array.isArray(d) ? d : [])).catch(() => setProposals([])).finally(() => setLoading(false));
  }, []);

  async function viewProposal(solId: string) {
    setDetailLoading(true);
    setSelected(null);
    try {
      const r = await fetch(`${API}/api/proposals/${solId}`);
      if (r.ok) setSelected(await r.json());
    } finally { setDetailLoading(false); }
  }

  async function downloadDocx(solId: string) {
    setExporting(true);
    try {
      const res = await fetch(`${API}/api/proposals/${solId}/export`);
      if (!res.ok) { alert('Export failed — make sure a proposal exists for this solicitation.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BCG_Proposal_${solId.replace(/\//g, '-')}_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function generateNew() {
    if (!genSolId.trim()) { alert('Enter a Solicitation ID'); return; }
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/proposals/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitation_id: genSolId.trim() }),
      });
      if (!r.ok) { alert(`Generation failed (${r.status})`); return; }
      const d = await r.json();
      setGenSolId('');
      const reloaded = await fetch(`${API}/api/proposals`).then(x => x.json());
      setProposals(Array.isArray(reloaded) ? reloaded : []);
      await viewProposal(d.solicitation_id);
    } finally { setGenerating(false); }
  }

  const SECTIONS: { label: string; key: keyof ProposalDetail; color: string }[] = [
    { label: 'Technical Approach', key: 'technical_approach', color: '#1D4ED8' },
    { label: 'Management Plan', key: 'management_plan', color: '#7C3AED' },
    { label: 'Pricing Narrative', key: 'pricing_narrative', color: 'var(--pv-success)' },
    { label: 'Past Performance', key: 'past_performance', color: '#92400E' },
  ];

  return (
    <AdminShell
      title="AI Proposals"
      subtitle="Gemini 2.5 Pro generated federal proposal drafts"
      actions={
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input value={genSolId} onChange={e => setGenSolId(e.target.value)} placeholder="Solicitation ID"
            className="pv-input" style={{ width: 180, fontSize: '0.85rem', padding: '0.55rem 0.875rem' }}
            onKeyDown={e => e.key === 'Enter' && generateNew()} />
          <button onClick={generateNew} disabled={generating} className="pv-btn pv-btn-primary pv-btn-sm">
            {generating ? 'Generating…' : '✦ Generate'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* List */}
        <div>
          {loading ? (
            <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
          ) : proposals.length === 0 ? (
            <div className="pv-card">
              <div className="pv-empty">
                <div className="pv-empty-icon">✦</div>
                <div className="pv-empty-title">No proposals generated yet</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)' }}>Enter a Solicitation ID above and click Generate to create an AI proposal draft.</p>
              </div>
            </div>
          ) : (
            <div className="pv-card pv-fade" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead><tr><th>Solicitation</th><th>Agency</th><th>Win %</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {proposals.map(p => (
                      <tr key={p.id} style={{ background: selected?.solicitation_id === p.solicitation_id ? '#EFF6FF' : undefined }}>
                        <td><span style={{ fontWeight: 700 }}>{p.solicitation_id}</span></td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.agency || '—'}</td>
                        <td>
                          {p.win_probability != null ? (
                            <span className={`pv-badge ${winColor(p.win_probability)}`}>{p.win_probability}%</span>
                          ) : '—'}
                        </td>
                        <td><span className="pv-badge pv-badge-navy" style={{ fontSize: '0.62rem' }}>{p.status}</span></td>
                        <td>
                          <button onClick={() => viewProposal(p.solicitation_id)} className="pv-btn pv-btn-navy pv-btn-sm">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="pv-fade">
            <div className="pv-card" style={{ marginBottom: '1rem', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)' }}>{selected.solicitation_id}</div>
                  {selected.win_probability != null && (
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: winText(selected.win_probability), fontFamily: "'DM Sans', sans-serif" }}>
                      {selected.win_probability}% Win Probability
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => downloadDocx(selected.solicitation_id)} disabled={exporting} className="pv-btn pv-btn-outline pv-btn-sm">
                    {exporting ? 'Exporting…' : '↓ Download DOCX'}
                  </button>
                  <button onClick={() => setSelected(null)} className="pv-btn pv-btn-outline pv-btn-sm">✕ Close</button>
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="pv-card"><div className="pv-empty"><div className="pv-empty-title">Loading proposal…</div></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {SECTIONS.map(({ label, key, color }) =>
                  selected[key] ? (
                    <div key={key} className="pv-card">
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color, marginBottom: '0.625rem', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--pv-text-mid)', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>
                        {selected[key] as string}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
