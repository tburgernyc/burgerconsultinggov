'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = '/api/proxy';

type MorningBrief = {
  new_opportunities: Opportunity[];
  approval_queue: { vendor_applications: VendorApp[]; rfq_dispatch_queue: Rfq[]; };
  active_contract_health: ContractHealth[];
  financial_snapshot: { pipeline_value: number; projected_revenue_15pct: number; accounts_receivable: number; };
};

type Opportunity = { solicitation_id: string; agency: string; naics: string; estimated_value: number; triage_score: number; status: string; };
type VendorApp = { id: string; legal_name: string; email: string; onboarding_status: string; hours_in_queue: number; };
type Rfq = { solicitation_id: string; agency: string; triage_score: number; phase_status: string; };
type ContractHealth = { contract_number: string; vendor_name: string; contract_value: number; total_invoiced: number; total_received: number; next_invoice_date: string; };

export default function AdminDashboard() {
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/admin/morning-brief`)
      .then(r => r.json())
      .then(setBrief)
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
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

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Loading morning brief...</div>;

  const fin = brief?.financial_snapshot;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Morning Brief</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/admin/solicitations" className="btn btn-navy btn-sm">View Full Pipeline</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-label">Pipeline Value</div>
          <div className="stat-value">${(fin?.pipeline_value || 0).toLocaleString()}</div>
          <div className="stat-sub">Active solicitations</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projected Revenue</div>
          <div className="stat-value">${(fin?.projected_revenue_15pct || 0).toLocaleString()}</div>
          <div className="stat-sub">At 15% margin</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Accounts Receivable</div>
          <div className="stat-value">${(fin?.accounts_receivable || 0).toLocaleString()}</div>
          <div className="stat-sub">Outstanding</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New Opportunities</div>
          <div className="stat-value">{brief?.new_opportunities?.length || 0}</div>
          <div className="stat-sub">Last 24 hours</div>
        </div>
      </div>

      {/* Approval Queue */}
      {((brief?.approval_queue?.vendor_applications?.length || 0) + (brief?.approval_queue?.rfq_dispatch_queue?.length || 0)) > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>⚡ Approval Queue — Action Required</h2>
          {brief?.approval_queue?.vendor_applications?.map(v => (
            <div key={v.id} className={`alert-zone ${v.hours_in_queue > 24 ? 'urgent' : 'info'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>{v.legal_name}</strong> — Vendor Application
                <span style={{ marginLeft: '0.5rem' }} className={`badge ${v.hours_in_queue > 24 ? 'badge-red' : 'badge-yellow'}`}>
                  {v.hours_in_queue > 24 ? 'URGENT' : `${Math.round(v.hours_in_queue)}h in queue`}
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{v.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => approveVendor(v.id)} className="btn btn-success btn-sm">Approve</button>
                <a href={`/admin/vendors/${v.id}`} className="btn btn-outline btn-sm">Review</a>
              </div>
            </div>
          ))}
          {brief?.approval_queue?.rfq_dispatch_queue?.map(rfq => (
            <div key={rfq.solicitation_id} className="alert-zone info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>{rfq.solicitation_id}</strong> — RFQ Ready for Dispatch
                <span style={{ marginLeft: '0.5rem' }} className="badge badge-blue">Score: {rfq.triage_score}</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{rfq.agency}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => approveRfq(rfq.solicitation_id)} className="btn btn-primary btn-sm">Approve Dispatch</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* New Opportunities */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>New Opportunities (Last 24hrs)</h2>
        {(!brief?.new_opportunities || brief.new_opportunities.length === 0) ? (
          <div className="empty-state">No new opportunities in the last 24 hours. SAM.gov scan runs at 7:00 AM ET.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Solicitation #</th><th>Agency</th><th>NAICS</th><th>Value</th><th>Score</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {brief.new_opportunities.map(opp => (
                  <tr key={opp.solicitation_id} style={{ background: opp.triage_score >= 8 ? '#f0fdf4' : opp.triage_score >= 6 ? '#fefce8' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{opp.solicitation_id}</td>
                    <td>{opp.agency || '—'}</td>
                    <td><span className="badge badge-gold">{opp.naics || '—'}</span></td>
                    <td>{opp.estimated_value ? `$${Number(opp.estimated_value).toLocaleString()}` : '—'}</td>
                    <td>
                      <span className={`badge ${opp.triage_score >= 8 ? 'badge-green' : opp.triage_score >= 6 ? 'badge-yellow' : 'badge-red'}`}>
                        {opp.triage_score ?? '—'}
                      </span>
                    </td>
                    <td><span className="badge badge-blue">{opp.status}</span></td>
                    <td><a href={`/admin/solicitations/${opp.solicitation_id}`} className="btn btn-navy btn-sm">View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Active Contracts */}
      <section>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>Active Contract Health</h2>
        {(!brief?.active_contract_health || brief.active_contract_health.length === 0) ? (
          <div className="empty-state">No active contracts yet.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Contract #</th><th>Vendor</th><th>Value</th><th>Invoiced</th><th>Received</th><th>Next Invoice</th></tr></thead>
              <tbody>
                {brief.active_contract_health.map(c => (
                  <tr key={c.contract_number}>
                    <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                    <td>{c.vendor_name || '—'}</td>
                    <td>${Number(c.contract_value || 0).toLocaleString()}</td>
                    <td>${Number(c.total_invoiced || 0).toLocaleString()}</td>
                    <td>${Number(c.total_received || 0).toLocaleString()}</td>
                    <td>{c.next_invoice_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
