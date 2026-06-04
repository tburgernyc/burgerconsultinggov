'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { ADMIN_API as API } from '@/lib/api';

type Vendor = { id: string; legal_name: string; cage_code: string; email: string; phone: string; city: string; state: string; zip_code: string; naics_codes: string[]; insurance_verified: boolean; insurance_expiry: string; sam_verified: boolean; pay_when_paid_accepted: boolean; onboarding_status: string; portal_access: boolean; contracts_completed: number; performance_rating: number; notes: string; };
type VendorDoc = { id: string; doc_type: string; filename: string; created_at: string };

const NAICS_LABELS: Record<string, string> = { '541511': 'Software Dev', '541519': 'IT Services & PM', '541512': 'Systems Design' };
const DOC_LABELS: Record<string, string> = { INSURANCE: 'General Liability Insurance', W9: 'W-9', LICENSE: 'Business License', SAM: 'SAM.gov Verification' };

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [docs, setDocs] = useState<VendorDoc[]>([]);
  const [approving, setApproving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/vendors/${id}`).then(r => r.json()).then(setVendor).catch(() => {});
    fetch(`${API}/api/vendors/${id}/docs/list`).then(r => r.json()).then(d => setDocs(Array.isArray(d) ? d : [])).catch(() => {});
  }, [id]);

  async function approve() {
    setApproving(true);
    const res = await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`Approval failed (${res.status})`); setApproving(false); return; }
    window.location.reload();
  }

  async function setCompliance(field: string, value: boolean) {
    setVerifying(field);
    try {
      const res = await fetch(`${API}/api/vendors/${id}/compliance`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) { alert(`Update failed (${res.status})`); return; }
      setVendor(prev => prev ? { ...prev, [field]: value } : prev);
    } finally { setVerifying(null); }
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

          {/* Compliance Documents */}
          <div className="pv-card pv-fade pv-d1">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>
              Compliance Documents
            </div>

            {/* Verification toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { field: 'insurance_verified', label: 'Insurance', value: vendor.insurance_verified },
                { field: 'sam_verified', label: 'SAM Verified', value: vendor.sam_verified },
                { field: 'pay_when_paid_accepted', label: 'Pay-When-Paid', value: vendor.pay_when_paid_accepted },
              ].map(({ field, label, value }) => (
                <div key={field} style={{ background: value ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${value ? '#86EFAC' : 'var(--pv-border)'}`, borderRadius: 8, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: value ? '#166534' : 'var(--pv-muted)' }}>{label}</div>
                  <span className={`pv-badge ${value ? 'pv-badge-green' : 'pv-badge-gray'}`} style={{ alignSelf: 'flex-start' }}>{value ? '✓ Verified' : 'Unverified'}</span>
                  <button
                    onClick={() => setCompliance(field, !value)}
                    disabled={verifying === field}
                    className="pv-btn pv-btn-sm pv-btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                  >
                    {verifying === field ? '…' : value ? 'Revoke' : 'Mark Verified'}
                  </button>
                </div>
              ))}
            </div>

            {/* Uploaded files */}
            {docs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--pv-muted)', fontSize: '0.83rem' }}>
                No documents uploaded yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {docs.map((doc, i) => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < docs.length - 1 ? '1px solid var(--pv-border)' : 'none' }}>
                    <div>
                      <span className="pv-badge pv-badge-navy" style={{ fontSize: '0.6rem', marginRight: '0.5rem' }}>{DOC_LABELS[doc.doc_type] || doc.doc_type}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--pv-text-mid)', fontFamily: 'monospace' }}>{doc.filename}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--pv-muted)' }}>
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <a
                        href={`${API}/api/vendors/${id}/docs/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pv-btn pv-btn-outline pv-btn-sm"
                        style={{ fontSize: '0.72rem' }}
                      >
                        ↗ View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {vendor.insurance_expiry && (
              <div style={{ marginTop: '0.875rem', fontSize: '0.78rem', color: 'var(--pv-muted)', borderTop: '1px solid var(--pv-border)', paddingTop: '0.75rem' }}>
                Insurance expiry on file: <strong style={{ color: new Date(vendor.insurance_expiry) < new Date() ? 'var(--pv-danger)' : 'var(--pv-text)' }}>
                  {new Date(vendor.insurance_expiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </strong>
              </div>
            )}
          </div>

          {/* Notes */}
          {vendor.notes && (
            <div className="pv-card pv-fade pv-d2">
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
