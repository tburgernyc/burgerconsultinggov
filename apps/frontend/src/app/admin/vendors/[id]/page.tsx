'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Vendor = { id: string; legal_name: string; cage_code: string; email: string; phone: string; city: string; state: string; zip_code: string; naics_codes: string[]; insurance_verified: boolean; insurance_expiry: string; sam_verified: boolean; pay_when_paid_accepted: boolean; onboarding_status: string; portal_access: boolean; contracts_completed: number; performance_rating: number; notes: string; };

const NAICS_LABELS: Record<string, string> = { '561210': 'Facilities Support', '561720': 'Janitorial', '561730': 'Landscaping' };

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/vendors/${id}`).then(r => r.json()).then(setVendor).catch(() => {});
  }, [id]);

  async function approve() {
    setApproving(true);
    const res = await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`Approval failed (${res.status})`); setApproving(false); return; }
    window.location.reload();
  }

  if (!vendor) return (
    <AdminShell title="Vendor Detail">
      <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
    </AdminShell>
  );

  const statusOk = vendor.onboarding_status === 'VERIFIED' || vendor.onboarding_status === 'ACTIVE';
  const canApprove = vendor.onboarding_status === 'DOCS_SUBMITTED' && !vendor.portal_access;

  return (
    <AdminShell
      title={vendor.legal_name}
      subtitle={`${vendor.city ? `${vendor.city}, ${vendor.state} · ` : ''}${vendor.email}`}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/admin/vendors" className="pv-btn pv-btn-outline pv-btn-sm">← Vendors</Link>
          {canApprove && (
            <button onClick={approve} disabled={approving} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)' }}>
              {approving ? 'Approving…' : 'Approve Portal Access'}
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Business Info */}
          <div className="pv-card pv-card-gold-border pv-fade">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1.125rem' }}>Business Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                ['Email', vendor.email],
                ['Phone', vendor.phone || '—'],
                ['CAGE Code', vendor.cage_code || '—'],
                ['Location', vendor.city ? `${vendor.city}, ${vendor.state} ${vendor.zip_code}` : '—'],
                ['SAM Verified', vendor.sam_verified ? 'Yes ✓' : 'No'],
                ['Insurance Verified', vendor.insurance_verified ? 'Yes ✓' : 'No'],
                ['Insurance Expiry', vendor.insurance_expiry || '—'],
                ['Pay-When-Paid', vendor.pay_when_paid_accepted ? 'Accepted ✓' : 'Not accepted'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>{l}</div>
                  <div style={{ fontWeight: 600, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>{v}</div>
                </div>
              ))}
            </div>

            {vendor.naics_codes?.length > 0 && (
              <div style={{ marginTop: '1.125rem', paddingTop: '1rem', borderTop: '1px solid var(--pv-border)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.5rem' }}>NAICS Codes</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {vendor.naics_codes.map(code => (
                    <span key={code} className="pv-badge pv-badge-navy">{code} — {NAICS_LABELS[code] || code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div className="pv-card pv-fade pv-d1">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.75rem' }}>Notes</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--pv-text-mid)', lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>{vendor.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Status */}
          <div className={`pv-card pv-fade ${statusOk ? 'pv-card-success-border' : 'pv-card-gold-border'}`}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', color: 'var(--pv-text)', marginBottom: '0.875rem' }}>Account Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>Onboarding</span>
                <span className={`pv-badge ${statusOk ? 'pv-badge-green' : vendor.onboarding_status === 'DOCS_SUBMITTED' ? 'pv-badge-gold' : 'pv-badge-gray'}`}>{vendor.onboarding_status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>Portal Access</span>
                <span className={`pv-badge ${vendor.portal_access ? 'pv-badge-green' : 'pv-badge-gray'}`}>{vendor.portal_access ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            {canApprove && (
              <button onClick={approve} disabled={approving} className="pv-btn pv-btn-sm pv-btn-full" style={{ marginTop: '0.875rem', background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)', justifyContent: 'center' }}>
                {approving ? 'Approving…' : 'Approve Portal Access'}
              </button>
            )}
          </div>

          {/* Performance */}
          <div className="pv-card pv-fade pv-d1">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', color: 'var(--pv-text)', marginBottom: '0.875rem' }}>Performance</div>
            <div>
              <div className="pv-stat-label">Contracts Completed</div>
              <div className="pv-stat-value" style={{ fontSize: '1.5rem' }}>{vendor.contracts_completed}</div>
            </div>
            {vendor.performance_rating && (
              <div style={{ marginTop: '0.625rem' }}>
                <div className="pv-stat-label">Rating</div>
                <div style={{ color: 'var(--pv-gold)', fontWeight: 800, fontSize: '1.1rem', fontFamily: "'DM Sans', sans-serif" }}>
                  {'★'.repeat(Math.round(vendor.performance_rating))} {vendor.performance_rating.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
