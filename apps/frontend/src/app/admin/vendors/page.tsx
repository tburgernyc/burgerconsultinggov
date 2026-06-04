'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { ADMIN_API as API } from '@/lib/api';

type Vendor = { id: string; legal_name: string; cage_code: string; email: string; phone: string; onboarding_status: string; portal_access: boolean; response_status: string; contracts_completed: number; created_at: string; };

function statusBadge(s: string) {
  if (s === 'VERIFIED' || s === 'ACTIVE') return 'pv-badge-green';
  if (s === 'DOCS_SUBMITTED') return 'pv-badge-gold';
  return 'pv-badge-gray';
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API}/api/vendors`).then(r => r.json()).then(d => setVendors(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function approve(id: string) {
    await fetch(`${API}/api/admin/vendor/approve/${id}`, { method: 'POST' });
    window.location.reload();
  }

  const filtered = vendors.filter(v =>
    !search || v.legal_name?.toLowerCase().includes(search.toLowerCase()) || v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pending = vendors.filter(v => v.onboarding_status === 'DOCS_SUBMITTED').length;
  const active = vendors.filter(v => v.portal_access).length;

  return (
    <AdminShell
      title="Vendor Registry"
      subtitle={`${vendors.length} registered subcontractors`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Summary Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Vendors', val: vendors.length, badge: 'pv-badge-gray' },
            { label: 'Portal Active', val: active, badge: 'pv-badge-green' },
            { label: 'Pending Approval', val: pending, badge: pending > 0 ? 'pv-badge-gold' : 'pv-badge-gray' },
          ].map((t, i) => (
            <div key={t.label} className={`pv-stat pv-fade pv-d${i+1}`}>
              <div className="pv-stat-label">{t.label}</div>
              <div className="pv-stat-value">{t.val}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div>
          <input
            type="search"
            className="pv-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
        ) : filtered.length === 0 ? (
          <div className="pv-card">
            <div className="pv-empty">
              <div className="pv-empty-icon">🤝</div>
              <div className="pv-empty-title">{search ? 'No vendors match your search' : 'No vendors registered yet'}</div>
            </div>
          </div>
        ) : (
          <div className="pv-card pv-fade" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr><th>Business Name</th><th>Email</th><th>CAGE</th><th>Status</th><th>Portal</th><th>Contracts</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>{v.legal_name}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--pv-text-mid)' }}>{v.email}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--pv-muted)' }}>{v.cage_code || '—'}</td>
                      <td><span className={`pv-badge ${statusBadge(v.onboarding_status)}`} style={{ fontSize: '0.63rem' }}>{v.onboarding_status}</span></td>
                      <td><span className={`pv-badge ${v.portal_access ? 'pv-badge-green' : 'pv-badge-gray'}`}>{v.portal_access ? 'Active' : 'Pending'}</span></td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{v.contracts_completed}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <Link href={`/admin/vendors/${v.id}`} className="pv-btn pv-btn-navy pv-btn-sm">View</Link>
                          {v.onboarding_status === 'DOCS_SUBMITTED' && (
                            <button onClick={() => approve(v.id)} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)' }}>
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
