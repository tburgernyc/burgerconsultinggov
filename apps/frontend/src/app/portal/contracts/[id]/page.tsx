'use client';

import { use, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/contracts/active`)
      .then(r => r.json())
      .then(data => setContracts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const contract = contracts.find(c => c.id === id);

  if (loading) return <div className="section"><div className="container">Loading contract...</div></div>;
  if (!contract) return (
    <div className="section"><div className="container">
      <h2 style={{ color: 'var(--navy)' }}>Contract Not Found</h2>
      <a href="/portal/dashboard" className="btn btn-navy" style={{ marginTop: '1rem' }}>Back to Dashboard</a>
    </div></div>
  );

  const invoiced = Number(contract.total_invoiced || 0);
  const received = Number(contract.total_received || 0);
  const value = Number(contract.contract_value || 0);
  const pct = value > 0 ? Math.min(100, Math.round((invoiced / value) * 100)) : 0;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <a href="/portal/dashboard" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← Back to Dashboard</a>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', margin: '0.5rem 0' }}>Contract Detail</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div>
            <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  ['Contract #', contract.contract_number],
                  ['Agency', contract.agency],
                  ['Contract Value', `$${value.toLocaleString()}`],
                  ['Prime Margin', contract.prime_margin_pct ? `${contract.prime_margin_pct}%` : '—'],
                  ['Performance Start', contract.performance_start || '—'],
                  ['Performance End', contract.performance_end || '—'],
                  ['Billing Cycle', 'Monthly'],
                  ['Status', contract.contract_status],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Invoice Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--muted)' }}>Total Invoiced</span>
                <strong>${invoiced.toLocaleString()} / ${value.toLocaleString()}</strong>
              </div>
              <div className="progress-track" style={{ marginBottom: '1rem' }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="stat-card">
                  <div className="stat-label">Invoiced</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>${invoiced.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Received by Prime</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>${received.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Submit Invoice</h3>
              <a href="/portal/invoices" className="btn btn-primary btn-sm">Go to Invoice Tracker</a>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Document Checklist</h3>
              {docChecklist.map(doc => (
                <div key={doc.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  <span style={{ color: doc.status === 'ok' ? 'var(--success)' : 'var(--danger)', fontWeight: 800 }}>{doc.status === 'ok' ? '✓' : '✗'}</span>
                  <span style={{ color: 'var(--text)' }}>{doc.label}</span>
                </div>
              ))}
              <a href="/portal/documents" className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem', width: '100%' }}>Manage Documents</a>
            </div>

            <div className="card card-navy">
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Payment Terms</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                Payment released within <strong>Net-30</strong> days of agency payment receipt by Burger Consulting LLC.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const docChecklist = [
  { label: 'General Liability Insurance', status: 'ok' },
  { label: 'W-9', status: 'ok' },
  { label: 'Teaming Agreement', status: 'pending' },
  { label: 'Certified Payroll (if SCA)', status: 'ok' },
];

type Contract = { id: string; contract_number: string; agency: string; contract_value: number; prime_margin_pct: number; performance_start: string; performance_end: string; total_invoiced: number; total_received: number; next_invoice_date: string; contract_status: string; };
