'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Contract = { id: string; contract_number: string; agency: string; contract_value: number; prime_margin_pct: number; vendor_name: string; subcontract_value: number; performance_start: string; performance_end: string; next_invoice_date: string; total_invoiced: number; total_received: number; contract_status: string; };

const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/contracts/active`).then(r => r.json()).then(d => setContracts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function markPaymentReceived(id: string) {
    const amt = prompt('Enter agency payment amount received ($):');
    if (!amt) return;
    await fetch(`${API}/api/contracts/${id}/payment`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_amount: parseFloat(amt) }),
    });
    window.location.reload();
  }

  const totalValue = contracts.reduce((s, c) => s + Number(c.contract_value || 0), 0);
  const totalInvoiced = contracts.reduce((s, c) => s + Number(c.total_invoiced || 0), 0);
  const totalReceived = contracts.reduce((s, c) => s + Number(c.total_received || 0), 0);
  const totalAR = totalInvoiced - totalReceived;

  return (
    <AdminShell
      title="Active Contracts"
      subtitle={`${contracts.length} contract${contracts.length !== 1 ? 's' : ''} under management`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Financial Summary */}
        {contracts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Total Contract Value', val: fmt(totalValue), color: '#1E40AF' },
              { label: 'Total Invoiced', val: fmt(totalInvoiced), color: 'var(--pv-warning)' },
              { label: 'Total Received', val: fmt(totalReceived), color: 'var(--pv-success)' },
              { label: 'Accounts Receivable', val: fmt(totalAR), color: totalAR > 0 ? 'var(--pv-danger)' : 'var(--pv-muted)' },
            ].map((c, i) => (
              <div key={c.label} className={`pv-stat pv-fade pv-d${i+1}`}>
                <div className="pv-stat-label">{c.label}</div>
                <div className="pv-stat-value" style={{ color: c.color, fontSize: '1.5rem' }}>{c.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ height: 200, background: '#E4EAF6', borderRadius: 12 }} />
        ) : contracts.length === 0 ? (
          <div className="pv-card">
            <div className="pv-empty">
              <div className="pv-empty-icon">📄</div>
              <div className="pv-empty-title">No active contracts</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--pv-muted)' }}>Award contracts from the solicitation pipeline to populate this view.</p>
            </div>
          </div>
        ) : (
          <div className="pv-card pv-fade" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr><th>Contract #</th><th>Agency</th><th>Value</th><th>Margin</th><th>Vendor</th><th>Sub Value</th><th>Invoiced</th><th>Received</th><th>Next Invoice</th><th></th></tr>
                </thead>
                <tbody>
                  {contracts.map(c => {
                    const inv = Number(c.total_invoiced || 0);
                    const rec = Number(c.total_received || 0);
                    const val = Number(c.contract_value || 0);
                    const pct = val > 0 ? Math.min(100, Math.round(inv / val * 100)) : 0;
                    const ar = inv - rec;
                    return (
                      <tr key={c.id}>
                        <td><span style={{ fontWeight: 700, fontFamily: "'DM Serif Display', serif" }}>{c.contract_number}</span></td>
                        <td style={{ color: 'var(--pv-text-mid)', fontSize: '0.83rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.agency}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(val)}</td>
                        <td><span style={{ color: 'var(--pv-gold)', fontWeight: 800, fontFamily: "'DM Sans', sans-serif" }}>{c.prime_margin_pct}%</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--pv-text-mid)' }}>{c.vendor_name || '—'}</td>
                        <td>{fmt(Number(c.subcontract_value || 0))}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 40, height: 4, background: '#F0F4FB', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--pv-gold)', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: '0.78rem' }}>{fmt(inv)}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--pv-success)', fontWeight: 700 }}>{fmt(rec)}</td>
                        <td style={{ fontSize: '0.78rem', color: ar > 0 ? 'var(--pv-warning)' : 'var(--pv-muted)' }}>
                          {c.next_invoice_date || '—'}
                        </td>
                        <td>
                          <button onClick={() => markPaymentReceived(c.id)} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)', whiteSpace: 'nowrap' }}>
                            Mark Paid
                          </button>
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
    </AdminShell>
  );
}
