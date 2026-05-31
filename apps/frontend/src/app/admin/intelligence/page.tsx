'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Award = { naics: string; agency: string; award_amount: number; awardee_name: string; award_date: string; contract_number: string; description: string; };
type MarketStat = { naics: string; award_count: number; avg_award: number; min_award: number; max_award: number; median_award: number; };
type IntelData = { awards: Award[]; market_stats: MarketStat[]; last_updated: string; };

const NAICS_LABELS: Record<string, string> = { '541511': 'Custom Software Dev', '541519': 'IT Services & PM', '541512': 'Systems Design', '541690': 'Technical Consulting' };
const fmt = (n: number) => n ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';

export default function IntelligencePage() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterNaics, setFilterNaics] = useState('');

  function fetchData(naics: string) {
    setLoading(true);
    const qs = naics ? `?naics=${naics}&limit=100` : '?limit=100';
    fetch(`${API}/api/intelligence/awards${qs}`)
      .then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(''); }, []);

  function applyFilter(naics: string) {
    setFilterNaics(naics);
    fetchData(naics);
  }

  return (
    <AdminShell
      title="Competitive Intelligence"
      subtitle={`Historical award data from USASpending.gov${data?.last_updated ? ` · Updated ${data.last_updated}` : ''} · Updated 6:00 AM ET daily`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Market Stats Cards */}
        {data?.market_stats && data.market_stats.length > 0 && (
          <div>
            <div className="pv-section-label">Market Benchmarks by NAICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {data.market_stats.map((stat, i) => {
                const active = filterNaics === stat.naics;
                return (
                  <div
                    key={stat.naics}
                    className={`pv-card pv-fade pv-d${i+1}`}
                    style={{ cursor: 'pointer', border: `1px solid ${active ? 'var(--pv-gold)' : 'var(--pv-border)'}`, background: active ? 'var(--pv-gold-pale)' : '#fff', transition: 'all 0.15s' }}
                    onClick={() => applyFilter(active ? '' : stat.naics)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span className="pv-badge pv-badge-navy" style={{ marginBottom: '0.375rem', display: 'inline-flex' }}>{stat.naics}</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--pv-text-mid)', fontFamily: "'DM Sans', sans-serif" }}>{NAICS_LABELS[stat.naics] || stat.naics}</div>
                      </div>
                      {active && <span style={{ fontSize: '0.7rem', color: 'var(--pv-gold)', fontWeight: 800 }}>FILTERED</span>}
                    </div>
                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: 'var(--pv-text)', marginBottom: '0.25rem' }}>
                      {fmt(stat.median_award)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)', marginBottom: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                      Median award · {stat.award_count} contracts tracked
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      {[['Min', stat.min_award], ['Avg', stat.avg_award], ['Max', stat.max_award]].map(([lbl, val]) => (
                        <div key={lbl as string}>
                          <div style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{lbl}</div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--pv-text-mid)', fontFamily: "'DM Sans', sans-serif" }}>{fmt(val as number)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div>
          <div className="pv-section-label">Award History</div>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[['', 'All NAICS'], ['541511', '541511 — Software Dev'], ['541519', '541519 — IT Services'], ['541512', '541512 — Systems Design']].map(([n, label]) => (
              <button key={n} onClick={() => applyFilter(n)} className={`pv-btn pv-btn-sm ${filterNaics === n ? 'pv-btn-navy' : 'pv-btn-outline'}`}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
          ) : !data || data.awards.length === 0 ? (
            <div className="pv-card">
              <div className="pv-empty">
                <div className="pv-empty-icon">🔍</div>
                <div className="pv-empty-title">No award data loaded yet</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)', maxWidth: 320, margin: '0 auto' }}>
                  The daily 6:00 AM ET cron will pull from USASpending.gov automatically. Data covers NAICS 561210, 561720, 561730 for the past 12 months.
                </p>
              </div>
            </div>
          ) : (
            <div className="pv-card pv-fade" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead>
                    <tr><th>Contract #</th><th>Agency</th><th>NAICS</th><th>Awardee</th><th>Amount</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {data.awards.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '0.78rem', fontWeight: 600 }}>{a.contract_number || '—'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--pv-text-mid)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agency || '—'}</td>
                        <td><span className="pv-badge pv-badge-navy" style={{ fontSize: '0.62rem' }}>{a.naics || '—'}</span></td>
                        <td style={{ fontSize: '0.78rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pv-text-mid)' }}>{a.awardee_name || '—'}</td>
                        <td style={{ fontWeight: 800, color: 'var(--pv-navy)', fontFamily: "'DM Sans', sans-serif" }}>{fmt(a.award_amount)}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--pv-muted)' }}>{a.award_date ? new Date(a.award_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* How to Use */}
        <div className="pv-alert pv-alert-info pv-fade">
          <strong>How to use this data:</strong> The median award is your market-clearing price benchmark. Bid within 5–10% of median on commodity contracts. Bid at or above average on complex scopes. A high max/median ratio indicates a fragmented market with pricing power.
        </div>
      </div>
    </AdminShell>
  );
}
