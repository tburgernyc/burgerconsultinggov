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

  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [addForm, setAddForm] = useState({
    entity_name: '', contact_name: '', contact_email: '',
    city: '', state: '', naics_codes: '', qualification_score: 7, notes: '', launch: true,
  });

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
        fetch(`${API}/api/outreach/campaigns/${selectedSol}`)
          .then(r => r.json())
          .then(data => setCampaigns(data.campaigns || []));
      })
      .catch(() => setMsg('Launch failed.'))
      .finally(() => setLaunching(false));
  }

  async function submitManualProspect() {
    if (!addForm.entity_name.trim()) { setAddMsg('Company name is required.'); return; }
    setAdding(true);
    setAddMsg('');
    const prospect = {
      entity_name: addForm.entity_name.trim(),
      contact_name: addForm.contact_name.trim() || null,
      contact_email: addForm.contact_email.trim() || null,
      city: addForm.city.trim() || null,
      state: addForm.state.trim() || null,
      naics_codes: addForm.naics_codes ? addForm.naics_codes.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      qualification_score: addForm.qualification_score,
      notes: addForm.notes.trim() || null,
      source: 'MANUAL',
      past_performance: [],
      business_types: [],
    };
    try {
      if (addForm.launch && selectedSol) {
        const r = await fetch(`${API}/api/outreach/launch/${selectedSol}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_indices: [0], prospects: [prospect] }),
        });
        const d = await r.json();
        setMsg(prospect.contact_email
          ? `Prospect added — outreach email sent (${d.launched || 0} sent).`
          : `Prospect added — no email on file, follow up manually.`
        );
        fetch(`${API}/api/outreach/campaigns/${selectedSol}`).then(r => r.json()).then(d => setCampaigns(d.campaigns || []));
        setView('campaigns');
      } else {
        await fetch(`${API}/api/prospects/manual`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity_name: prospect.entity_name, contact_name: prospect.contact_name, contact_email: prospect.contact_email, city: prospect.city, state: prospect.state, naics_codes: prospect.naics_codes, qualification_score: prospect.qualification_score, notes: prospect.notes }),
        });
        setMsg('Prospect saved to registry.');
      }
      setShowAddModal(false);
      setAddForm({ entity_name: '', contact_name: '', contact_email: '', city: '', state: '', naics_codes: '', qualification_score: 7, notes: '', launch: true });
    } catch {
      setAddMsg('Failed to save prospect. Check connection.');
    } finally {
      setAdding(false);
    }
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
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => { setShowAddModal(true); setAddMsg(''); }}
              disabled={!selectedSol}
              className="pv-btn pv-btn-outline"
            >
              + Add Manually
            </button>
            <button
              onClick={discover}
              disabled={!selectedSol || discovering}
              className="pv-btn pv-btn-primary"
            >
              {discovering ? 'Discovering…' : 'Run Discovery →'}
            </button>
          </div>
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

      {/* Manual Prospect Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(10,22,40,0.25)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)', margin: 0 }}>Add Prospect Manually</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--pv-muted)' }}>✕</button>
            </div>

            {[
              { label: 'Company Name *', key: 'entity_name', placeholder: 'Acme Federal IT LLC' },
              { label: 'Contact Name', key: 'contact_name', placeholder: 'Jane Smith' },
              { label: 'Contact Email', key: 'contact_email', placeholder: 'jane@acmeit.com' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.35rem' }}>{f.label}</label>
                <input
                  value={addForm[f.key as keyof typeof addForm] as string}
                  onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', background: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {[{ label: 'City', key: 'city', placeholder: 'Washington' }, { label: 'State', key: 'state', placeholder: 'DC' }].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.35rem' }}>{f.label}</label>
                  <input value={addForm[f.key as keyof typeof addForm] as string} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', background: '#fff', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.35rem' }}>NAICS Codes (comma-separated)</label>
              <input value={addForm.naics_codes} onChange={e => setAddForm(p => ({ ...p, naics_codes: e.target.value }))} placeholder="541511, 541519" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', background: '#fff', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.35rem' }}>AI Fit Score (1–10)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="range" min={1} max={10} value={addForm.qualification_score} onChange={e => setAddForm(p => ({ ...p, qualification_score: Number(e.target.value) }))} style={{ flex: 1, accentColor: 'var(--pv-navy)' }} />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: addForm.qualification_score >= 8 ? 'var(--pv-success)' : addForm.qualification_score >= 6 ? 'var(--pv-warning)' : 'var(--pv-muted)', minWidth: 28 }}>{addForm.qualification_score}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', display: 'block', marginBottom: '0.35rem' }}>Notes (optional)</label>
              <textarea value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="LinkedIn profile, referral source, relevant past performance…" rows={2} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', background: '#fff', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '0.875rem', marginBottom: '1.25rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setAddForm(p => ({ ...p, launch: !p.launch }))}>
              <input type="checkbox" checked={addForm.launch} readOnly style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--pv-text)' }}>
                <strong>Launch outreach now</strong> for <em>{sol?.agency || 'this solicitation'}</em>.
                <div style={{ fontSize: '0.78rem', color: 'var(--pv-text-mid)', marginTop: '0.2rem' }}>Generates a Gemini SOW brief and sends a Day 0 email (if email is provided).</div>
              </div>
            </div>

            {addMsg && <div style={{ padding: '0.6rem 0.875rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: 'var(--pv-danger)', fontSize: '0.83rem', marginBottom: '1rem' }}>{addMsg}</div>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddModal(false)} className="pv-btn pv-btn-outline">Cancel</button>
              <button onClick={submitManualProspect} disabled={adding} className="pv-btn pv-btn-primary">
                {adding ? 'Saving…' : addForm.launch ? 'Add & Launch Outreach' : 'Add to Registry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
