'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PortalShell } from '@/components/PortalShell';
import { VENDOR_API as API } from '@/lib/api';

type Contract = {
  id: string; contract_number: string; agency: string;
  contract_value: number; total_invoiced: number; total_received: number;
  next_invoice_date: string; contract_status: string; performance_end: string;
};
type Rfq = {
  solicitation_id: string; agency: string; naics: string;
  estimated_value: number; phase_status: string; response_deadline: string;
};

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function fmt(n: number) { return '$' + n.toLocaleString(); }

export default function VendorDashboard() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string } | undefined;
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

  const totalInvoiced = contracts.reduce((s, c) => s + Number(c.total_invoiced || 0), 0);
  const totalReceived = contracts.reduce((s, c) => s + Number(c.total_received || 0), 0);
  const pendingPayment = totalInvoiced - totalReceived;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) return <DashboardSkeleton />;

  return (
    <PortalShell title="Dashboard" subtitle={`${greeting}, ${user?.name || 'Partner'} — ${today}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

        {/* Action Banner */}
        {rfqs.length > 0 && (
          <div className="pv-action-banner pv-fade">
            <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '0.5rem 0.75rem', flexShrink: 0 }}>
              <span style={{ fontSize: '1.25rem' }}>📋</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', fontFamily: "'DM Sans', sans-serif" }}>
                Action Required — {rfqs.length} Open RFQ{rfqs.length > 1 ? 's' : ''} Awaiting Your Quote
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>
                Submit competitive quotes to secure contracts. Deadlines are firm — act now.
              </div>
            </div>
            <Link href="/portal/rfq" className="pv-btn pv-btn-primary pv-btn-sm" style={{ flexShrink: 0 }}>
              View RFQs →
            </Link>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Active Contracts', value: contracts.length, sub: 'Currently executing', icon: '📄', color: '#EFF6FF', iconColor: '#1E40AF', border: '#93C5FD' },
            { label: 'Open RFQs', value: rfqs.length, sub: rfqs.length > 0 ? 'Quote required' : 'None pending', icon: '📋', color: rfqs.length > 0 ? 'var(--pv-warning-bg)' : '#F0FDF4', iconColor: rfqs.length > 0 ? 'var(--pv-warning)' : 'var(--pv-success)', border: rfqs.length > 0 ? '#FDE68A' : '#6EE7B7' },
            { label: 'Total Earned', value: fmt(totalInvoiced), sub: 'Invoiced to date', icon: '💰', color: 'var(--pv-success-bg)', iconColor: 'var(--pv-success)', border: '#6EE7B7' },
            { label: 'Pending Payment', value: fmt(pendingPayment), sub: 'Net-30 from agency receipt', icon: '⏳', color: pendingPayment > 0 ? 'var(--pv-gold-pale)' : '#F9FAFB', iconColor: pendingPayment > 0 ? 'var(--pv-warning)' : 'var(--pv-muted)', border: pendingPayment > 0 ? '#EDD88A' : '#E2E8F0' },
          ].map((card, i) => (
            <div key={card.label} className={`pv-stat pv-fade pv-d${i + 1}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div className="pv-stat-label">{card.label}</div>
                <div style={{ background: card.color, border: `1px solid ${card.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                  {card.icon}
                </div>
              </div>
              <div className="pv-stat-value">{card.value}</div>
              <div className="pv-stat-sub">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Open RFQs */}
        {rfqs.length > 0 && (
          <div className="pv-fade pv-d2">
            <div className="pv-section-label">Open RFQs — Quote Required</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {rfqs.map((rfq, i) => {
                const days = daysUntil(rfq.response_deadline);
                const urgent = days !== null && days <= 5;
                return (
                  <div key={rfq.solicitation_id} className={`pv-rfq-card pv-fade pv-d${i + 1}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span className={`pv-badge ${urgent ? 'pv-badge-urgent' : 'pv-badge-gold'}`}>
                            {urgent ? '⚡ Urgent' : 'Quote Required'}
                          </span>
                          {rfq.naics && <span className="pv-badge pv-badge-navy">{rfq.naics}</span>}
                          {days !== null && (
                            <span style={{ fontSize: '0.75rem', color: urgent ? 'var(--pv-danger)' : 'var(--pv-muted)', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                              {days > 0 ? `${days} day${days !== 1 ? 's' : ''} remaining` : 'Deadline passed'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: 'var(--pv-text)', marginBottom: '0.25rem' }}>
                          {rfq.solicitation_id}
                        </div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--pv-text-mid)', fontFamily: "'DM Sans', sans-serif" }}>
                          {rfq.agency || 'Federal Agency'}
                          {rfq.estimated_value ? ` · Est. ${fmt(rfq.estimated_value)}` : ''}
                          {rfq.response_deadline ? ` · Due ${new Date(rfq.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <Link href={`/portal/rfq/${rfq.solicitation_id}`} className="pv-btn pv-btn-primary pv-btn-sm">
                          Submit Quote →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Contracts */}
        <div className="pv-fade pv-d3">
          <div className="pv-section-label">Active Contracts</div>
          {contracts.length === 0 ? (
            <div className="pv-card">
              <div className="pv-empty">
                <div className="pv-empty-icon">📄</div>
                <div className="pv-empty-title">No active contracts yet</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--pv-muted)', maxWidth: 260, margin: '0 auto 1rem' }}>
                  Submit quotes on open RFQs to get started. Contract awards typically process within 30 days of quote selection.
                </p>
                {rfqs.length > 0 && (
                  <Link href="/portal/rfq" className="pv-btn pv-btn-primary pv-btn-sm">Browse Open RFQs</Link>
                )}
              </div>
            </div>
          ) : (
            <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="pv-table-wrap">
                <table className="pv-table">
                  <thead>
                    <tr>
                      <th>Contract #</th>
                      <th>Agency</th>
                      <th>Value</th>
                      <th>Invoiced</th>
                      <th>Next Invoice</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => {
                      const pct = c.contract_value > 0 ? Math.min(100, Math.round((c.total_invoiced / c.contract_value) * 100)) : 0;
                      return (
                        <tr key={c.id}>
                          <td><span style={{ fontWeight: 700, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif" }}>{c.contract_number}</span></td>
                          <td style={{ color: 'var(--pv-text-mid)' }}>{c.agency}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(Number(c.contract_value || 0))}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, height: 4, background: '#F0F4FB', borderRadius: 2, overflow: 'hidden', minWidth: 48 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--pv-success)', borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', whiteSpace: 'nowrap' }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--pv-text-mid)', fontSize: '0.83rem' }}>{c.next_invoice_date || '—'}</td>
                          <td><span className="pv-badge pv-badge-green">{c.contract_status}</span></td>
                          <td>
                            <Link href={`/portal/contracts/${c.id}`} className="pv-btn pv-btn-outline pv-btn-sm">View</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Payment Trust Panel */}
        <div className="pv-fade pv-d4">
          <div className="pv-section-label">Payment Commitment</div>
          <div className="pv-card pv-card-success-border">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--pv-text)', marginBottom: '0.5rem' }}>
                  Our Payment Guarantee
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--pv-text-mid)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>
                  Payment is released within <strong>Net-30 days</strong> of confirmed agency receipt. You receive automated email notifications at every stage of the payment pipeline.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Payment Terms', val: 'Net-30' },
                  { label: 'Payment Method', val: 'ACH / Check' },
                  { label: 'Support', val: 'procurement@burgergov.com' },
                  { label: 'Status Updates', val: 'Automated email' },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pv-text)', fontFamily: "'DM Sans', sans-serif", marginTop: '0.1rem' }}>{row.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="pv-shell">
      <div style={{ width: 260, background: 'linear-gradient(180deg, #08111F 0%, #0a1628 100%)', flexShrink: 0 }} />
      <div className="pv-main">
        <div className="pv-page-header">
          <div style={{ height: 28, width: 200, background: '#E4EAF6', borderRadius: 6 }} />
          <div style={{ height: 16, width: 280, background: '#E4EAF6', borderRadius: 4, marginTop: 8 }} />
        </div>
        <div className="pv-page-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 96, background: '#E4EAF6', borderRadius: 12 }} />)}
          </div>
          {[1, 2].map(i => <div key={i} style={{ height: 100, background: '#E4EAF6', borderRadius: 12, marginBottom: '1rem' }} />)}
        </div>
      </div>
    </div>
  );
}
