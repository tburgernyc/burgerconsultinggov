'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PortalShell } from '@/components/PortalShell';
import { VENDOR_API as API } from '@/lib/api';

type Rfq = { solicitation_id: string; agency: string; naics: string; estimated_value: number; status: string; response_deadline: string; };

function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function RFQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const vendorId = useMemo(() => (session?.user as { id?: string })?.id ?? '', [session]);

  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    labor_rate_hourly: '', labor_hours: '', materials_cost: '', overhead_pct: '10',
    period_of_performance: '', pay_when_paid_confirmed: false, notes: '',
  });

  useEffect(() => {
    fetch(`${API}/api/solicitations/list`)
      .then(r => r.json())
      .then((data: Rfq[]) => {
        const found = Array.isArray(data) ? data.find(s => s.solicitation_id === id) : null;
        setRfq(found || { solicitation_id: id, agency: 'Federal Agency', naics: '', estimated_value: 0, status: 'READY_FOR_SOURCING', response_deadline: '' });
      })
      .catch(() => setRfq({ solicitation_id: id, agency: 'Federal Agency', naics: '', estimated_value: 0, status: 'READY_FOR_SOURCING', response_deadline: '' }));
  }, [id]);

  // Auto-calculate total
  const laborTotal = (parseFloat(form.labor_rate_hourly) || 0) * (parseFloat(form.labor_hours) || 0);
  const materialsTotal = parseFloat(form.materials_cost) || 0;
  const subtotal = laborTotal + materialsTotal;
  const overhead = subtotal * ((parseFloat(form.overhead_pct) || 0) / 100);
  const grandTotal = subtotal + overhead;

  function fmt(n: number) { return n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'; }

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) { setSubmitError('Session expired — please sign out and sign back in.'); return; }
    if (!form.pay_when_paid_confirmed) { setSubmitError('You must confirm Pay-When-Paid terms to proceed.'); return; }
    if (grandTotal <= 0) { setSubmitError('Please enter valid pricing details.'); return; }
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API}/api/quotes/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitation_id: id,
          vendor_id: vendorId,
          total_amount: grandTotal,
          labor_rate_hourly: parseFloat(form.labor_rate_hourly) || null,
          materials_cost: materialsTotal || null,
          period_of_performance: form.period_of_performance,
          pay_when_paid_confirmed: form.pay_when_paid_confirmed,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.detail || `Submission failed (${res.status}). Please try again.`);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Network error — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const days = rfq ? daysUntil(rfq.response_deadline) : null;
  const urgent = days !== null && days <= 5;

  if (submitted) {
    return (
      <PortalShell title="Quote Submitted" breadcrumb="Dashboard / Open RFQs / Submit Quote">
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--pv-success-bg)', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem' }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: 'var(--pv-text)', marginBottom: '0.75rem', fontWeight: 400 }}>
            Quote Successfully Submitted
          </h2>
          <p style={{ color: 'var(--pv-text-mid)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem', fontFamily: "'DM Sans', sans-serif" }}>
            Your quote for <strong>{id}</strong> is now under review. Timothy will evaluate all submissions and notify you of the outcome within 48–72 hours.
          </p>
          <div className="pv-card" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', marginBottom: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>What happens next</div>
            {[
              'Quote received and logged in our system',
              'Pricing analysis compared to market benchmarks',
              'Timothy selects optimal vendor and notifies all parties',
              'Contract executed and performance period begins',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: i < 3 ? '0.75rem' : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#7C5100', flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--pv-text-mid)', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{step}</div>
              </div>
            ))}
          </div>
          <Link href="/portal/dashboard" className="pv-btn pv-btn-navy pv-btn-full" style={{ justifyContent: 'center' }}>
            Return to Dashboard
          </Link>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      title="Submit Quote"
      subtitle={rfq ? `Solicitation ${rfq.solicitation_id} — ${rfq.agency}` : 'Loading…'}
      breadcrumb="Dashboard / Open RFQs / Submit Quote"
    >
      <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Solicitation Brief */}
        {rfq && (
          <div className="pv-card pv-card-gold-border pv-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)', marginBottom: '0.25rem' }}>
                  {rfq.solicitation_id}
                </div>
                <div style={{ color: 'var(--pv-text-mid)', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>{rfq.agency}</div>
              </div>
              {days !== null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: urgent ? 'var(--pv-danger)' : 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>Response Deadline</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: urgent ? 'var(--pv-danger)' : 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif" }}>
                    {days > 0 ? `${days} days` : 'Deadline passed'}
                  </div>
                  {rfq.response_deadline && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                      {new Date(rfq.response_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ height: 1, background: 'var(--pv-border)', margin: '1.25rem 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'NAICS Code', val: rfq.naics || 'See SOW' },
                { label: 'Est. Contract Value', val: rfq.estimated_value ? `$${Number(rfq.estimated_value).toLocaleString()}` : 'TBD' },
                { label: 'Contract Type', val: 'Firm-Fixed-Price' },
                { label: 'Payment Terms', val: 'Net-30 / Pay-When-Paid' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--pv-text)', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

            {/* Pricing Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Labor */}
              <div className="pv-card pv-fade pv-d1">
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Labor Pricing</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="pv-form-group">
                    <label className="pv-label">Hourly Labor Rate ($)</label>
                    <input type="number" step="0.01" min="0" className="pv-input"
                      value={form.labor_rate_hourly}
                      onChange={e => set('labor_rate_hourly', e.target.value)}
                      placeholder="e.g. 22.50" />
                    <span className="pv-form-hint">SCA minimum wage floor applies</span>
                  </div>
                  <div className="pv-form-group">
                    <label className="pv-label">Estimated Hours (total)</label>
                    <input type="number" step="1" min="0" className="pv-input"
                      value={form.labor_hours}
                      onChange={e => set('labor_hours', e.target.value)}
                      placeholder="e.g. 2080" />
                    <span className="pv-form-hint">For base period of performance</span>
                  </div>
                </div>
                {laborTotal > 0 && (
                  <div style={{ padding: '0.75rem', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', borderRadius: 8, fontSize: '0.83rem', color: '#7C5100', fontFamily: "'DM Sans', sans-serif" }}>
                    Labor subtotal: <strong>${laborTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                )}
              </div>

              {/* Materials & Overhead */}
              <div className="pv-card pv-fade pv-d2">
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Materials & Overhead</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="pv-form-group">
                    <label className="pv-label">Materials Cost ($)</label>
                    <input type="number" step="0.01" min="0" className="pv-input"
                      value={form.materials_cost}
                      onChange={e => set('materials_cost', e.target.value)}
                      placeholder="0.00" />
                    <span className="pv-form-hint">Supplies, equipment, consumables</span>
                  </div>
                  <div className="pv-form-group">
                    <label className="pv-label">Overhead / Profit (%)</label>
                    <input type="number" step="0.1" min="0" max="50" className="pv-input"
                      value={form.overhead_pct}
                      onChange={e => set('overhead_pct', e.target.value)} />
                    <span className="pv-form-hint">Applied to labor + materials</span>
                  </div>
                </div>
                <div className="pv-form-group" style={{ marginBottom: 0 }}>
                  <label className="pv-label">Period of Performance</label>
                  <input type="text" className="pv-input"
                    value={form.period_of_performance}
                    onChange={e => set('period_of_performance', e.target.value)}
                    placeholder="e.g. 12 months / Base + 4 Option Years" />
                </div>
              </div>

              {/* Notes */}
              <div className="pv-card pv-fade pv-d3">
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Notes & Clarifications</div>
                <div className="pv-form-group" style={{ marginBottom: 0 }}>
                  <label className="pv-label">Questions, assumptions, or scope notes</label>
                  <textarea className="pv-input pv-textarea" style={{ minHeight: 100 }}
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Any questions, key assumptions about scope, mobilization timeline, or other details Timothy should know about your quote…" />
                </div>
              </div>
            </div>

            {/* Price Summary Sidebar */}
            <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="pv-card pv-card-navy-border pv-fade pv-d1">
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Quote Summary</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: "'DM Sans', sans-serif" }}>
                  {[
                    { label: 'Labor', val: laborTotal },
                    { label: 'Materials', val: materialsTotal },
                    { label: 'Overhead / Profit', val: overhead },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--pv-muted)' }}>{row.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--pv-text-mid)' }}>{fmt(row.val)}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: 'var(--pv-border)', margin: '0.25rem 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pv-text)' }}>Total Quote</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: grandTotal > 0 ? 'var(--pv-navy)' : 'var(--pv-muted)' }}>{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* PWP Terms */}
              <div style={{ background: 'var(--pv-warning-bg)', border: '1px solid #FDE68A', borderRadius: 10, padding: '1.125rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400E', marginBottom: '0.625rem', fontFamily: "'DM Sans', sans-serif" }}>
                  Pay-When-Paid Terms
                </div>
                <p style={{ fontSize: '0.78rem', color: '#78350F', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: '0.875rem' }}>
                  Payment will be issued to you within <strong>Net-30 days</strong> of Burger Consulting LLC receiving confirmed payment from the federal agency. This is a standard federal subcontracting term.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.pay_when_paid_confirmed}
                    onChange={e => set('pay_when_paid_confirmed', e.target.checked)}
                    style={{ marginTop: 3, accentColor: 'var(--pv-gold)', width: 15, height: 15, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#7C4100', fontWeight: 600, lineHeight: 1.45, fontFamily: "'DM Sans', sans-serif" }}>
                    I understand and accept Pay-When-Paid terms *
                  </span>
                </label>
              </div>

              {submitError && (
                <div className="pv-alert pv-alert-error">{submitError}</div>
              )}

              <button
                type="submit"
                disabled={loading || !form.pay_when_paid_confirmed || grandTotal <= 0}
                className="pv-btn pv-btn-primary pv-btn-full pv-btn-lg"
                style={{ justifyContent: 'center' }}
              >
                {loading ? 'Submitting…' : `Submit Quote — ${fmt(grandTotal)}`}
              </button>

              <Link href="/portal/dashboard" className="pv-btn pv-btn-outline pv-btn-full" style={{ justifyContent: 'center' }}>
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </PortalShell>
  );
}
