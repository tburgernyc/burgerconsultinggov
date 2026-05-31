'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalShell } from '@/components/PortalShell';

const API = '/api/vendor';

type Contract = {
  id: string; contract_number: string; agency: string;
  contract_value: number; prime_margin_pct: number;
  performance_start: string; performance_end: string;
  total_invoiced: number; total_received: number;
  next_invoice_date: string; contract_status: string;
  agency_cor_name: string; agency_cor_email: string;
};

const DOC_CHECKLIST = [
  { label: 'General Liability Insurance', status: 'ok' },
  { label: 'W-9 on File', status: 'ok' },
  { label: 'Teaming Agreement', status: 'pending' },
  { label: 'Certified Payroll (if SCA applies)', status: 'ok' },
];

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/contracts/active`)
      .then(r => r.json())
      .then(d => setContracts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const contract = contracts.find(c => c.id === id);

  if (loading) {
    return (
      <PortalShell title="Contract Detail" breadcrumb="Dashboard / My Contracts / Detail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 100, background: '#E4EAF6', borderRadius: 12 }} />)}
        </div>
      </PortalShell>
    );
  }

  if (!contract) {
    return (
      <PortalShell title="Contract Not Found" breadcrumb="Dashboard / My Contracts">
        <div style={{ maxWidth: 480 }}>
          <div className="pv-card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)', marginBottom: '0.75rem' }}>Contract Not Found</div>
            <p style={{ color: 'var(--pv-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              This contract may have been archived or the link may be incorrect.
            </p>
            <Link href="/portal/dashboard" className="pv-btn pv-btn-navy pv-btn-sm">← Back to Dashboard</Link>
          </div>
        </div>
      </PortalShell>
    );
  }

  const invoiced = Number(contract.total_invoiced || 0);
  const received = Number(contract.total_received || 0);
  const value = Number(contract.contract_value || 0);
  const pending = invoiced - received;
  const invoicedPct = value > 0 ? Math.min(100, Math.round((invoiced / value) * 100)) : 0;
  const receivedPct = value > 0 ? Math.min(100, Math.round((received / value) * 100)) : 0;

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <PortalShell
      title={contract.contract_number}
      subtitle={`${contract.agency} · ${contract.contract_status}`}
      breadcrumb="Dashboard / My Contracts / Detail"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start', maxWidth: 960 }}>

        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Contract Details */}
          <div className="pv-card pv-card-gold-border pv-fade">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--pv-text)', marginBottom: '1.25rem' }}>Contract Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.125rem' }}>
              {[
                { label: 'Contract Value', val: fmt(value), highlight: true },
                { label: 'Prime Margin', val: contract.prime_margin_pct ? `${contract.prime_margin_pct}%` : '—' },
                { label: 'Your Subcontract', val: fmt(value * (1 - (contract.prime_margin_pct || 0) / 100)), highlight: true },
                { label: 'Billing Cycle', val: 'Monthly' },
                { label: 'Performance Start', val: contract.performance_start || '—' },
                { label: 'Performance End', val: contract.performance_end || '—' },
                { label: 'Next Invoice Due', val: contract.next_invoice_date || '—' },
                { label: 'Contract Status', val: contract.contract_status },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.2rem' }}>{item.label}</div>
                  <div style={{ fontWeight: item.highlight ? 800 : 600, color: item.highlight ? 'var(--pv-navy)' : 'var(--pv-text)', fontSize: item.highlight ? '1.05rem' : '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Progress */}
          <div className="pv-card pv-fade pv-d1">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--pv-text)', marginBottom: '1.25rem' }}>Billing Progress</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Contract Value', val: fmt(value), icon: '📋', color: '#EFF6FF', border: '#93C5FD', textColor: '#1E40AF' },
                { label: 'Total Invoiced', val: fmt(invoiced), icon: '📤', color: 'var(--pv-gold-pale)', border: '#EDD88A', textColor: '#7C5100' },
                { label: 'Funds Received', val: fmt(received), icon: '✓', color: 'var(--pv-success-bg)', border: '#6EE7B7', textColor: 'var(--pv-success)' },
              ].map(card => (
                <div key={card.label} style={{ background: card.color, border: `1px solid ${card.border}`, borderRadius: 10, padding: '0.875rem' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: card.textColor, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>{card.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: card.textColor, fontFamily: "'DM Sans', sans-serif", marginTop: '0.25rem' }}>{card.val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--pv-muted)', marginBottom: '0.375rem', fontFamily: "'DM Sans', sans-serif" }}>
                <span>Invoiced ({invoicedPct}%)</span>
                <span>{fmt(invoiced)} of {fmt(value)}</span>
              </div>
              <div style={{ height: 8, background: '#F0F4FB', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${invoicedPct}%`, background: 'linear-gradient(90deg, var(--pv-gold), var(--pv-gold-light))', borderRadius: 999 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--pv-muted)', marginBottom: '0.375rem', fontFamily: "'DM Sans', sans-serif" }}>
                <span>Received ({receivedPct}%)</span>
                <span>{fmt(received)} of {fmt(value)}</span>
              </div>
              <div style={{ height: 8, background: '#F0F4FB', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${receivedPct}%`, background: 'linear-gradient(90deg, var(--pv-success), #34D399)', borderRadius: 999 }} />
              </div>
            </div>

            {pending > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--pv-gold-pale)', border: '1px solid #EDD88A', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#7C5100', fontFamily: "'DM Sans', sans-serif" }}>Pending payment (invoiced – received)</span>
                <span style={{ fontWeight: 800, color: '#7C5100', fontFamily: "'DM Sans', sans-serif" }}>{fmt(pending)}</span>
              </div>
            )}
          </div>

          {/* Submit Invoice CTA */}
          <div className="pv-card pv-fade pv-d2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '0.2rem' }}>Ready to invoice for this contract?</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                  {contract.next_invoice_date ? `Next invoice due: ${contract.next_invoice_date}` : 'Submit invoices monthly for services rendered.'}
                </div>
              </div>
              <Link href="/portal/invoices" className="pv-btn pv-btn-primary">Submit Invoice →</Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Document Checklist */}
          <div className="pv-card pv-fade">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>Document Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DOC_CHECKLIST.map(doc => (
                <div key={doc.label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: '1px solid var(--pv-border)', fontSize: '0.8rem' }}>
                  <span style={{ color: doc.status === 'ok' ? 'var(--pv-success)' : 'var(--pv-warning)', fontWeight: 800, fontSize: '0.9rem', width: 16, flexShrink: 0 }}>
                    {doc.status === 'ok' ? '✓' : '○'}
                  </span>
                  <span style={{ color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif" }}>{doc.label}</span>
                </div>
              ))}
            </div>
            <Link href="/portal/documents" className="pv-btn pv-btn-outline pv-btn-sm pv-btn-full" style={{ marginTop: '0.875rem', justifyContent: 'center' }}>
              Manage Documents
            </Link>
          </div>

          {/* Payment Terms */}
          <div className="pv-card pv-card-success-border pv-fade pv-d1">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '0.95rem', color: 'var(--pv-text)', marginBottom: '0.625rem' }}>Payment Terms</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--pv-text-mid)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: '0.75rem' }}>
              Payment issued within <strong>Net-30 days</strong> of Burger Consulting confirming agency receipt. Contact us immediately if your payment details have changed.
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
              Questions? <a href="mailto:procurement@burgergov.com" style={{ color: 'var(--pv-navy)', fontWeight: 600 }}>procurement@burgergov.com</a>
            </div>
          </div>

          {/* Agency COR */}
          {(contract.agency_cor_name || contract.agency_cor_email) && (
            <div className="pv-card pv-fade pv-d2">
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.625rem' }}>Contracting Officer Representative</div>
              {contract.agency_cor_name && <div style={{ fontWeight: 600, color: 'var(--pv-text)', fontSize: '0.86rem', fontFamily: "'DM Sans', sans-serif" }}>{contract.agency_cor_name}</div>}
              {contract.agency_cor_email && <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif", marginTop: '0.15rem' }}>{contract.agency_cor_email}</div>}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
