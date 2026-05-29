'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VendorPortalPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    legal_name: '', cage_code: '', email: '', phone: '',
    contact_name: '', zip_code: '', city: '', state: '',
    naics_codes: [] as string[], notes: '',
    pay_when_paid_accepted: false,
  });

  const naicsOptions = [
    { value: '561210', label: '561210 — Facilities Support' },
    { value: '561720', label: '561720 — Janitorial Services' },
    { value: '561730', label: '561730 — Landscaping Services' },
  ];

  function toggleNaics(code: string) {
    setForm(f => ({
      ...f,
      naics_codes: f.naics_codes.includes(code)
        ? f.naics_codes.filter(c => c !== code)
        : [...f.naics_codes, code]
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Application Received</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Thank you for applying to the Burger Consulting vendor network.
            Timothy will review your application within 24 hours.
            You will receive an email with login credentials once approved.
          </p>
          <Link href="/" className="btn btn-navy">Return Home</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section style={{ background: 'var(--navy)', color: 'var(--white)', padding: '3rem 0' }}>
        <div className="container">
          <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Subcontractor Application</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Vendor Partnership Portal</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>
            Apply to join the Burger Consulting vendor network and receive federal contract RFQs.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="card">
              <h2 style={{ fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Business Information</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Legal Business Name *</label>
                  <input className="form-input" required value={form.legal_name}
                    onChange={e => setForm(f => ({ ...f, legal_name: e.target.value }))}
                    placeholder="Acme Cleaning Services LLC" />
                </div>
                <div className="form-group">
                  <label className="form-label">CAGE Code (if registered)</label>
                  <input className="form-input" value={form.cage_code}
                    onChange={e => setForm(f => ({ ...f, cage_code: e.target.value }))}
                    placeholder="5-character CAGE code" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NAICS Codes (select all that apply) *</label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {naicsOptions.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={form.naics_codes.includes(opt.value)}
                        onChange={() => toggleNaics(opt.value)} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Contact Name *</label>
                  <input className="form-input" required value={form.contact_name}
                    onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Email *</label>
                  <input className="form-input" type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contact@yourbusiness.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="(555) 555-5555" />
                </div>
                <div className="form-group">
                  <label className="form-label">Service ZIP Code</label>
                  <input className="form-input" value={form.zip_code}
                    onChange={e => setForm(f => ({ ...f, zip_code: e.target.value }))}
                    placeholder="10001" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="New York" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="NY" maxLength={2} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Additional Information</label>
                <textarea className="form-input form-textarea" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Years in operation, team size, service area, certifications..." />
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ color: '#92400e', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Pay-When-Paid Terms</h4>
                <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  Burger Consulting operates on a Pay-When-Paid basis. Vendor payment is issued within
                  30 days of receipt of agency payment. No payment is guaranteed prior to agency receipt.
                  This is standard practice for federal subcontracting.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#78350f' }}>
                  <input type="checkbox" required checked={form.pay_when_paid_accepted}
                    onChange={e => setForm(f => ({ ...f, pay_when_paid_accepted: e.target.checked }))}
                    style={{ marginTop: '2px' }} />
                  I understand and accept the Pay-When-Paid payment terms *
                </label>
              </div>

              {error && <div className="alert-zone urgent" style={{ marginBottom: '1rem' }}>{error}</div>}

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                {loading ? 'Submitting...' : 'Submit Vendor Application'}
              </button>
            </div>
          </form>

          <div>
            <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '1rem' }}>What Happens Next</h3>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: '0.75rem' }}>{i + 1}</div>
                  <div style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{step}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '1rem' }}>Documents Required After Approval</h3>
              {docs.map((doc) => (
                <div key={doc} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--gold)' }}>•</span> {doc}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const steps = [
  'Application received and logged in the vendor registry.',
  'Timothy reviews your application within 24 hours.',
  'Upon approval, you receive login credentials via email.',
  'Upload required compliance documents in the portal.',
  'Begin receiving RFQs for active solicitations in your NAICS area.',
];

const docs = [
  'General Liability Insurance Certificate',
  'W-9 (current)',
  'State business license',
  'SAM.gov screenshot or CAGE verification',
];
