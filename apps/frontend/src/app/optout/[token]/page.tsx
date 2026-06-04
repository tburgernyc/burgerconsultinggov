'use client';

import { use, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function OptOutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');

  useEffect(() => {
    fetch(`${API}/api/outreach/optout/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStatus('success');
        } else {
          setStatus('already');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F8FAFC',
    padding: '2rem 1rem',
    fontFamily: "'DM Sans', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 480,
    width: '100%',
    background: '#fff',
    borderRadius: 12,
    padding: '3rem 2rem',
    border: '1px solid #E4EAF6',
    boxShadow: '0 4px 24px rgba(10,22,40,0.07)',
    textAlign: 'center',
  };

  const logoStyle: React.CSSProperties = {
    fontFamily: "'DM Serif Display', serif",
    color: '#1a2e4a',
    fontSize: '1.1rem',
    fontWeight: 400,
    marginBottom: '2rem',
  };

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>BURGER <span style={{ color: '#C9A84C' }}>CONSULTING</span></div>
          <div style={{ color: '#6B7A99', fontSize: '0.9rem' }}>Processing your request…</div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>BURGER <span style={{ color: '#C9A84C' }}>CONSULTING</span></div>
          <div style={{ width: 52, height: 52, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 1.5rem' }}>✓</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, fontSize: '1.5rem', marginBottom: '0.75rem' }}>Unsubscribed</h1>
          <p style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            You will not receive any further outreach on this solicitation from Burger Consulting LLC.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.78rem', lineHeight: 1.6 }}>
            If you received this email in error or have questions, contact us at{' '}
            <a href="mailto:procurement@burgergov.com" style={{ color: '#1a2e4a' }}>procurement@burgergov.com</a>.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>BURGER <span style={{ color: '#C9A84C' }}>CONSULTING</span></div>
          <div style={{ width: 52, height: 52, background: '#FEF9C3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 1.5rem' }}>ℹ</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, fontSize: '1.5rem', marginBottom: '0.75rem' }}>Already Processed</h1>
          <p style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: '0.88rem' }}>
            This link has already been used or you have already submitted a quote. No further action is needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>BURGER <span style={{ color: '#C9A84C' }}>CONSULTING</span></div>
        <div style={{ width: 52, height: 52, background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 1.5rem' }}>⚠</div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", color: '#1a2e4a', fontWeight: 400, fontSize: '1.5rem', marginBottom: '0.75rem' }}>Link Not Found</h1>
        <p style={{ color: '#6B7A99', lineHeight: 1.7, fontSize: '0.88rem' }}>
          This unsubscribe link is invalid or has expired. Contact{' '}
          <a href="mailto:procurement@burgergov.com" style={{ color: '#1a2e4a' }}>procurement@burgergov.com</a>{' '}
          to be removed from our outreach list.
        </p>
      </div>
    </div>
  );
}
