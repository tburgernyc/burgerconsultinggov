'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Vendor = { id: string; legal_name: string; cage_code: string; email: string; phone: string; onboarding_status: string; portal_access: boolean; response_status: string; contracts_completed: number; created_at: string; };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/vendors`).then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    window.location.reload();
  }

  const statusColor = (s: string) => {
    if (s === 'VERIFIED' || s === 'ACTIVE') return 'badge-green';
    if (s === 'DOCS_SUBMITTED') return 'badge-yellow';
    return 'badge-gray';
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Vendor Registry</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{vendors.length} registered vendors</p>
        </div>
      </div>
      {loading ? <div style={{ color: 'var(--muted)' }}>Loading...</div> : (
        vendors.length === 0 ? <div className="empty-state">No vendors registered yet.</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Business Name</th><th>Email</th><th>CAGE</th><th>Status</th><th>Portal</th><th>Contracts</th><th>Action</th></tr></thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.legal_name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{v.email}</td>
                    <td>{v.cage_code || '—'}</td>
                    <td><span className={`badge ${statusColor(v.onboarding_status)}`}>{v.onboarding_status}</span></td>
                    <td><span className={`badge ${v.portal_access ? 'badge-green' : 'badge-gray'}`}>{v.portal_access ? 'Active' : 'Pending'}</span></td>
                    <td>{v.contracts_completed}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <a href={`/admin/vendors/${v.id}`} className="btn btn-navy btn-sm">View</a>
                        {v.onboarding_status === 'DOCS_SUBMITTED' && <button onClick={() => approve(v.id)} className="btn btn-success btn-sm">Approve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
