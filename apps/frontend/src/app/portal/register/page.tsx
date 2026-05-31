'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STEPS = [
  { label: 'Business', short: 'Business Identity' },
  { label: 'Contact', short: 'Contact & Capacity' },
  { label: 'Docs', short: 'Compliance Docs' },
  { label: 'Terms', short: 'Terms & Submit' },
];

const NAICS_OPTIONS = [
  { code: '541511', label: 'Custom Software & Web Development' },
  { code: '541519', label: 'IT Services & Project Management' },
  { code: '541512', label: 'Systems Design & IT Infrastructure' },
];

const VALUE_PROPS = [
  { icon: '💻', title: 'Federal IT work, matched to your skills', desc: 'We match federal IT contracts to your specific tech stack — React, Python, cloud, 508, or PM.' },
  { icon: '💰', title: 'Transparent Net-30 payment', desc: 'We pay within 30 days of agency receipt — every time, tracked in your portal dashboard.' },
  { icon: '📋', title: 'We handle compliance & billing', desc: 'Focus on the code. We manage FAR compliance, agency communication, and invoicing.' },
  { icon: '🤝', title: 'Grow your federal track record', desc: 'Build documented past performance on federal IT work through our prime contractor vehicle.' },
];

export default function VendorRegisterPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    legal_name: '', cage_code: '', naics_codes: [] as string[],
    zip_code: '', city: '', state: '',
    contact_name: '', email: '', phone: '', notes: '',
    pay_when_paid_accepted: false,
  });

  function set(field: string, value: unknown) { setForm(prev => ({ ...prev, [field]: value })); }
  function toggleNaics(code: string) {
    const arr = form.naics_codes.includes(code)
      ? form.naics_codes.filter(c => c !== code)
      : [...form.naics_codes, code];
    set('naics_codes', arr);
  }

  function canAdvance() {
    if (step === 0) return !!form.legal_name;
    if (step === 1) return !!form.contact_name && !!form.email;
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
    } catch {
      setError('Submission failed. Please try again or email procurement@burgergov.com.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', background: 'var(--pv-cream)', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ maxWidth: 540, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--pv-success-bg)', border: '3px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', margin: '0 auto 1.5rem' }}>
            ✓
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--pv-text)', marginBottom: '0.75rem', fontWeight: 400 }}>
            Application Submitted
          </h1>
          <p style={{ color: 'var(--pv-text-mid)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Thank you, <strong>{form.legal_name}</strong>. Your application is under review. Timothy personally reviews each application and you will receive login credentials at <strong>{form.email}</strong> within 24 hours of approval.
          </p>
          <div className="pv-card" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', marginBottom: '1rem' }}>What happens next</div>
            {[
              { step: '1', label: 'Timothy reviews your application', time: 'Within 24 hours' },
              { step: '2', label: 'You receive portal login credentials via email', time: 'Upon approval' },
              { step: '3', label: 'RFQs matched to your NAICS codes begin arriving', time: 'Immediately after login' },
              { step: '4', label: 'Submit quotes and win your first contract', time: 'Ongoing' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#7C5100', flexShrink: 0, marginTop: 1 }}>{item.step}</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pv-text)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', marginTop: '0.1rem' }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/" className="pv-btn pv-btn-navy" style={{ justifyContent: 'center' }}>Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', fontFamily: "'DM Sans', sans-serif", background: 'var(--pv-cream)' }}>
      {/* Left — Value Props */}
      <div style={{
        width: '38%', flexShrink: 0,
        background: 'linear-gradient(160deg, #08111F 0%, #0a1628 70%, #132238 100%)',
        padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 60px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: '#C9A84C', marginBottom: '0.5rem' }}>
            Burger Consulting LLC
          </div>
          <div style={{ width: 36, height: 2, background: 'linear-gradient(90deg, #C9A84C, transparent)', marginBottom: '2rem' }} />
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#fff', lineHeight: 1.35, marginBottom: '2rem' }}>
            Partner with a federal prime contractor and access U.S. government contracts.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {VALUE_PROPS.map(prop => (
              <div key={prop.title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0, marginTop: 1 }}>
                  {prop.icon}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.15rem' }}>{prop.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.76rem', lineHeight: 1.5 }}>{prop.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
            Already have an account?{' '}
            <Link href="/portal" style={{ color: 'var(--pv-gold)', textDecoration: 'none' }}>Sign in here →</Link>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ flex: 1, padding: '3rem 3rem 3rem 2.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: 'var(--pv-text)', fontWeight: 400, marginBottom: '0.3rem' }}>
              Subcontractor Application
            </h1>
            <p style={{ color: 'var(--pv-muted)', fontSize: '0.86rem' }}>
              Complete all 4 steps — takes about 5 minutes.
            </p>
          </div>

          {/* Step Wizard */}
          <div className="pv-wizard" style={{ marginBottom: '2rem' }}>
            {STEPS.map((s, i) => {
              const cls = i === step ? 'ws-active' : i < step ? 'ws-done' : '';
              return (
                <div key={s.label} className={`pv-wizard-step ${cls}`}>
                  <span className="pv-wizard-num">{i < step ? '✓' : i + 1}</span>
                  <span style={{ display: 'none' }}>{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Step Title */}
          <div style={{ marginBottom: '1.375rem' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)' }}>
              Step {step + 1}: {STEPS[step].short}
            </div>
          </div>

          {/* Step 0: Business Identity */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="pv-form-group">
                <label className="pv-label">Legal Business Name *</label>
                <input type="text" required className="pv-input" value={form.legal_name}
                  onChange={e => set('legal_name', e.target.value)} placeholder="Acme Facilities LLC" />
              </div>
              <div className="pv-form-group">
                <label className="pv-label">CAGE Code <span style={{ color: 'var(--pv-muted)', fontWeight: 400 }}>(if registered)</span></label>
                <input type="text" className="pv-input" value={form.cage_code}
                  onChange={e => set('cage_code', e.target.value)} placeholder="5-character code, e.g. 7ABC3" />
                <span className="pv-form-hint">Required only if you have an active SAM.gov registration</span>
              </div>
              <div className="pv-form-group">
                <label className="pv-label">Service Capabilities — NAICS Codes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.25rem' }}>
                  {NAICS_OPTIONS.map(opt => (
                    <label key={opt.code} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', padding: '0.75rem', border: `1.5px solid ${form.naics_codes.includes(opt.code) ? 'var(--pv-gold)' : 'var(--pv-border)'}`, borderRadius: 8, background: form.naics_codes.includes(opt.code) ? 'var(--pv-gold-pale)' : 'var(--pv-white)', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={form.naics_codes.includes(opt.code)} onChange={() => toggleNaics(opt.code)} style={{ accentColor: 'var(--pv-gold)', width: 16, height: 16 }} />
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pv-text)' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)' }}>NAICS {opt.code}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '0.75rem' }}>
                <div className="pv-form-group" style={{ marginBottom: 0 }}>
                  <label className="pv-label">City</label>
                  <input type="text" className="pv-input" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="pv-form-group" style={{ marginBottom: 0 }}>
                  <label className="pv-label">ZIP Code</label>
                  <input type="text" className="pv-input" value={form.zip_code} onChange={e => set('zip_code', e.target.value)} maxLength={10} />
                </div>
                <div className="pv-form-group" style={{ marginBottom: 0 }}>
                  <label className="pv-label">State</label>
                  <input type="text" className="pv-input" value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} placeholder="NY" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Contact & Capacity */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="pv-form-group">
                <label className="pv-label">Primary Contact Name *</label>
                <input type="text" required className="pv-input" value={form.contact_name}
                  onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="pv-form-group">
                <label className="pv-label">Business Email Address *</label>
                <input type="email" required className="pv-input" value={form.email}
                  onChange={e => set('email', e.target.value)} placeholder="jane@yourcompany.com" />
                <span className="pv-form-hint">This will become your portal login username</span>
              </div>
              <div className="pv-form-group">
                <label className="pv-label">Phone Number</label>
                <input type="tel" className="pv-input" value={form.phone}
                  onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="pv-form-group" style={{ marginBottom: 0 }}>
                <label className="pv-label">About Your Company</label>
                <textarea className="pv-input pv-textarea" value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Team size, years in business, service areas, bonding capacity, maximum concurrent contracts, mobilization time — anything that helps us evaluate the partnership." />
              </div>
            </div>
          )}

          {/* Step 2: Compliance Docs */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--pv-text-mid)', lineHeight: 1.65, marginBottom: '1.375rem' }}>
                The following documents are required before your first contract. Upload them through the Document Vault after your account is approved — no need to provide them now.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { label: 'General Liability Insurance Certificate', required: true, note: 'Min. $1M/occurrence, $2M aggregate. Must name Burger Consulting LLC as additional insured.' },
                  { label: 'W-9 — Taxpayer Identification', required: true, note: 'Current year, signed by authorized rep.' },
                  { label: 'State Business License', required: false, note: 'For the state where services will be performed.' },
                  { label: 'SAM.gov / CAGE Verification', required: false, note: 'Only required if you have an active SAM.gov registration.' },
                ].map(doc => (
                  <div key={doc.label} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem', background: 'var(--pv-white)', border: '1px solid var(--pv-border)', borderRadius: 8, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                      <span className={`pv-badge ${doc.required ? 'pv-badge-red' : 'pv-badge-gray'}`} style={{ fontSize: '0.6rem' }}>
                        {doc.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pv-text)', marginBottom: '0.15rem' }}>{doc.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>{doc.note}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.75rem', color: 'var(--pv-success)', fontWeight: 600 }}>
                      After approval
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Terms */}
          {step === 3 && (
            <div>
              <div style={{ background: 'var(--pv-warning-bg)', border: '1px solid #FDE68A', borderRadius: 10, padding: '1.375rem', marginBottom: '1.375rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400E', marginBottom: '0.625rem' }}>
                  Pay-When-Paid Payment Terms
                </div>
                <p style={{ fontSize: '0.82rem', color: '#78350F', lineHeight: 1.65, marginBottom: '1rem' }}>
                  All subcontractor payments are contingent upon Burger Consulting LLC receiving payment from the federal agency. Payment will be issued within <strong>thirty (30) calendar days</strong> of confirmed agency receipt. No payment is guaranteed prior to agency receipt, regardless of work completion status. This is a standard federal subcontracting term and is non-negotiable.
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.pay_when_paid_accepted}
                    onChange={e => set('pay_when_paid_accepted', e.target.checked)}
                    style={{ marginTop: 3, accentColor: 'var(--pv-gold)', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#7C4100', fontWeight: 600, lineHeight: 1.5 }}>
                    I have read and accept the Pay-When-Paid payment terms *
                  </span>
                </label>
              </div>

              <div style={{ background: 'var(--pv-cream)', border: '1px solid var(--pv-border)', borderRadius: 8, padding: '1rem 1.125rem', marginBottom: '1.375rem', fontSize: '0.78rem', color: 'var(--pv-muted)', lineHeight: 1.6 }}>
                By submitting, you confirm all information provided is accurate and you authorize Burger Consulting LLC to verify your SAM.gov registration status, business credentials, and insurance information.
              </div>

              {error && <div className="pv-alert pv-alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

              {/* Submission Summary */}
              <div className="pv-card" style={{ padding: '1rem', marginBottom: '1.375rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', marginBottom: '0.625rem' }}>Application Summary</div>
                {[
                  { label: 'Business', val: form.legal_name },
                  { label: 'Contact', val: form.contact_name },
                  { label: 'Email', val: form.email },
                  { label: 'NAICS', val: form.naics_codes.length ? form.naics_codes.join(', ') : '—' },
                  { label: 'Location', val: [form.city, form.state].filter(Boolean).join(', ') || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.375rem' }}>
                    <span style={{ color: 'var(--pv-muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--pv-text)', textAlign: 'right' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', gap: '1rem' }}>
            {step > 0 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="pv-btn pv-btn-outline">
                ← Back
              </button>
            ) : (
              <Link href="/portal" className="pv-btn pv-btn-outline">← Sign In</Link>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                className="pv-btn pv-btn-primary"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!form.pay_when_paid_accepted || loading}
                className="pv-btn pv-btn-primary"
              >
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
