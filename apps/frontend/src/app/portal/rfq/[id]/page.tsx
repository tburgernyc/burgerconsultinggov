'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RFQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const vendorId = useMemo(() => (session?.user as { id?: string })?.id ?? '', [session]);
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    total_amount: '', labor_rate_hourly: '', materials_cost: '',
    period_of_performance: '', pay_when_paid_confirmed: false, notes: '',
  });

  useEffect(() => {
    fetch(`${API}/api/solicitations/list`)
      .then(r => r.json())
      .then((data: Rfq[]) => {
        const found = Array.isArray(data) ? data.find(s => s.solicitation_id === id) : null;
        setRfq(found || { solicitation_id: id, agency: 'TBD', naics: '', estimated_value: 0, status: 'READY_FOR_SOURCING' });
      })
      .catch(() => setRfq({ solicitation_id: id, agency: 'TBD', naics: '', estimated_value: 0, status: 'READY_FOR_SOURCING' }));
  }, [id]);

  const [submitError, setSubmitError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      setSubmitError('Session expired — please log out and log back in.');
      return;
    }
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API}/api/quotes/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitation_id: id,
          vendor_id: vendorId,
          total_amount: parseFloat(form.total_amount),
          labor_rate_hourly: form.labor_rate_hourly ? parseFloat(form.labor_rate_hourly) : null,
          materials_cost: form.materials_cost ? parseFloat(form.materials_cost) : null,
          period_of_performance: form.period_of_performance,
          pay_when_paid_confirmed: form.pay_when_paid_confirmed,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.detail || `Submission failed (${res.status}). Please try again.`);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <section className="section"><div className="container" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ color: 'var(--navy)' }}>Quote Submitted</h1>
        <p style={{ color: 'var(--muted)', margin: '1rem 0' }}>Your quote has been submitted and is under review.</p>
        <a href="/portal/dashboard" className="btn btn-navy">Back to Dashboard</a>
      </div></section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/portal/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← Back to Dashboard</a>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', margin: '0.5rem 0' }}>Submit Quote</h1>
          {rfq && <p style={{ color: 'var(--muted)' }}>Solicitation: <strong>{rfq.solicitation_id}</strong> — {rfq.agency}</p>}
        </div>

        {rfq && (
          <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Solicitation #</div><div style={{ fontWeight: 700 }}>{rfq.solicitation_id}</div></div>
              <div><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Agency</div><div style={{ fontWeight: 700 }}>{rfq.agency}</div></div>
              <div><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>NAICS</div><div style={{ fontWeight: 700 }}>{rfq.naics || 'See SOW'}</div></div>
              <div><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Est. Value</div><div style={{ fontWeight: 700 }}>{rfq.estimated_value ? `$${Number(rfq.estimated_value).toLocaleString()}` : 'TBD'}</div></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Pricing Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Total Quote Amount ($) *</label>
                <input className="form-input" type="number" required step="0.01" value={form.total_amount}
                  onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Hourly Labor Rate ($)</label>
                <input className="form-input" type="number" step="0.01" value={form.labor_rate_hourly}
                  onChange={e => setForm(f => ({ ...f, labor_rate_hourly: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Materials Cost ($)</label>
                <input className="form-input" type="number" step="0.01" value={form.materials_cost}
                  onChange={e => setForm(f => ({ ...f, materials_cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Period of Performance</label>
                <input className="form-input" value={form.period_of_performance}
                  onChange={e => setForm(f => ({ ...f, period_of_performance: e.target.value }))}
                  placeholder="e.g. 12 months, Base + 4 Options" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Questions</label>
              <textarea className="form-input form-textarea" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any questions, clarifications, or scope assumptions..." />
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#78350f' }}>
                <input type="checkbox" required checked={form.pay_when_paid_confirmed}
                  onChange={e => setForm(f => ({ ...f, pay_when_paid_confirmed: e.target.checked }))} style={{ marginTop: 2 }} />
                I confirm this quote is submitted on Pay-When-Paid terms. Payment will be issued within 30 days of agency payment receipt. *
              </label>
            </div>
            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>
                {submitError}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              {loading ? 'Submitting...' : 'Submit Quote'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

type Rfq = { solicitation_id: string; agency: string; naics: string; estimated_value: number; status: string; };
