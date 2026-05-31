'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Invalid email or password. Contact procurement@burgergov.com if you need access.');
      } else {
        window.location.href = email.includes('procurement@') ? '/admin' : '/portal/dashboard';
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left — Brand Panel */}
      <div style={{
        width: '42%', flexShrink: 0,
        background: 'linear-gradient(160deg, #08111F 0%, #0a1628 60%, #132238 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3.5rem 3rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'repeating-linear-gradient(0deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #C9A84C 0px, #C9A84C 1px, transparent 1px, transparent 60px)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.5rem' }}>
            Federal Procurement PMO
          </div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: '#C9A84C', lineHeight: 1.2 }}>
            Burger Consulting LLC
          </div>
          <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg, #C9A84C, transparent)', marginTop: '0.75rem' }} />
        </div>

        {/* Value Props */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: '#fff', lineHeight: 1.3, marginBottom: '2rem' }}>
            Your partnership with a federal prime contractor — simplified.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {[
              { icon: '📋', title: 'Bid on federal opportunities', desc: 'Receive curated RFQs matched to your NAICS codes and capacity.' },
              { icon: '💰', title: 'Transparent payment tracking', desc: 'See exactly where your payment is in the pipeline at all times.' },
              { icon: '📁', title: 'Compliance made simple', desc: 'Manage all required documents in one place with automated expiry alerts.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, marginTop: 2 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.2rem' }}>{item.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ position: 'relative' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[['EIN', '84-3113166'], ['NAICS', '561210 / 561720 / 561730'], ['Entity', 'Small Business']].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.1rem' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', background: 'var(--pv-cream)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <div style={{ marginBottom: '2.25rem' }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.875rem', color: 'var(--pv-text)', fontWeight: 400, marginBottom: '0.4rem' }}>
              Sign in
            </h1>
            <p style={{ color: 'var(--pv-muted)', fontSize: '0.875rem' }}>
              Access your subcontractor dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="pv-form-group">
              <label className="pv-label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" required autoComplete="email"
                className="pv-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{ fontSize: '0.95rem' }}
              />
            </div>

            <div className="pv-form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <label className="pv-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              </div>
              <input
                id="password" type="password" required autoComplete="current-password"
                className="pv-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ fontSize: '0.95rem', letterSpacing: '0.12em' }}
              />
            </div>

            {error && (
              <div className="pv-alert pv-alert-error" style={{ marginBottom: '1.25rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="pv-btn pv-btn-navy pv-btn-full pv-btn-lg"
              style={{ fontSize: '0.95rem', justifyContent: 'center' }}
            >
              {loading ? (
                <span style={{ opacity: 0.7 }}>Signing in…</span>
              ) : (
                <>Sign In to Portal</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--pv-border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', fontWeight: 500 }}>New partner?</span>
            <div style={{ flex: 1, height: 1, background: 'var(--pv-border)' }} />
          </div>

          <Link href="/portal/register" className="pv-btn pv-btn-outline pv-btn-full" style={{ justifyContent: 'center', fontSize: '0.9rem' }}>
            Apply as a Subcontractor
          </Link>

          {/* What to expect */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', borderRadius: 10 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#7C5100', marginBottom: '0.625rem' }}>
              Don't have credentials?
            </div>
            <p style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.55 }}>
              After your application is approved by Timothy, you will receive login credentials via email within 24 hours. Contact <strong>procurement@burgergov.com</strong> with questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
