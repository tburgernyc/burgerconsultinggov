'use client';

import { useEffect, useState } from 'react';

const API = '/api/proxy';

type Contract = { id: string; contract_number: string; agency: string; contract_value: number; prime_margin_pct: number; vendor_name: string; subcontract_value: number; performance_start: string; performance_end: string; next_invoice_date: string; total_invoiced: number; total_received: number; contract_status: string; };

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/contracts/active`).then(r => r.json()).then(d => setContracts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function markPaymentReceived(id: string) {
    const amt = prompt('Enter agency payment amount received ($):');
    if (!amt) return;
    await fetch(`${API}/api/contracts/${id}/payment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_amount: parseFloat(amt) }) });
    window.location.reload();
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)' }}>Active Contracts</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{contracts.length} contracts under management</p>
      </div>

      {loading ? <div style={{ color: 'var(--muted)' }}>Loading...</div> : (
        contracts.length === 0 ? <div className="empty-state">No active contracts. Award a contract from the solicitation pipeline.</div> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Contract #</th><th>Agency</th><th>Value</th><th>Margin</th><th>Vendor</th><th>Sub Value</th><th>Invoiced</th><th>Received</th><th>Next Invoice</th><th>Action</th></tr></thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.contract_number}</td>
                    <td>{c.agency}</td>
                    <td>${Number(c.contract_value || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{c.prime_margin_pct}%</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.vendor_name || '—'}</td>
                    <td>${Number(c.subcontract_value || 0).toLocaleString()}</td>
                    <td>${Number(c.total_invoiced || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>${Number(c.total_received || 0).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.next_invoice_date || '—'}</td>
                    <td>
                      <button onClick={() => markPaymentReceived(c.id)} className="btn btn-success btn-sm">Mark Paid</button>
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
