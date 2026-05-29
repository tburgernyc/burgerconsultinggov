'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

export default function ApprovalsPage() {
  const [queue, setQueue] = useState<{ vendor_applications: VendorApp[]; rfq_dispatch_queue: Rfq[]; } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/approval-queue`).then(r => r.json()).then(setQueue).finally(() => setLoading(false));
  }, []);

  async function approveVendor(id: string) {
    const res = await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`Vendor approval failed (${res.status}). Please try again.`); return; }
    window.location.reload();
  }

  async function approveRfq(id: string) {
    const res = await fetch(`${API}/api/sourcing/approve/${id}`, { method: 'POST' });
    if (!res.ok) { alert(`RFQ dispatch failed (${res.status}). Please try again.`); return; }
    window.location.reload();
  }

  const vendors = queue?.vendor_applications || [];
  const rfqs = queue?.rfq_dispatch_queue || [];
  const total = vendors.length + rfqs.length;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Approval Queue</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{total} items awaiting your approval</p>
      </div>

      {loading ? <div style={{ color: 'var(--muted)' }}>Loading...</div> : total === 0 ? (
        <div className="empty-state"><div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>All clear — no pending approvals.</div>
      ) : (
        <>
          {vendors.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>Vendor Applications ({vendors.length})</h2>
              {vendors.map(v => (
                <div key={v.id} className="card card-navy" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{v.legal_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{v.email} · {v.onboarding_status}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Submitted: {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/admin/vendors/${v.id}`} className="btn btn-outline btn-sm">Review</a>
                    <button onClick={() => approveVendor(v.id)} className="btn btn-success btn-sm">Approve</button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {rfqs.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>RFQ Dispatch Queue ({rfqs.length})</h2>
              {rfqs.map(rfq => (
                <div key={rfq.solicitation_id} className="card card-gold" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{rfq.solicitation_id}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{rfq.agency} · Score: {rfq.triage_score}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`/admin/solicitations/${rfq.solicitation_id}`} className="btn btn-outline btn-sm">View</a>
                    <button onClick={() => approveRfq(rfq.solicitation_id)} className="btn btn-primary btn-sm">Approve Dispatch</button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}

type VendorApp = { id: string; legal_name: string; email: string; onboarding_status: string; created_at: string; };
type Rfq = { solicitation_id: string; agency: string; triage_score: number; phase_status: string; };
