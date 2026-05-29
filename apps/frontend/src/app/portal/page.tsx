'use client';

import { useState } from 'react';

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
      const result = await signIn('credentials', {
        email, password, redirect: false,
      });
      if (result?.error) {
        setError('Invalid credentials. Please try again.');
      } else {
        window.location.href = email.includes('procurement@') ? '/admin' : '/portal/dashboard';
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--light)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>Vendor Portal</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Burger Consulting LLC — Subcontractor Operations</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <div className="alert-zone urgent" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Not yet a partner?</p>
            <a href="/vendor-portal" className="btn btn-outline btn-sm">Apply as Subcontractor</a>
          </div>
        </div>
      </div>
    </section>
  );
}
