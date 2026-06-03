'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Solicitation = { solicitation_id: string; agency: string; naics: string; estimated_value: number; response_deadline: string; phase_status: string; };
type Prospect = {
  source: string; entity_name: string; uei: string; contact_name: string;
  contact_email: string; city: string; state: string; naics_codes: string[];
  business_types: string[]; past_performance: { agency: string; naics: string; award_amount: number; year: string }[];
  qualification_score: number; score_reason: string;
};
type Campaign = {
  campaign_id: string; quote_token: string; entity_name: string; contact_email: string;
  contact_name: string; qualification_score: number; city: string; state: string;
  source: string; status: string; day0_sent_at: string | null; day3_sent_at: string | null;
  day7_sent_at: string | null; submitted_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'pv-badge-gray', SENT: 'pv-badge-blue', OPENED: 'pv-badge-gold',
  CLICKED: 'pv-badge-navy', SUBMITTED: 'pv-badge-green', BOUNCED: 'pv-badge-red',
};
const fmt = (n: number) => n ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
const PAGE_LOAD_TIME = Date.now();

export default function ProspectsPage() {
  const searchParams = useSearchParams();
  const solFromUrl = searchParams.get('sol') || '';

  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [selectedSol, setSelectedSol] = useState('');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'discover' | 'campaigns'>('campaigns');
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/api/solicitations/list`)
      .then(r => r.json())
      .then(d => {
        const active = Array.isArray(d)
          ? d.filter((s: Solicitation) => !['REJECTED', 'AWARDED'].includes(s.phase_status))
          : [];
        setSolicitations(active);
        const preselect = solFromUrl && active.find((s: Solicitation) => s.solicitation_id === solFromUrl);
        setSelectedSol(preselect ? solFromUrl : active.length > 0 ? active[0].solicitation_id : '');
      })
      .finally(() => setLoading(false));
  }, [solFromUrl]);

  useEffect(() => {
    if (!selectedSol) return;
    let cancelled = false;
    fetch(`${API}/api/outreach/campaigns/${selectedSol}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setCampaigns(d.campaigns || []);
        setProspects([]);
        setSelectedIndices(new Set());
        setView('campaigns');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedSol]);

  function discover() {
    setDiscovering(true);
    setMsg('');
    fetch(`${API}/api/prospects/discover/${selectedSol}`)
      .then(r => r.json())
      .then(d => {
        setProspects(d.prospects || []);
        setView('discover');
        setSelectedIndices(new Set(
          (d.prospects || []).map((_: Prospect, i: number) => i).filter((i: number) => (d.prospects[i]?.qualification_score || 0) >= 7)
        ));
        if ((d.prospects || []).length === 0) setMsg('No prospects found for this NAICS. Try another solicitation.');
      })
      .catch(() => setMsg('Discovery failed. Check SAM.gov API key status.'))
      .finally(() => setDiscovering(false));
  }

  function launch() {
    if (selectedIndices.size === 0) { setMsg('Select at least one prospect.'); return; }
    setLaunching(true);
    setMsg('');
    fetch(`${API}/api/outreach/launch/${selectedSol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_indices: Array.from(selectedIndices), prospects }),
    })
      .then(r => r.json())
      .then(d => {
        setMsg(`Launched — ${d.launched} outreach email(s) sent. Follow-ups will fire automatically on Day 3 and Day 7.`);
        setView('campaigns');
        loadCampaigns(selectedSol);
      })
      .catch(() => setMsg('Launch failed.'))
      .finally(() => setLaunching(false));
  }

  function toggleSelect(i: number) {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

  const sol = solicitations.find(s => s.solicitation_id === selectedSol);

  return (
    <AdminShell title="Prospect Outreach" subtitle="Discover, score, and contact qualified IT subcontractors for open solicitations">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Solicitation Selector */}
        <div className="pv-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.4rem' }}>Active Solicitation</label>
            <select
              value={selectedSol}
              onChange={e => setSelectedSol(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Serif Display', serif", color: 'var(--pv-text)', background: '#fff' }}
            >
              {solicitations.map(s => (
                <option key={s.solicitation_id} value={s.solicitation_id}>
                  {s.solicitation_id} — {s.agency || 'Unknown Agency'} — NAICS {s.naics}
                </option>
              ))}
            </select>
          </div>
          {sol && (
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--pv-text-mid)', fontFamily: "'DM Sans', sans-serif" }}>
              <span>Est. <strong style={{ color: 'var(--pv-text)' }}>{fmt(sol.estimated_value)}</strong></span>
              {sol.response_deadline && (
                <span>Due <strong style={{ color: Math.ceil((new Date(sol.response_deadline).getTime() - PAGE_LOAD_TIME) / 86400000) <= 7 ? 'var(--pv-danger)' : 'var(--pv-text)' }}>
                  {new Date(sol.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong></span>
              )}
            </div>
          )}
          <button
            onClick={discover}
            disabled={!selectedSol || discovering}
            className="pv-btn pv-btn-primary"
            style={{ flexShrink: 0 }}
          >
            {discovering ? 'Discovering…' : 'Run Discovery →'}
          </button>
        </div>

        {msg && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: msg.includes('failed') ? 'var(--pv-danger-bg, #fef2f2)' : 'var(--pv-success-bg)', border: `1px solid ${msg.includes('failed') ? '#fca5a5' : '#6ee7b7'}`, fontSize: '0.85rem', color: msg.includes('failed') ? 'var(--pv-danger)' : 'var(--pv-success)' }}>
            {msg}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['campaigns', 'discover'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`pv-btn pv-btn-sm ${view === v ? 'pv-btn-primary' : 'pv-btn-outline'}`}>
              {v === 'campaigns' ? `Outreach Pipeline (${campaigns.length})` : `Discovered Prospects (${prospects.length})`}
            </button>
          ))}
        </div>

        {/* Outreach Pipeline view */}
        {view === 'campaigns' && (
          <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div className="pv-empty" style={{ padding: '3rem' }}><div className="pv-empty-icon">⏳</div><div className="pv-empty-title">Loading…</div></div>
            ) : campaigns.length === 0 ? (
              <div className="pv-empty" style={{ padding: '3rem' }}>
                <div className="pv-empty-icon">📡</div>
                <div className="pv-empty-title">No outreach yet for this solicitation</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--pv-muted)', maxWidth: 320, margin: '0 auto 1rem' }}>
                  Click <strong>Run Discovery</strong> to find qualified subcontractors from SAM.gov and USASpending, score them with AI, and launch your outreach campaign.
                </p>
              </div>
            ) : (
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Contact</th>
                      <th>Score</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Day 0</th>
                      <th>Day 3</th>
                      <th>Day 7</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.campaign_id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.entity_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{c.city}{c.state ? `, ${c.state}` : ''}</div>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div>{c.contact_name || '—'}</div>
                          <div style={{ color: 'var(--pv-muted)', fontSize: '0.75rem' }}>{c.contact_email || 'No email'}</div>
                        </td>
                        <td>
                          <span className={`pv-badge ${c.qualification_score >= 8 ? 'pv-badge-green' : c.qualification_score >= 6 ? 'pv-badge-gold' : 'pv-badge-gray'}`}>
                            {c.qualification_score}/10
                          </span>
                        </td>
                        <td><span className="pv-badge pv-badge-navy" style={{ fontSize: '0.6rem' }}>{c.source}</span></td>
                        <td><span className={`pv-badge ${STATUS_COLOR[c.status] || 'pv-badge-gray'}`}>{c.status}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{c.day0_sent_at ? '✓' : '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{c.day3_sent_at ? '✓' : '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{c.day7_sent_at ? '✓' : '—'}</td>
                        <td>
                          {c.submitted_at
                            ? <span className="pv-badge pv-badge-green">✓ Submitted</span>
                            : <span style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Discovery results view */}
        {view === 'discover' && prospects.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--pv-text-mid)' }}>
                <strong style={{ color: 'var(--pv-text)' }}>{selectedIndices.size}</strong> of {prospects.length} prospects selected
                &nbsp;·&nbsp; Pre-selected: score ≥ 7
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setSelectedIndices(new Set(prospects.map((_, i) => i)))} className="pv-btn pv-btn-outline pv-btn-sm">Select All</button>
                <button onClick={() => setSelectedIndices(new Set())} className="pv-btn pv-btn-outline pv-btn-sm">Clear</button>
                <button
                  onClick={launch}
                  disabled={launching || selectedIndices.size === 0}
                  className="pv-btn pv-btn-primary"
                >
                  {launching ? 'Launching…' : `Launch Outreach (${selectedIndices.size})`}
                </button>
              </div>
            </div>

            <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Vendor</th>
                      <th>Contact</th>
                      <th>NAICS</th>
                      <th>Fed. Awards</th>
                      <th>Score</th>
                      <th>Source</th>
                      <th>AI Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((p, i) => (
                      <tr key={i} style={{ background: selectedIndices.has(i) ? 'var(--pv-gold-pale)' : undefined, cursor: 'pointer' }} onClick={() => toggleSelect(i)}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleSelect(i)} style={{ cursor: 'pointer' }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.entity_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{p.city}{p.state ? `, ${p.state}` : ''}</div>
                          {p.business_types.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                              {p.business_types.slice(0, 3).map(bt => (
                                <span key={bt} className="pv-badge pv-badge-navy" style={{ fontSize: '0.55rem' }}>{bt}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <div>{p.contact_name || '—'}</div>
                          <div style={{ color: p.contact_email ? 'var(--pv-text-mid)' : 'var(--pv-danger)', fontSize: '0.75rem' }}>
                            {p.contact_email || 'No email — manual outreach needed'}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem' }}>{p.naics_codes.join(', ')}</td>
                        <td style={{ fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 700 }}>{p.past_performance.length}</span>
                          {p.past_performance.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--pv-muted)' }}>
                              {fmt(Math.max(...p.past_performance.map(pp => pp.award_amount || 0)))} max
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`pv-badge ${p.qualification_score >= 8 ? 'pv-badge-green' : p.qualification_score >= 6 ? 'pv-badge-gold' : 'pv-badge-gray'}`}>
                            {p.qualification_score}/10
                          </span>
                        </td>
                        <td><span className="pv-badge pv-badge-navy" style={{ fontSize: '0.6rem' }}>{p.source}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--pv-text-mid)', maxWidth: 200 }}>{p.score_reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </AdminShell>
  );
}
