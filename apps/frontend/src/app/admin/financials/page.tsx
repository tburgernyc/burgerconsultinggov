'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Financials = {
  pl_snapshot: { gross_revenue: number; estimated_cogs: number; estimated_gross_profit: number; gross_margin_pct: number; total_contracts: number; };
  ar_aging: { current_0_30: number; days_30_60: number; days_60_90: number; days_90_plus: number; total_ar: number; };
  pipeline_forecast: { total_pipeline_value: number; revenue_at_15pct: number; actual_pipeline_value: number; active_bids: number; };
  margin_by_naics: { naics: string; avg_margin: number; revenue: number; contracts: number; }[];
  win_rate_pct: number; bids_won: number; bids_total: number;
};

const NAICS_LABELS: Record<string, string> = { '541511': 'Custom Software Dev', '541519': 'IT Services & PM', '541512': 'Systems Design', '541690': 'Technical Consulting' };

const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

export default function FinancialsPage() {
  const [data, setData] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/financials`).then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminShell title="Financials" subtitle="P&L · Pipeline · A/R">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1,2,3].map(i => <div key={i} style={{ height: 110, background: '#E4EAF6', borderRadius: 12 }} />)}
      </div>
    </AdminShell>
  );

  if (!data) return (
    <AdminShell title="Financials">
      <div className="pv-card"><div className="pv-empty"><div className="pv-empty-title">Unable to load financial data</div></div></div>
    </AdminShell>
  );

  const { pl_snapshot: pl, ar_aging: ar, pipeline_forecast: pf } = data;
  const arTotal = ar.current_0_30 + ar.days_30_60 + ar.days_60_90 + ar.days_90_plus;
  const arBarWidth = (val: number) => arTotal > 0 ? Math.max(2, Math.round(val / arTotal * 100)) : 0;

  return (
    <AdminShell title="Financials" subtitle="P&L snapshot · pipeline forecast · A/R aging">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* P&L */}
        <div className="pv-fade">
          <div className="pv-section-label">P&L Snapshot</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Gross Revenue', val: fmt(pl.gross_revenue), sub: 'Agency payments received', color: 'var(--pv-success)', bg: 'var(--pv-success-bg)', border: '#6EE7B7' },
              { label: 'Est. COGS', val: fmt(pl.estimated_cogs), sub: 'Subcontractor costs', color: 'var(--pv-danger)', bg: 'var(--pv-danger-bg)', border: '#FCA5A5' },
              { label: 'Gross Profit', val: fmt(pl.estimated_gross_profit), sub: 'Prime management fee', color: 'var(--pv-navy)', bg: '#EEF2FF', border: '#C7D2FE' },
              { label: 'Gross Margin', val: pct(pl.gross_margin_pct), sub: 'Target: 15%', color: (pl.gross_margin_pct || 0) >= 15 ? 'var(--pv-success)' : 'var(--pv-warning)', bg: (pl.gross_margin_pct || 0) >= 15 ? 'var(--pv-success-bg)' : 'var(--pv-warning-bg)', border: (pl.gross_margin_pct || 0) >= 15 ? '#6EE7B7' : '#FDE68A' },
              { label: 'Total Contracts', val: String(pl.total_contracts), sub: 'Active + closed', color: 'var(--pv-text)', bg: '#F8FAFC', border: 'var(--pv-border)' },
            ].map((c, i) => (
              <div key={c.label} className={`pv-stat pv-fade pv-d${i+1}`} style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <div className="pv-stat-label">{c.label}</div>
                <div className="pv-stat-value" style={{ color: c.color, fontSize: '1.5rem' }}>{c.val}</div>
                <div className="pv-stat-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div className="pv-fade pv-d1">
          <div className="pv-section-label">Pipeline Forecast</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Pipeline Value', val: fmt(pf.actual_pipeline_value), sub: 'Active bid opportunities' },
              { label: 'Revenue at 15%', val: fmt(pf.revenue_at_15pct), sub: 'If all bids convert' },
              { label: 'Active Bids', val: String(pf.active_bids), sub: 'In sourcing / proposal' },
              { label: 'Win Rate', val: pct(data.win_rate_pct), sub: `${data.bids_won} of ${data.bids_total} triaged` },
            ].map((c, i) => (
              <div key={c.label} className={`pv-stat pv-fade pv-d${i+1}`}>
                <div className="pv-stat-label">{c.label}</div>
                <div className="pv-stat-value" style={{ fontSize: '1.5rem' }}>{c.val}</div>
                <div className="pv-stat-sub">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* A/R Aging */}
        <div className="pv-fade pv-d2">
          <div className="pv-section-label">
            Accounts Receivable Aging
            {ar.total_ar > 0 && <span style={{ fontWeight: 700, color: 'var(--pv-warning)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Total: {fmt(ar.total_ar)}</span>}
          </div>
          <div className="pv-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                { label: 'Current (0–30 days)', val: ar.current_0_30, color: 'var(--pv-success)', bg: 'var(--pv-success-bg)' },
                { label: '30–60 Days', val: ar.days_30_60, color: 'var(--pv-warning)', bg: 'var(--pv-warning-bg)' },
                { label: '60–90 Days', val: ar.days_60_90, color: '#C2410C', bg: '#FFF7ED' },
                { label: '90+ Days (Overdue)', val: ar.days_90_plus, color: 'var(--pv-danger)', bg: 'var(--pv-danger-bg)' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 160, flexShrink: 0, fontSize: '0.78rem', color: 'var(--pv-text-mid)', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</div>
                  <div style={{ flex: 1, height: 20, background: '#F0F4FB', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: row.bg, width: `${arBarWidth(row.val)}%`, display: 'flex', alignItems: 'center', paddingLeft: 8, transition: 'width 0.5s' }}>
                      {row.val > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: row.color, whiteSpace: 'nowrap' }}>{fmt(row.val)}</span>}
                    </div>
                    {row.val === 0 && <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--pv-muted)' }}>$0</span>}
                  </div>
                </div>
              ))}
            </div>
            {ar.days_90_plus > 0 && (
              <div className="pv-alert pv-alert-error" style={{ marginTop: '1rem' }}>
                <strong>{fmt(ar.days_90_plus)}</strong> outstanding 90+ days. Hermes has dispatched automated A/R follow-up emails. Consider escalating directly to the contracting officer.
              </div>
            )}
          </div>
        </div>

        {/* Margin by NAICS */}
        {data.margin_by_naics.length > 0 && (
          <div className="pv-fade pv-d3">
            <div className="pv-section-label">Margin by NAICS</div>
            <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead><tr><th>NAICS</th><th>Service Line</th><th>Contracts</th><th>Revenue</th><th>Avg Margin</th></tr></thead>
                  <tbody>
                    {data.margin_by_naics.map(n => (
                      <tr key={n.naics}>
                        <td><span className="pv-badge pv-badge-navy">{n.naics}</span></td>
                        <td>{NAICS_LABELS[n.naics] || n.naics}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{n.contracts}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(n.revenue)}</td>
                        <td>
                          <span style={{ fontWeight: 800, fontFamily: "'DM Sans', sans-serif", color: (n.avg_margin || 0) >= 15 ? 'var(--pv-success)' : 'var(--pv-warning)' }}>
                            {n.avg_margin ? `${n.avg_margin.toFixed(1)}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
