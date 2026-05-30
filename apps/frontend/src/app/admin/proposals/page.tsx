'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Proposal = {
  id: string;
  solicitation_id: string;
  agency: string;
  naics: string;
  estimated_value: number;
  win_probability: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type ProposalDetail = {
  solicitation_id: string;
  technical_approach: string;
  management_plan: string;
  pricing_narrative: string;
  past_performance: string;
  win_probability: number;
  status: string;
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProposalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genSolId, setGenSolId] = useState('');

  useEffect(() => {
    fetch(`${API}/api/proposals`)
      .then(r => r.json())
      .then(d => setProposals(Array.isArray(d) ? d : []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  async function viewProposal(solId: string) {
    setDetailLoading(true);
    setSelected(null);
    try {
      const r = await fetch(`${API}/api/proposals/${solId}`);
      if (r.ok) setSelected(await r.json());
    } finally {
      setDetailLoading(false);
    }
  }

  async function generateNew() {
    if (!genSolId.trim()) { alert('Enter a Solicitation ID'); return; }
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/proposals/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitation_id: genSolId.trim() }),
      });
      if (!r.ok) { alert(`Generation failed (${r.status})`); return; }
      const d = await r.json();
      setGenSolId('');
      const reloaded = await fetch(`${API}/api/proposals`).then(x => x.json());
      setProposals(Array.isArray(reloaded) ? reloaded : []);
      await viewProposal(d.solicitation_id);
    } finally {
      setGenerating(false);
    }
  }

  const winColor = (p: number) => p >= 70 ? '#166534' : p >= 40 ? '#92400e' : '#991b1b';
  const winBg = (p: number) => p >= 70 ? '#f0fdf4' : p >= 40 ? '#fffbeb' : '#fef2f2';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>AI Proposals</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Gemini-generated federal proposal drafts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={genSolId}
            onChange={e => setGenSolId(e.target.value)}
            placeholder="Solicitation ID"
            className="form-input"
            style={{ width: 200 }}
            onKeyDown={e => e.key === 'Enter' && generateNew()}
          />
          <button
            onClick={generateNew}
            disabled={generating}
            className="btn btn-primary btn-sm"
          >
            {generating ? 'Generating...' : '✨ Generate Proposal'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.6fr' : '1fr', gap: '1.5rem' }}>
        <div>
          {loading ? (
            <div className="empty-state">Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <div className="empty-state">
              No proposals generated yet. Enter a Solicitation ID above and click Generate.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Solicitation</th>
                    <th>Agency</th>
                    <th>Win %</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(p => (
                    <tr key={p.id} style={{ background: selected?.solicitation_id === p.solicitation_id ? '#f0f9ff' : undefined }}>
                      <td style={{ fontWeight: 600 }}>{p.solicitation_id}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{p.agency || '—'}</td>
                      <td>
                        {p.win_probability != null ? (
                          <span style={{ background: winBg(p.win_probability), color: winColor(p.win_probability), padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
                            {p.win_probability}%
                          </span>
                        ) : '—'}
                      </td>
                      <td><span className="badge badge-blue">{p.status}</span></td>
                      <td>
                        <button onClick={() => viewProposal(p.solicitation_id)} className="btn btn-navy btn-sm">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)' }}>{selected.solicitation_id}</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selected.win_probability != null && (
                    <span style={{ background: winBg(selected.win_probability), color: winColor(selected.win_probability), padding: '4px 12px', borderRadius: 4, fontWeight: 700, fontSize: '0.9rem' }}>
                      {selected.win_probability}% Win Probability
                    </span>
                  )}
                  <button onClick={() => setSelected(null)} className="btn btn-outline btn-sm">✕ Close</button>
                </div>
              </div>

              {detailLoading ? (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[
                    { label: 'Technical Approach', key: 'technical_approach' as const, color: '#1d4ed8' },
                    { label: 'Management Plan', key: 'management_plan' as const, color: '#7c3aed' },
                    { label: 'Pricing Narrative', key: 'pricing_narrative' as const, color: '#065f46' },
                    { label: 'Past Performance', key: 'past_performance' as const, color: '#92400e' },
                  ].map(({ label, key, color }) => (
                    selected[key] ? (
                      <div key={key}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color, marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                          {label}
                        </div>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.875rem', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {selected[key]}
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
