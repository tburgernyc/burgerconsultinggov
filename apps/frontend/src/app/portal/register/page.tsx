'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STEPS = ['Business Identity', 'Contact & Capacity', 'Compliance Docs', 'Terms'];

export default function VendorRegisterPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    legal_name: '', cage_code: '', naics_codes: [] as string[],
    email: '', phone: '', contact_name: '', zip_code: '', city: '', state: '',
    notes: '', pay_when_paid_accepted: false,
  });

  function f(field: string, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleNaics(code: string) {
    const arr = form.naics_codes.includes(code)
      ? form.naics_codes.filter(c => c !== code)
      : [...form.naics_codes, code];
    f('naics_codes', arr);
  }

  async function handleFinalSubmit() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <section className="section"><div className="container" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ color: 'var(--navy)' }}>Registration Complete</h1>
        <p style={{ color: 'var(--muted)', margin: '1rem 0 1.5rem' }}>Application received. Expect login credentials within 24 hours upon approval.</p>
        <a href="/" className="btn btn-navy">Return Home</a>
      </div></section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>Vendor Registration</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Complete all 4 steps to apply to the Burger Consulting vendor network.</p>

        <div className="step-wizard" style={{ marginBottom: '2rem' }}>
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>{s}</div>
          ))}
        </div>

        <div className="card">
          {step === 0 && (
            <>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Step 1: Business Identity</h2>
              <div className="form-group"><label className="form-label">Legal Business Name *</label>
                <input className="form-input" required value={form.legal_name} onChange={e => f('legal_name', e.target.value)} placeholder="Acme Services LLC" /></div>
              <div className="form-group"><label className="form-label">CAGE Code (if applicable)</label>
                <input className="form-input" value={form.cage_code} onChange={e => f('cage_code', e.target.value)} placeholder="5-character CAGE" /></div>
              <div className="form-group"><label className="form-label">NAICS Codes</label>
                {[['561210','Facilities Support'],['561720','Janitorial'],['561730','Landscaping']].map(([code, label]) => (
                  <label key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.naics_codes.includes(code)} onChange={() => toggleNaics(code)} />
                    {code} — {label}
                  </label>
                ))}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group"><label className="form-label">ZIP Code</label>
                  <input className="form-input" value={form.zip_code} onChange={e => f('zip_code', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={e => f('city', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={e => f('state', e.target.value)} maxLength={2} /></div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Step 2: Contact & Capacity</h2>
              <div className="form-group"><label className="form-label">Contact Name *</label>
                <input className="form-input" required value={form.contact_name} onChange={e => f('contact_name', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Email *</label>
                <input className="form-input" type="email" required value={form.email} onChange={e => f('email', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Additional Notes (capacity, team size, etc.)</label>
                <textarea className="form-input form-textarea" value={form.notes} onChange={e => f('notes', e.target.value)} /></div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Step 3: Compliance Documents</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Documents will be uploaded after account approval through the Document Vault in your portal dashboard.
                Required: General Liability Insurance Certificate, W-9.
              </p>
              {['General Liability Insurance', 'W-9', 'State Business License', 'SAM.gov / CAGE Screenshot'].map((doc, i) => (
                <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--light)', borderRadius: 'var(--radius)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span className={`badge ${i < 2 ? 'badge-red' : 'badge-gray'}`}>{i < 2 ? 'Required' : 'Optional'}</span>
                  <span style={{ color: 'var(--text)' }}>{doc}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.75rem' }}>Upload after approval</span>
                </div>
              ))}
            </>
          )}
          {step === 3 && (
            <>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Step 4: Terms & Acknowledgment</h2>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#92400e', marginBottom: '0.75rem' }}>Pay-When-Paid Terms</h4>
                <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.7 }}>
                  All payments to subcontractors are contingent upon receipt of payment from the federal agency by Burger Consulting LLC.
                  Payment will be issued within thirty (30) calendar days of receipt of agency payment.
                  No payment is guaranteed prior to agency receipt regardless of work completion.
                  This is a standard federal subcontracting term and is non-negotiable.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.875rem' }}>
                <input type="checkbox" required checked={form.pay_when_paid_accepted}
                  onChange={e => f('pay_when_paid_accepted', e.target.checked)} style={{ marginTop: 2 }} />
                I have read and accept the Pay-When-Paid payment terms and all associated conditions. *
              </label>
              <div style={{ background: 'var(--light)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                By submitting, you confirm all information is accurate and you authorize Burger Consulting LLC to verify your SAM.gov registration status and business credentials.
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next →</button>
            ) : (
              <button className="btn btn-primary" disabled={!form.pay_when_paid_accepted || loading} onClick={handleFinalSubmit}>
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
