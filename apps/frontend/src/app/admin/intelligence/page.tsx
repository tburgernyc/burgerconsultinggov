'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Award = {
  naics: string;
  agency: string;
  award_amount: number;
  awardee_name: string;
  award_date: string;
  contract_number: string;
  description: string;
};

type MarketStat = {
  naics: string;
  award_count: number;
  avg_award: number;
  min_award: number;
  max_award: number;
  median_award: number;
};

type IntelData = {
  awards: Award[];
  market_stats: MarketStat[];
  last_updated: string;
};

const NAICS_LABELS: Record<string, string> = {
  '561210': 'Facilities Support',
  '561720': 'Janitorial Services',
  '561730': 'Landscaping Services',
};

export default function IntelligencePage() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterNaics, setFilterNaics] = useState('');

  useEffect(() => {
    fetch(`${API}/api/intelligence/awards?limit=100`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  function applyFilter(naics: string) {
    setFilterNaics(naics);
    setLoading(true);
    const qs = naics ? `?naics=${naics}&limit=100` : '?limit=100';
    fetch(`${API}/api/intelligence/awards${qs}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }

  const fmt = (n: number) => n ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Competitive Intelligence</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Historical award data from USASpending.gov — updated daily at 6:00 AM ET
          {data?.last_updated && <> · Last pull: {data.last_updated}</>}
        </p>
      </div>

      {/* Market Stats Cards */}
      {data?.market_stats && data.market_stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {data.market_stats.map(stat => (
            <div key={stat.naics} className="card card-gold" style={{ cursor: 'pointer' }}
                 onClick={() => applyFilter(filterNaics === stat.naics ? '' : stat.naics)}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                {stat.naics} — {NAICS_LABELS[stat.naics] || stat.naics}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.5rem' }}>
                {fmt(stat.median_award)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Median award · {stat.award_count} contracts</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                <div><span style={{ color: 'var(--muted)' }}>Avg</span> <strong>{fmt(stat.avg_award)}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>Max</span> <strong>{fmt(stat.max_award)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', '561210', '561720', '561730'].map(n => (
          <button
            key={n}
            onClick={() => applyFilter(n)}
            className={`btn btn-sm ${filterNaics === n ? 'btn-navy' : 'btn-outline'}`}
          >
            {n ? `${n} — ${NAICS_LABELS[n]}` : 'All NAICS'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">Loading intelligence data...</div>
      ) : !data || data.awards.length === 0 ? (
        <div className="empty-state">
          No award data loaded yet. The daily 6:00 AM cron will pull from USASpending.gov automatically.
          <br /><br />
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Data covers NAICS 561210, 561720, 561730 federal contract awards over the past 12 months.
          </span>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Contract #</th>
                <th>Agency</th>
                <th>NAICS</th>
                <th>Awardee</th>
                <th>Amount</th>
                <th>Award Date</th>
              </tr>
            </thead>
            <tbody>
              {data.awards.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{a.contract_number || '—'}</td>
                  <td style={{ fontSize: '0.8rem' }}>{a.agency || '—'}</td>
                  <td>
                    <span className="badge badge-gold">{a.naics || '—'}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.awardee_name || '—'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(a.award_amount)}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{a.award_date ? new Date(a.award_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, fontSize: '0.8rem', color: '#0369a1' }}>
        <strong>How to use this data:</strong> The median award amount for your NAICS code is your market-clearing price benchmark.
        Bid within 5–10% of median on commodity contracts. Bid at or above average on specialized/complex scopes.
        High max/median ratios indicate a fragmented market with pricing power.
      </div>
    </>
  );
}
