'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/AdminShell';
import { ADMIN_API as API } from '@/lib/api';
import { fmt, scoreClass } from '@/lib/format';

type MorningBrief = {
  new_opportunities: Opportunity[];
  approval_queue: { vendor_applications: VendorApp[]; rfq_dispatch_queue: Rfq[]; };
  active_contract_health: ContractHealth[];
  financial_snapshot: { pipeline_value: number; projected_revenue_15pct: number; accounts_receivable: number; };
  outreach_summary: { active_campaigns: number; quotes_received: number; solicitations_in_outreach: number; };
};
type Opportunity = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; };
type VendorApp = { id: string; legal_name: string; email: string; onboarding_status: string; hours_in_queue: number; };
type Rfq = { solicitation_id: string; agency: string; triage_score: number; phase_status: string; };
type ContractHealth = { contract_number: string; vendor_name: string; contract_value: number; total_invoiced: number; total_received: number; next_invoice_date: string; };

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function AdminDashboard() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/morning-brief`)
      .then(r => r.json()).then(setBrief).catch(() => setBrief(null)).finally(() => setLoading(false));
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

  const fin = brief?.financial_snapshot;
  const outreach = brief?.outreach_summary;
  const vendors = brief?.approval_queue?.vendor_applications || [];
  const rfqs = brief?.approval_queue?.rfq_dispatch_queue || [];
  const pendingCount = vendors.length + rfqs.length;
  const opps = brief?.new_opportunities || [];
  const contracts = brief?.active_contract_health || [];

  return (
    <AdminShell
      title="Morning Brief"
      subtitle={today}
      actions={<Link href="/admin/solicitations" className="pv-btn pv-btn-navy pv-btn-sm">Full Pipeline →</Link>}
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 90, background: '#E4EAF6', borderRadius: 12 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Financial Snapshot */}
          <div>
            <div className="pv-section-label">Financial Snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Pipeline Value', val: fmt(fin?.pipeline_value || 0), sub: 'Active solicitations', icon: '📊', accent: '#1E40AF' },
                { label: 'Projected Revenue', val: fmt(fin?.projected_revenue_15pct || 0), sub: 'At 15% prime margin', icon: '📈', accent: 'var(--pv-success)' },
                { label: 'Accounts Receivable', val: fmt(fin?.accounts_receivable || 0), sub: 'Outstanding invoices', icon: '⏳', accent: 'var(--pv-warning)' },
                { label: 'New Opportunities', val: String(opps.length), sub: 'Last 24 hours from SAM', icon: '🔍', accent: 'var(--pv-gold)' },
                { label: 'Active Outreach', val: String(outreach?.active_campaigns || 0), sub: `${outreach?.quotes_received || 0} quote${(outreach?.quotes_received || 0) !== 1 ? 's' : ''} received`, icon: '📡', accent: '#7C3AED' },
              ].map((card, i) => (
                <div key={card.label} className={`pv-stat pv-fade pv-d${i + 1}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div className="pv-stat-label">{card.label}</div>
                    <span style={{ fontSize: '1.1rem' }}>{card.icon}</span>
                  </div>
                  <div className="pv-stat-value" style={{ color: card.accent }}>{card.val}</div>
                  <div className="pv-stat-sub">{card.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Queue */}
          {pendingCount > 0 && (
            <div className="pv-fade pv-d1">
              <div className="pv-section-label" style={{ color: 'var(--pv-danger)' }}>
                ⚡ Approval Queue — {pendingCount} Item{pendingCount > 1 ? 's' : ''} Require Action
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {vendors.map(v => (
                  <div key={v.id} className="pv-card" style={{ borderLeft: `4px solid ${v.hours_in_queue > 24 ? 'var(--pv-danger)' : 'var(--pv-warning)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1.125rem 1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', fontSize: '0.9rem' }}>{v.legal_name}</span>
                        <span className={`pv-badge ${v.hours_in_queue > 24 ? 'pv-badge-red' : 'pv-badge-gold'}`}>{v.hours_in_queue > 24 ? `${Math.round(v.hours_in_queue)}h — URGENT` : `${Math.round(v.hours_in_queue)}h in queue`}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>Vendor Application · {v.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/vendors/${v.id}`} className="pv-btn pv-btn-outline pv-btn-sm">Review</Link>
                      <button onClick={() => approveVendor(v.id)} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)' }}>Approve</button>
                    </div>
                  </div>
                ))}
                {rfqs.map(rfq => (
                  <div key={rfq.solicitation_id} className="pv-card" style={{ borderLeft: '4px solid var(--pv-gold)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '1.125rem 1.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)', fontSize: '0.9rem' }}>{rfq.solicitation_id}</span>
                        <span className="pv-badge pv-badge-blue">Score: {rfq.triage_score}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>RFQ Ready for Dispatch · {rfq.agency}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/admin/solicitations/${rfq.solicitation_id}`} className="pv-btn pv-btn-outline pv-btn-sm">View</Link>
                      <button onClick={() => approveRfq(rfq.solicitation_id)} className="pv-btn pv-btn-primary pv-btn-sm">Approve Dispatch</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Opportunities */}
          <div className="pv-fade pv-d2">
            <div className="pv-section-label">New Opportunities — Last 24 Hours</div>
            {opps.length === 0 ? (
              <div className="pv-card">
                <div className="pv-empty">
                  <div className="pv-empty-icon">🔍</div>
                  <div className="pv-empty-title">No new opportunities in the last 24 hours</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)' }}>SAM.gov scan runs at 7:00, 11:00, 15:00, 19:00 ET</p>
                </div>
              </div>
            ) : (
              <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="pv-table-wrap">
                  <table className="pv-table">
                    <thead><tr><th>Solicitation #</th><th>Agency</th><th>NAICS</th><th>Est. Value</th><th>Score</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {opps.map(opp => (
                        <tr key={opp.solicitation_id}>
                          <td><span style={{ fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>{opp.solicitation_id}</span></td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--pv-text-mid)', fontSize: '0.83rem' }}>{opp.agency || '—'}</td>
                          <td><span className="pv-badge pv-badge-navy">{opp.naics || '—'}</span></td>
                          <td style={{ fontWeight: 600 }}>{opp.estimated_value ? fmt(opp.estimated_value) : '—'}</td>
                          <td><span className={`pv-badge ${scoreClass(opp.triage_score)}`}>{opp.triage_score ?? '—'}/10</span></td>
                          <td><span className="pv-badge pv-badge-gray" style={{ fontSize: '0.62rem' }}>{(opp.status || '').replace(/_/g, ' ')}</span></td>
                          <td><Link href={`/admin/solicitations/${opp.solicitation_id}`} className="pv-btn pv-btn-navy pv-btn-sm">View</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Contract Health */}
          <div className="pv-fade pv-d3">
            <div className="pv-section-label">Active Contract Health</div>
            {contracts.length === 0 ? (
              <div className="pv-card">
                <div className="pv-empty">
                  <div className="pv-empty-icon">📄</div>
                  <div className="pv-empty-title">No active contracts</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)' }}>Award contracts from the solicitation pipeline to see health data here.</p>
                </div>
              </div>
            ) : (
              <div className="pv-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="pv-table-wrap">
                  <table className="pv-table">
                    <thead><tr><th>Contract #</th><th>Vendor</th><th>Value</th><th>Invoiced</th><th>Received</th><th>Next Invoice</th></tr></thead>
                    <tbody>
                      {contracts.map(c => {
                        const val = Number(c.contract_value || 0);
                        const inv = Number(c.total_invoiced || 0);
                        const rec = Number(c.total_received || 0);
                        const pct = val > 0 ? Math.min(100, Math.round(inv / val * 100)) : 0;
                        return (
                          <tr key={c.contract_number}>
                            <td><span style={{ fontWeight: 700 }}>{c.contract_number}</span></td>
                            <td style={{ color: 'var(--pv-text-mid)', fontSize: '0.83rem' }}>{c.vendor_name || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{fmt(val)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: 4, background: '#F0F4FB', borderRadius: 2, overflow: 'hidden', minWidth: 48 }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--pv-gold)', borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', whiteSpace: 'nowrap' }}>{fmt(inv)}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--pv-success)', fontWeight: 700 }}>{fmt(rec)}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--pv-muted)' }}>{c.next_invoice_date || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </AdminShell>
  );
}
