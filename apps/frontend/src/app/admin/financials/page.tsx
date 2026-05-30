'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Financials = {
  pl_snapshot: { gross_revenue: number; estimated_cogs: number; estimated_gross_profit: number; gross_margin_pct: number; total_contracts: number; };
  ar_aging: { current_0_30: number; days_30_60: number; days_60_90: number; days_90_plus: number; total_ar: number; };
  pipeline_forecast: { total_pipeline_value: number; revenue_at_15pct: number; actual_pipeline_value: number; active_bids: number; };
  margin_by_naics: { naics: string; avg_margin: number; revenue: number; contracts: number }[];
  win_rate_pct: number;
  bids_won: number;
  bids_total: number;
};

const NAICS_LABELS: Record<string, string> = {
  '561210': 'Facilities Support',
  '561720': 'Janitorial',
  '561730': 'Landscaping',
};

export default function FinancialsPage() {
  const [data, setData] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/financials`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading financials...</div>;
  if (!data) return <div className="empty-state">Unable to load financial data.</div>;

  const { pl_snapshot: pl, ar_aging: ar, pipeline_forecast: pf } = data;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Financials</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>P&amp;L snapshot · pipeline forecast · A/R aging</p>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>P&amp;L Snapshot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Gross Revenue', value: fmt(pl.gross_revenue), sub: 'Agency payments received', color: '#166534' },
            { label: 'Est. COGS', value: fmt(pl.estimated_cogs), sub: 'Subcontractor costs', color: '#991b1b' },
            { label: 'Gross Profit', value: fmt(pl.estimated_gross_profit), sub: 'Prime management fee', color: 'var(--navy)' },
            { label: 'Gross Margin', value: pct(pl.gross_margin_pct), sub: 'Target: 15%', color: (pl.gross_margin_pct || 0) >= 15 ? '#166534' : '#92400e' },
            { label: 'Total Contracts', value: String(pl.total_contracts), sub: 'Active + closed', color: 'var(--navy)' },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-label">{c.label}</div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="stat-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>Pipeline Forecast</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Pipeline Value', value: fmt(pf.actual_pipeline_value), sub: 'Active bid opportunities' },
            { label: 'Revenue at 15%', value: fmt(pf.revenue_at_15pct), sub: 'If all bids convert' },
            { label: 'Active Bids', value: String(pf.active_bids), sub: 'In sourcing or proposal' },
            { label: 'Win Rate', value: pct(data.win_rate_pct), sub: `${data.bids_won} of ${data.bids_total} triaged` },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-label">{c.label}</div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-sub">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>
          Accounts Receivable Aging
          {ar.total_ar > 0 && (
            <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
              Total Outstanding: {fmt(ar.total_ar)}
            </span>
          )}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Current (0–30d)', value: fmt(ar.current_0_30), color: '#166534', bg: '#f0fdf4' },
            { label: '30–60 Days', value: fmt(ar.days_30_60), color: '#92400e', bg: '#fffbeb' },
            { label: '60–90 Days', value: fmt(ar.days_60_90), color: '#c2410c', bg: '#fff7ed' },
            { label: '90+ Days', value: fmt(ar.days_90_plus), color: '#991b1b', bg: '#fef2f2' },
          ].map(c => (
            <div key={c.label} className="stat-card" style={{ background: c.bg }}>
              <div className="stat-label" style={{ color: c.color }}>{c.label}</div>
              <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
        {ar.days_90_plus > 0 && (
          <div className="alert-zone urgent" style={{ marginTop: '0.75rem' }}>
            <strong>{fmt(ar.days_90_plus)}</strong> outstanding 90+ days. Hermes has dispatched automated follow-up emails. Consider escalating to contracting officer directly.
          </div>
        )}
      </section>

      {data.margin_by_naics.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', color: 'var(--navy)', marginBottom: '0.75rem' }}>Margin by NAICS</h2>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>NAICS</th><th>Service Line</th><th>Contracts</th><th>Revenue</th><th>Avg Margin</th></tr></thead>
              <tbody>
                {data.margin_by_naics.map(n => (
                  <tr key={n.naics}>
                    <td><span className="badge badge-gold">{n.naics}</span></td>
                    <td>{NAICS_LABELS[n.naics] || n.naics}</td>
                    <td>{n.contracts}</td>
                    <td>{fmt(n.revenue)}</td>
                    <td style={{ color: (n.avg_margin || 0) >= 15 ? '#166534' : '#92400e', fontWeight: 700 }}>
                      {n.avg_margin ? `${n.avg_margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
