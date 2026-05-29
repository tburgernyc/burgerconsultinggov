'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VendorDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/contracts/active`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/sourcing/rfq-queue`).then(r => r.json()).catch(() => []),
    ]).then(([c, r]) => {
      setContracts(Array.isArray(c) ? c : []);
      setRfqs(Array.isArray(r) ? r : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="portal-layout">
      <Sidebar />
      <main className="portal-main">
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>Vendor Dashboard</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Welcome back. Here is your current status.</p>

        {rfqs.length > 0 && (
          <div className="alert-zone info" style={{ marginBottom: '1.5rem' }}>
            <strong>Action Required:</strong> {rfqs.length} open RFQ{rfqs.length > 1 ? 's' : ''} awaiting your quote submission.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Active Contracts" value={contracts.length} sub="Currently executing" />
          <StatCard label="Open RFQs" value={rfqs.length} sub="Awaiting quote" />
          <StatCard label="Payment Status" value="Net-30" sub="Pay-when-paid" />
        </div>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--gold)' }}>■</span> Open RFQs — Quote Required
          </h2>
          {rfqs.length === 0 ? (
            <div className="empty-state">No open RFQs at this time.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Solicitation #</th><th>Agency</th><th>NAICS</th><th>Est. Value</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {rfqs.map(rfq => (
                    <tr key={rfq.solicitation_id}>
                      <td style={{ fontWeight: 600 }}>{rfq.solicitation_id}</td>
                      <td>{rfq.agency || '—'}</td>
                      <td><span className="badge badge-gold">{rfq.naics || '—'}</span></td>
                      <td>{rfq.estimated_value ? `$${Number(rfq.estimated_value).toLocaleString()}` : '—'}</td>
                      <td><span className="badge badge-blue">{rfq.phase_status}</span></td>
                      <td><a href={`/portal/rfq/${rfq.solicitation_id}`} className="btn btn-primary btn-sm">Submit Quote</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--navy)' }}>■</span> Active Contracts
          </h2>
          {contracts.length === 0 ? (
            <div className="empty-state">No active contracts yet. Submit quotes to get started.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Contract #</th><th>Agency</th><th>Value</th><th>Next Invoice</th><th>Invoiced</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                      <td>{c.agency}</td>
                      <td>${Number(c.contract_value || 0).toLocaleString()}</td>
                      <td>{c.next_invoice_date || '—'}</td>
                      <td>${Number(c.total_invoiced || 0).toLocaleString()}</td>
                      <td><span className="badge badge-green">{c.contract_status}</span></td>
                      <td><a href={`/portal/contracts/${c.id}`} className="btn btn-navy btn-sm">View</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function Sidebar() {
  const links = [
    { href: '/portal/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/portal/rfq', label: 'RFQs', icon: '📋' },
    { href: '/portal/contracts', label: 'Contracts', icon: '📄' },
    { href: '/portal/invoices', label: 'Invoices', icon: '💰' },
    { href: '/portal/documents', label: 'Documents', icon: '📁' },
    { href: '/portal/profile', label: 'Profile', icon: '👤' },
  ];
  return (
    <aside className="portal-sidebar">
      <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
        <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.9rem' }}>VENDOR PORTAL</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Burger Consulting LLC</div>
      </div>
      {links.map(l => (
        <a key={l.href} href={l.href} className="portal-sidebar nav-item"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
          <span>{l.icon}</span> {l.label}
        </a>
      ))}
    </aside>
  );
}

function DashboardSkeleton() {
  return (
    <div className="portal-layout">
      <Sidebar />
      <main className="portal-main">
        <div style={{ height: 32, background: '#e2e8f0', borderRadius: 4, width: 200, marginBottom: 8 }} />
        <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: 300, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: '#e2e8f0', borderRadius: 8 }} />)}
        </div>
      </main>
    </div>
  );
}

type Contract = { id: string; contract_number: string; agency: string; contract_value: number; total_invoiced: number; next_invoice_date: string; contract_status: string; };
type Rfq = { solicitation_id: string; agency: string; naics: string; estimated_value: number; phase_status: string; };
