'use client';

import { use, useEffect, useState } from 'react';
import { fmt } from '@/lib/format';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const PAGE_LOAD_TIME = Date.now();

type Brief = {
  sow_brief: string; solicitation_id: string; agency: string; naics: string;
  estimated_value: number | null; response_deadline: string | null;
  entity_name: string; contact_name: string;
};

type LaborRow = { title: string; hours: string; rate: string };

export default function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [vendorName, setVendorName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [laborRows, setLaborRows] = useState<LaborRow[]>([
    { title: '', hours: '', rate: '' },
  ]);
  const [pop, setPop] = useState('');
  const [techStack, setTechStack] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [pwp, setPwp] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch(`${API}/api/quote/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setBrief(d);
        if (d.entity_name) setVendorName(d.entity_name);
        if (d.contact_name) setContactName(d.contact_name);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const totalAmount = laborRows.reduce((sum, r) => {
    const hrs = parseFloat(r.hours) || 0;
    const rate = parseFloat(r.rate) || 0;
    return sum + hrs * rate;
  }, 0);

  function addRow() { setLaborRows(r => [...r, { title: '', hours: '', rate: '' }]); }
  function removeRow(i: number) { setLaborRows(r => r.filter((_, idx) => idx !== i)); }
  function updateRow(i: number, field: keyof LaborRow, value: string) {
    setLaborRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorName || !contactEmail || laborRows.every(r => !r.title)) {
      setError('Please fill in company name, contact email, and at least one labor category.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/quote/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: vendorName,
          contact_name: contactName,
          contact_email: contactEmail,
          labor_categories: laborRows.filter(r => r.title).map(r => ({
            title: r.title, hours: parseFloat(r.hours) || 0, rate: parseFloat(r.rate) || 0,
          })),
          total_amount: totalAmount,
          period_of_performance: pop,
          tech_stack: techStack ? techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
          deliverables,
          pay_when_paid_accepted: pwp,
          notes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB',
    borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
    color: '#1a2e4a', background: '#fff', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: '#6B7A99', display: 'block', marginBottom: '0.35rem',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ color: '#6B7A99', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}>Loading quote request…</div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '2rem' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, marginBottom: '0.75rem' }}>Quote Link Not Found</h1>
        <p style={{ color: '#6B7A99', fontSize: '0.9rem', lineHeight: 1.6 }}>This quote link may have already been used, expired, or is invalid. Contact <strong>procurement@burgergov.com</strong> if you believe this is an error.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '2rem' }}>
      <div style={{ maxWidth: 520, textAlign: 'center', background: '#fff', borderRadius: 12, padding: '3rem 2rem', border: '1px solid #E4EAF6', boxShadow: '0 4px 24px rgba(10,22,40,0.07)' }}>
        <div style={{ width: 56, height: 56, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1.5rem' }}>✓</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, marginBottom: '0.75rem', fontSize: '1.75rem' }}>Quote Received</h1>
        <p style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Thank you. Burger Consulting LLC has received your subcontract quote for <strong>{brief?.solicitation_id}</strong>. We will review all submissions and be in touch within 48 hours.
        </p>
        <div style={{ background: '#FFF8E7', border: '1px solid #FDE68A', borderRadius: 8, padding: '1rem', fontSize: '0.82rem', color: '#92400E' }}>
          Want to be on our standing vendor list for future opportunities?<br />
          <a href="/portal/register" style={{ color: '#1a2e4a', fontWeight: 700 }}>Register as a BCG Subcontractor →</a>
        </div>
      </div>
    </div>
  );

  const deadline = brief?.response_deadline ? new Date(brief.response_deadline) : null;
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - PAGE_LOAD_TIME) / 86400000) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '2rem 1rem', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontSize: '1.2rem', fontWeight: 400 }}>
            BURGER <span style={{ color: '#C9A84C' }}>CONSULTING</span>
          </div>
          <div style={{ flex: 1, height: 1, background: '#E4EAF6' }} />
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Subcontract Quote Request</div>
        </div>

        {/* Solicitation Brief */}
        <div style={{ background: '#fff', border: '1px solid #E4EAF6', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(10,22,40,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C9A84C', marginBottom: '0.3rem' }}>Solicitation</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: '#1a2e4a', fontWeight: 400 }}>{brief?.solicitation_id}</div>
              <div style={{ fontSize: '0.83rem', color: '#6B7A99', marginTop: '0.2rem' }}>{brief?.agency || 'Federal Agency'} · NAICS {brief?.naics}</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {brief?.estimated_value && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.06em' }}>Est. Value</div>
                  <div style={{ fontWeight: 700, color: '#1a2e4a' }}>{fmt(brief.estimated_value)}</div>
                </div>
              )}
              {deadline && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.06em' }}>Quote Deadline</div>
                  <div style={{ fontWeight: 700, color: daysLeft !== null && daysLeft <= 5 ? '#DC2626' : '#1a2e4a' }}>
                    {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {daysLeft !== null && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9CA3AF' }}> ({daysLeft}d)</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {brief?.sow_brief && (
            <div style={{ background: '#FFF8E7', border: '1px solid #FDE68A', borderRadius: 8, padding: '1rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400E', marginBottom: '0.6rem' }}>Scope of Work</div>
              <div style={{ fontSize: '0.85rem', color: '#1a2e4a', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{brief.sow_brief}</div>
            </div>
          )}
        </div>

        {/* Quote Form */}
        <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #E4EAF6', borderRadius: 12, padding: '1.75rem', boxShadow: '0 2px 8px rgba(10,22,40,0.05)' }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, fontSize: '1.25rem', marginBottom: '1.5rem' }}>Your Quote</h2>

          {/* Company Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Company Name *</label>
              <input style={inputStyle} value={vendorName} onChange={e => setVendorName(e.target.value)} required placeholder="Your company legal name" />
            </div>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input style={inputStyle} value={contactName} onChange={e => setContactName(e.target.value)} required placeholder="First Last" />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input style={inputStyle} type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required placeholder="you@company.com" />
            </div>
          </div>

          {/* Labor Categories */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Labor Categories & Pricing</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {laborRows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 40px', gap: '0.5rem', alignItems: 'center' }}>
                  <input style={inputStyle} value={row.title} onChange={e => updateRow(i, 'title', e.target.value)} placeholder="e.g. Senior Developer" />
                  <input style={inputStyle} type="number" value={row.hours} onChange={e => updateRow(i, 'hours', e.target.value)} placeholder="Hours" min="0" />
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: '0.85rem' }}>$</span>
                    <input style={{ ...inputStyle, paddingLeft: '1.5rem' }} type="number" value={row.rate} onChange={e => updateRow(i, 'rate', e.target.value)} placeholder="Rate/hr" min="0" />
                  </div>
                  {laborRows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1rem', padding: '0.25rem' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} style={{ marginTop: '0.5rem', background: 'none', border: '1px dashed #D1D5DB', borderRadius: 6, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: '#6B7A99', width: '100%' }}>
              + Add Labor Category
            </button>
            {totalAmount > 0 && (
              <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.9rem', color: '#1a2e4a' }}>
                Total Quote: <strong style={{ fontSize: '1.1rem' }}>{fmt(totalAmount)}</strong>
              </div>
            )}
          </div>

          {/* Period, Tech, Deliverables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Period of Performance</label>
              <input style={inputStyle} value={pop} onChange={e => setPop(e.target.value)} placeholder="e.g. 12 months, base + 2 options" />
            </div>
            <div>
              <label style={labelStyle}>Tech Stack / Certifications</label>
              <input style={inputStyle} value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, Python, AWS, Section 508…" />
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Key Deliverables / Approach (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={deliverables} onChange={e => setDeliverables(e.target.value)} placeholder="Brief description of your technical approach and key deliverables…" />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Additional Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Availability, questions, conditions…" />
          </div>

          {/* Pay-When-Paid */}
          <div style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <input type="checkbox" id="pwp" checked={pwp} onChange={e => setPwp(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, cursor: 'pointer' }} />
            <label htmlFor="pwp" style={{ cursor: 'pointer', fontSize: '0.87rem', color: '#1a2e4a', lineHeight: 1.6 }}>
              <strong>I accept Pay-When-Paid terms.</strong> Payment will be issued within 30 days of Burger Consulting LLC receiving payment from the federal agency. This is our standard subcontract structure.
            </label>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 6, color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '0.875rem', background: '#1a2e4a', color: '#fff', border: 'none', borderRadius: 8, fontSize: '1rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}
          >
            {submitting ? 'Submitting…' : 'Submit Quote to Burger Consulting LLC →'}
          </button>

          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', marginTop: '0.75rem', lineHeight: 1.5 }}>
            Burger Consulting LLC · EIN 84-3113166 · SAM-registered Small Business · New York, NY<br />
            Questions? <a href="mailto:procurement@burgergov.com" style={{ color: '#1a2e4a' }}>procurement@burgergov.com</a>
          </p>
        </form>
      </div>
    </div>
  );
}
