'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const API = '/api/proxy';

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetch(`${API}/api/vendors/${id}`).then(r => r.json()).then(setVendor).catch(() => {});
  }, [id]);

  async function approve() {
    const res = await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`Approval failed (${res.status}). Please try again.`); return; }
    window.location.reload();
  }

  if (!vendor) return <div style={{ color: 'var(--muted)', padding: '2rem' }}>Loading...</div>;

  return (
    <>
      <Link href="/admin/vendors" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← Back to Vendors</Link>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)', margin: '0.5rem 0 1.5rem' }}>{vendor.legal_name}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[['Email', vendor.email], ['Phone', vendor.phone || '—'], ['CAGE', vendor.cage_code || '—'], ['City/State', vendor.city ? `${vendor.city}, ${vendor.state}` : '—'], ['ZIP', vendor.zip_code || '—'], ['Sam Verified', vendor.sam_verified ? 'Yes' : 'No'], ['Insurance Verified', vendor.insurance_verified ? 'Yes' : 'No'], ['Insurance Expiry', vendor.insurance_expiry || '—']].map(([l, v]) => (
                <div key={l}><div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{l}</div><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{v}</div></div>
              ))}
            </div>
          </div>
          {vendor.notes && <div className="card"><h3 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Notes</h3><p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{vendor.notes}</p></div>}
        </div>
        <div>
          <div className="card card-navy" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Status</h3>
            <div style={{ marginBottom: '0.5rem' }}><span className={`badge ${vendor.onboarding_status === 'VERIFIED' ? 'badge-green' : vendor.onboarding_status === 'DOCS_SUBMITTED' ? 'badge-yellow' : 'badge-gray'}`}>{vendor.onboarding_status}</span></div>
            <div><span className={`badge ${vendor.portal_access ? 'badge-green' : 'badge-gray'}`}>Portal: {vendor.portal_access ? 'Active' : 'Inactive'}</span></div>
            {vendor.onboarding_status === 'DOCS_SUBMITTED' && !vendor.portal_access && (
              <button onClick={approve} className="btn btn-success" style={{ width: '100%', marginTop: '1rem' }}>Approve Portal Access</button>
            )}
          </div>
          <div className="card">
            <div className="stat-label">Contracts Completed</div>
            <div className="stat-value">{vendor.contracts_completed}</div>
            {vendor.performance_rating && <div style={{ marginTop: '0.25rem', color: 'var(--gold)', fontWeight: 700 }}>★ {vendor.performance_rating}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

type Vendor = { id: string; legal_name: string; cage_code: string; email: string; phone: string; city: string; state: string; zip_code: string; naics_codes: string[]; insurance_verified: boolean; insurance_expiry: string; sam_verified: boolean; pay_when_paid_accepted: boolean; onboarding_status: string; portal_access: boolean; contracts_completed: number; performance_rating: number; notes: string; };
