'use client';

import { useEffect, useState } from 'react';
import { PortalShell } from '@/components/PortalShell';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Contract = { id: string; contract_number: string; agency: string; total_invoiced: number; total_received: number; contract_value: number; };

const PIPELINE_STAGES = [
  { id: 'SUBMITTED', label: 'Invoice Submitted', desc: 'Received by Burger Consulting' },
  { id: 'PRIME_REVIEW', label: 'Prime Review', desc: 'Timothy reviews & approves' },
  { id: 'SENT_TO_AGENCY', label: 'Sent to Agency', desc: 'Invoice forwarded to contracting officer' },
  { id: 'AGENCY_PROCESSING', label: 'Agency Processing', desc: 'Agency validates & schedules payment' },
  { id: 'PRIME_RECEIVED', label: 'Prime Received', desc: 'Burger Consulting receives funds' },
  { id: 'PAID', label: 'Paid to You', desc: 'Payment released within Net-30' },
];

export default function InvoicesPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contract_id: '', total_amount: '', period_start: '', period_end: '',
  });

  useEffect(() => {
    fetch(`${API}/api/contracts/active`)
      .then(r => r.json())
      .then(d => setContracts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function set(field: string, val: string) { setForm(f => ({ ...f, [field]: val })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API}/api/contracts/${form.contract_id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: '',
          period_start: form.period_start,
          period_end: form.period_end,
          total_amount: parseFloat(form.total_amount),
        }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  const selectedContract = contracts.find(c => c.id === form.contract_id);

  return (
    <PortalShell title="Invoices & Payments" subtitle="Track your billing and payment status in real time">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 900 }}>

        {/* Payment Pipeline Explainer */}
        <div className="pv-card pv-fade">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.375rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.125rem', color: 'var(--pv-text)', marginBottom: '0.2rem' }}>
                Payment Pipeline
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                Every invoice follows this path — you receive automated email updates at each stage.
              </div>
            </div>
            <span className="pv-badge pv-badge-green">Net-30 Guarantee</span>
          </div>

          <div className="pv-pipeline">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.id} className="pv-pipeline-step">
                <div className="pv-pipeline-dot">{i + 1}</div>
                <div className="pv-pipeline-label">{stage.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', borderRadius: 8, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: '0.8rem', color: '#7C5100', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
              <strong>Pay-When-Paid:</strong> Your payment is released within 30 calendar days of Burger Consulting confirming agency receipt. You will receive email confirmation at Stage 5 and Stage 6.
            </p>
          </div>
        </div>

        {/* Invoice Submission Form */}
        <div className="pv-fade pv-d2">
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Submit New Invoice</div>

          {submitted ? (
            <div className="pv-card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--pv-success-bg)', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--pv-text)', fontSize: '1rem', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>Invoice Submitted Successfully</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--pv-text-mid)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                    Timothy will review and process your invoice within 24 hours. You will receive an email confirmation at each stage of the payment pipeline.
                  </p>
                  <button onClick={() => setSubmitted(false)} className="pv-btn pv-btn-outline pv-btn-sm" style={{ marginTop: '0.875rem' }}>
                    Submit Another Invoice
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="pv-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <div className="pv-form-group">
                    <label className="pv-label">Contract *</label>
                    <select className="pv-input" required value={form.contract_id} onChange={e => set('contract_id', e.target.value)}>
                      <option value="">Select a contract…</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>{c.contract_number} — {c.agency}</option>
                      ))}
                    </select>
                  </div>

                  {selectedContract && (
                    <div style={{ background: 'var(--pv-cream)', border: '1px solid var(--pv-border)', borderRadius: 8, padding: '0.875rem', marginBottom: '1.125rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      {[
                        { label: 'Contract Value', val: `$${Number(selectedContract.contract_value || 0).toLocaleString()}` },
                        { label: 'Total Invoiced', val: `$${Number(selectedContract.total_invoiced || 0).toLocaleString()}` },
                        { label: 'Received', val: `$${Number(selectedContract.total_received || 0).toLocaleString()}` },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{item.label}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif", marginTop: '0.1rem' }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="pv-form-group">
                      <label className="pv-label">Service Period Start *</label>
                      <input type="date" required className="pv-input" value={form.period_start} onChange={e => set('period_start', e.target.value)} />
                    </div>
                    <div className="pv-form-group">
                      <label className="pv-label">Service Period End *</label>
                      <input type="date" required className="pv-input" value={form.period_end} onChange={e => set('period_end', e.target.value)} />
                    </div>
                  </div>

                  <div className="pv-form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="pv-label">Invoice Amount ($) *</label>
                    <input type="number" step="0.01" min="0.01" required className="pv-input"
                      value={form.total_amount}
                      onChange={e => set('total_amount', e.target.value)}
                      placeholder="0.00"
                      style={{ fontSize: '1.1rem', fontWeight: 700 }} />
                  </div>

                  <div className="pv-alert pv-alert-info" style={{ marginBottom: '1.25rem' }}>
                    <strong>Before submitting:</strong> Ensure service delivery is complete for the billing period. Attach supporting documentation to procurement@burgergov.com referencing your contract number.
                  </div>

                  <button type="submit" disabled={loading || !form.contract_id} className="pv-btn pv-btn-primary pv-btn-lg pv-btn-full" style={{ justifyContent: 'center' }}>
                    {loading ? 'Submitting…' : 'Submit Invoice'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Payment Terms Box */}
        <div className="pv-card pv-card-success-border pv-fade pv-d3">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🛡️</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.4rem' }}>Payment Protection Commitment</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--pv-text-mid)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: '0.875rem' }}>
                Burger Consulting LLC operates under a strict Pay-When-Paid policy. Once agency payment is confirmed, your funds are released within 30 calendar days — no exceptions. Our automated A/R system follows up with contracting officers on your behalf if agency payment is delayed beyond 30 days.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="pv-badge pv-badge-green">Net-30 Release</span>
                <span className="pv-badge pv-badge-blue">Automated Follow-Up</span>
                <span className="pv-badge pv-badge-gray">Email Notifications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
