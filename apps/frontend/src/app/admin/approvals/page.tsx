'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type VendorApp = { id: string; legal_name: string; email: string; onboarding_status: string; created_at: string; };
type Rfq = { solicitation_id: string; agency: string; triage_score: number; phase_status: string; };

export default function ApprovalsPage() {
  const [queue, setQueue] = useState<{ vendor_applications: VendorApp[]; rfq_dispatch_queue: Rfq[]; } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/approval-queue`).then(r => r.json()).then(setQueue).finally(() => setLoading(false));
  }, []);

  async function approveVendor(id: string) {
    const res = await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`Vendor approval failed (${res.status})`); return; }
    window.location.reload();
  }

  async function approveRfq(id: string) {
    const res = await fetch(`${API}/api/sourcing/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`RFQ dispatch failed (${res.status})`); return; }
    window.location.reload();
  }

  const vendors = queue?.vendor_applications || [];
  const rfqs = queue?.rfq_dispatch_queue || [];
  const total = vendors.length + rfqs.length;

  return (
    <AdminShell
      title="Approval Queue"
      subtitle={total > 0 ? `${total} item${total > 1 ? 's' : ''} awaiting your action` : 'All clear'}
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 90, background: '#E4EAF6', borderRadius: 12 }} />)}
        </div>
      ) : total === 0 ? (
        <div className="pv-card pv-fade">
          <div className="pv-empty">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <div className="pv-empty-title">All clear — no pending approvals</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--pv-muted)' }}>New vendor applications and scored RFQs will appear here automatically.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: vendors.length && rfqs.length ? '1fr 1fr' : '1fr', gap: '2rem' }}>

          {/* Vendor Applications */}
          {vendors.length > 0 && (
            <div>
              <div className="pv-section-label">Vendor Applications ({vendors.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {vendors.map((v, i) => (
                  <div key={v.id} className={`pv-card pv-card-gold-border pv-fade pv-d${i+1}`} style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.2rem' }}>{v.legal_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{v.email}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)', marginTop: '0.15rem', fontFamily: "'DM Sans', sans-serif" }}>
                          Submitted: {v.created_at ? new Date(v.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                        </div>
                      </div>
                      <span className="pv-badge pv-badge-gold" style={{ fontSize: '0.62rem', flexShrink: 0 }}>{v.onboarding_status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/vendors/${v.id}`} className="pv-btn pv-btn-outline pv-btn-sm">Review →</Link>
                      <button onClick={() => approveVendor(v.id)} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)', flex: 1, justifyContent: 'center' }}>
                        Approve Portal Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RFQ Dispatch Queue */}
          {rfqs.length > 0 && (
            <div>
              <div className="pv-section-label">RFQ Dispatch Queue ({rfqs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {rfqs.map((rfq, i) => (
                  <div key={rfq.solicitation_id} className={`pv-card pv-card-navy-border pv-fade pv-d${i+1}`} style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.2rem' }}>{rfq.solicitation_id}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{rfq.agency || 'Federal Agency'}</div>
                      </div>
                      <span className="pv-badge pv-badge-blue" style={{ flexShrink: 0 }}>Score: {rfq.triage_score}/10</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/solicitations/${rfq.solicitation_id}`} className="pv-btn pv-btn-outline pv-btn-sm">View</Link>
                      <button onClick={() => approveRfq(rfq.solicitation_id)} className="pv-btn pv-btn-primary pv-btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        Approve Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
