'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PortalShell } from '@/components/PortalShell';

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; id?: string; role?: string } | undefined;

  return (
    <PortalShell title="Company Profile" subtitle="Your account and partnership information">
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Profile Card */}
        <div className="pv-card pv-card-gold-border pv-fade">
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--pv-gold) 0%, var(--pv-gold-light) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--pv-navy)', fontSize: '1.375rem', fontWeight: 800, fontFamily: "'DM Sans', sans-serif",
            }}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SC'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: 'var(--pv-text)', marginBottom: '0.25rem' }}>
                {user?.name || 'Your Company'}
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.625rem' }}>
                {user?.email || '—'}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="pv-badge pv-badge-green">Active Partner</span>
                <span className="pv-badge pv-badge-navy">Subcontractor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pv-card pv-fade pv-d1">
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>
            Account Information
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { label: 'Company Name', val: user?.name || '—' },
              { label: 'Email / Login', val: user?.email || '—' },
              { label: 'Account ID', val: user?.id ? user.id.slice(0, 8) + '…' : '—' },
              { label: 'Account Type', val: 'Subcontractor Partner' },
              { label: 'Portal Access', val: 'Active' },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--pv-border)' : 'none' }}>
                <span style={{ fontSize: '0.83rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif" }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Notice */}
        <div className="pv-alert pv-alert-info pv-fade pv-d2">
          <strong>Need to update your information?</strong> Contact <a href="mailto:procurement@burgergov.com" style={{ color: '#7C5100', fontWeight: 700 }}>procurement@burgergov.com</a> with your requested changes. Profile updates are processed within 24 hours.
        </div>

        {/* Compliance & Docs */}
        <div className="pv-card pv-fade pv-d3">
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.5rem' }}>
            Compliance Documents
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--pv-muted)', lineHeight: 1.6, marginBottom: '1rem', fontFamily: "'DM Sans', sans-serif" }}>
            Keep your insurance certificate and compliance documents current to maintain uninterrupted RFQ access.
          </p>
          <Link href="/portal/documents" className="pv-btn pv-btn-navy pv-btn-sm">Go to Document Vault →</Link>
        </div>
      </div>
    </PortalShell>
  );
}
