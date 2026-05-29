'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const INVOICE_PIPELINE = [
  'SUBMITTED', 'UNDER_REVIEW', 'APPROVED_BY_PRIME',
  'INVOICE_SENT_TO_AGENCY', 'PAYMENT_RECEIVED_BY_PRIME', 'PAYMENT_RELEASED_TO_VENDOR',
];

export default function InvoicesPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [form, setForm] = useState({ contract_id: '', total_amount: '', period_start: '', period_end: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/contracts/active`).then(r => r.json()).then(d => setContracts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/api/contracts/${form.contract_id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: '', period_start: form.period_start, period_end: form.period_end, total_amount: parseFloat(form.total_amount) }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>Invoice Submission</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Submit invoices and track payment status in real time.</p>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Payment Pipeline</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1rem' }}>Your invoice moves through these stages after submission.</p>
          <div className="pipeline">
            {INVOICE_PIPELINE.map((step, i) => (
              <div key={step} className={`pipeline-step ${i === 0 ? 'current' : ''}`}>
                {step.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>

        {submitted ? (
          <div className="alert-zone info">Invoice submitted successfully. Timothy will review within 24 hours.</div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Submit New Invoice</h2>
            <div className="form-group">
              <label className="form-label">Contract *</label>
              <select className="form-input" required value={form.contract_id}
                onChange={e => setForm(f => ({ ...f, contract_id: e.target.value }))}>
                <option value="">Select a contract...</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contract_number} — {c.agency}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Period Start *</label>
                <input className="form-input" type="date" required value={form.period_start}
                  onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Period End *</label>
                <input className="form-input" type="date" required value={form.period_end}
                  onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount ($) *</label>
              <input className="form-input" type="number" step="0.01" required value={form.total_amount}
                onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0.00" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Submitting...' : 'Submit Invoice'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

type Contract = { id: string; contract_number: string; agency: string; };
