'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

export default function FinancialsPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    fetch(`${API}/api/admin/morning-brief`).then(r => r.json()).then(setBrief).catch(() => {});
    fetch(`${API}/api/contracts/active`).then(r => r.json()).then(d => setContracts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const fin = brief?.financial_snapshot;
  const totalValue = contracts.reduce((s, c) => s + Number(c.contract_value || 0), 0);
  const totalInvoiced = contracts.reduce((s, c) => s + Number(c.total_invoiced || 0), 0);
  const totalReceived = contracts.reduce((s, c) => s + Number(c.total_received || 0), 0);
  const outstandingAP = totalInvoiced - totalReceived;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Financial Snapshot</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Revenue, margins, AR/AP tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card"><div className="stat-label">Pipeline Value</div><div className="stat-value">${(fin?.pipeline_value || 0).toLocaleString()}</div><div className="stat-sub">Active solicitations</div></div>
        <div className="stat-card"><div className="stat-label">Projected Revenue (15%)</div><div className="stat-value">${(fin?.projected_revenue_15pct || 0).toLocaleString()}</div><div className="stat-sub">Year 1 estimate</div></div>
        <div className="stat-card"><div className="stat-label">Total Contract Value</div><div className="stat-value">${totalValue.toLocaleString()}</div><div className="stat-sub">Active contracts</div></div>
        <div className="stat-card"><div className="stat-label">Total Invoiced</div><div className="stat-value">${totalInvoiced.toLocaleString()}</div><div className="stat-sub">To date</div></div>
        <div className="stat-card"><div className="stat-label">Received (Agency)</div><div className="stat-value" style={{ color: 'var(--success)' }}>${totalReceived.toLocaleString()}</div><div className="stat-sub">Confirmed</div></div>
        <div className="stat-card"><div className="stat-label">A/R Outstanding</div><div className="stat-value" style={{ color: outstandingAP > 0 ? 'var(--warning)' : 'var(--success)' }}>${outstandingAP.toLocaleString()}</div><div className="stat-sub">Pending collection</div></div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '1rem' }}>Contract-Level Financials</h2>
        {contracts.length === 0 ? (
          <div className="empty-state">No active contracts.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Contract #</th><th>Agency</th><th>Total Value</th><th>Prime Margin</th><th>Sub Value</th><th>Invoiced</th><th>Received</th><th>A/R</th></tr></thead>
              <tbody>
                {contracts.map(c => {
                  const ar = Number(c.total_invoiced || 0) - Number(c.total_received || 0);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                      <td>{c.agency}</td>
                      <td>${Number(c.contract_value || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{c.prime_margin_pct}%</td>
                      <td>${Number(c.subcontract_value || 0).toLocaleString()}</td>
                      <td>${Number(c.total_invoiced || 0).toLocaleString()}</td>
                      <td style={{ color: 'var(--success)' }}>${Number(c.total_received || 0).toLocaleString()}</td>
                      <td style={{ color: ar > 0 ? 'var(--warning)' : 'var(--muted)' }}>${ar.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

type Brief = { financial_snapshot: { pipeline_value: number; projected_revenue_15pct: number; accounts_receivable: number; }; };
type Contract = { id: string; contract_number: string; agency: string; contract_value: number; prime_margin_pct: number; subcontract_value: number; total_invoiced: number; total_received: number; };
