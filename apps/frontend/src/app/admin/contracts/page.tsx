'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';

const API = '/api/proxy';

type Contract = { id: string; contract_number: string; agency: string; contract_value: number; prime_margin_pct: number; vendor_name: string; subcontract_value: number; performance_start: string; performance_end: string; next_invoice_date: string; total_invoiced: number; total_received: number; contract_status: string; };
type Agreement = { contract_id: string; contract_number: string; agreement: string | null; signed: boolean; signed_at: string | null; signed_by: string | null; };

const fmt = (n: number) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreementModal, setAgreementModal] = useState<{ contractId: string; contractNumber: string } | null>(null);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);
  const [agreementMsg, setAgreementMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/api/contracts/active`).then(r => r.json()).then(d => setContracts(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  async function openAgreement(contractId: string, contractNumber: string) {
    setAgreementModal({ contractId, contractNumber });
    setAgreement(null);
    setAgreementLoading(true);
    setAgreementMsg('');
    setSignName('');
    try {
      const r = await fetch(`${API}/api/contracts/${contractId}/agreement`);
      if (r.ok) setAgreement(await r.json());
    } finally {
      setAgreementLoading(false);
    }
  }

  async function generateAgreement() {
    if (!agreementModal) return;
    setGenerating(true);
    setAgreementMsg('');
    try {
      const r = await fetch(`${API}/api/contracts/${agreementModal.contractId}/agreement/generate`, { method: 'POST' });
      if (!r.ok) { setAgreementMsg('Generation failed. Check contract has a vendor assigned.'); return; }
      const d = await r.json();
      setAgreement(prev => prev ? { ...prev, agreement: d.agreement, signed: false } : { contract_id: agreementModal.contractId, contract_number: agreementModal.contractNumber, agreement: d.agreement, signed: false, signed_at: null, signed_by: null });
    } catch { setAgreementMsg('Generation failed.'); } finally { setGenerating(false); }
  }

  async function signAgreement() {
    if (!agreementModal || !signName.trim()) { setAgreementMsg('Enter your full name to sign.'); return; }
    setSigning(true);
    setAgreementMsg('');
    try {
      const r = await fetch(`${API}/api/contracts/${agreementModal.contractId}/agreement/sign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_by: signName.trim() }),
      });
      if (!r.ok) { setAgreementMsg('Signing failed. Agreement may already be signed or not yet generated.'); return; }
      const d = await r.json();
      setAgreement(prev => prev ? { ...prev, signed: true, signed_at: d.signed_at, signed_by: d.signed_by } : prev);
      setAgreementMsg('Agreement signed successfully.');
    } catch { setAgreementMsg('Signing failed.'); } finally { setSigning(false); }
  }

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
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => openAgreement(c.id, c.contract_number)} className="pv-btn pv-btn-outline pv-btn-sm" style={{ whiteSpace: 'nowrap' }}>
                              Agreement
                            </button>
                            <button onClick={() => markPaymentReceived(c.id)} className="pv-btn pv-btn-sm" style={{ background: 'var(--pv-success)', color: '#fff', border: '1.5px solid var(--pv-success)', whiteSpace: 'nowrap' }}>
                              Mark Paid
                            </button>
                          </div>
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

      {/* Agreement Modal */}
      {agreementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setAgreementModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(10,22,40,0.25)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--pv-text)', margin: 0 }}>Subcontract Agreement</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', marginTop: '0.2rem' }}>Contract {agreementModal.contractNumber}</div>
              </div>
              <button onClick={() => setAgreementModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--pv-muted)' }}>✕</button>
            </div>

            {agreementLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--pv-muted)', fontSize: '0.88rem' }}>Loading agreement…</div>
            ) : agreement?.agreement ? (
              <>
                {agreement.signed && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', borderRadius: 8, padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#166534' }}>
                    ✓ Signed by <strong>{agreement.signed_by}</strong> on {new Date(agreement.signed_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                <div style={{ background: '#F8FAFC', border: '1px solid var(--pv-border)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem', maxHeight: 340, overflowY: 'auto' }}>
                  <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: 'var(--pv-text)', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>{agreement.agreement}</pre>
                </div>
                {!agreement.signed && (
                  <div style={{ borderTop: '1px solid var(--pv-border)', paddingTop: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--pv-text-mid)', marginBottom: '0.75rem' }}>Execute Agreement — Electronic Signature</div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        value={signName}
                        onChange={e => setSignName(e.target.value)}
                        placeholder="Full legal name"
                        style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--pv-border)', borderRadius: 6, fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)' }}
                        onKeyDown={e => e.key === 'Enter' && signAgreement()}
                      />
                      <button onClick={signAgreement} disabled={signing} className="pv-btn pv-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        {signing ? 'Signing…' : 'Sign Agreement'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)', marginTop: '0.5rem' }}>By clicking Sign, you agree this constitutes your legal electronic signature on behalf of Burger Consulting LLC.</div>
                  </div>
                )}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={generateAgreement} disabled={generating} className="pv-btn pv-btn-outline pv-btn-sm">
                    {generating ? 'Regenerating…' : 'Regenerate with AI'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--pv-text)', marginBottom: '0.5rem' }}>No Agreement Generated Yet</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--pv-muted)', maxWidth: 340, margin: '0 auto 1.5rem' }}>
                  Gemini will draft a complete federal subcontract agreement using the contract details, vendor info, and FAR flow-down clauses.
                </p>
                <button onClick={generateAgreement} disabled={generating} className="pv-btn pv-btn-primary">
                  {generating ? 'Drafting with Gemini…' : '✦ Generate Subcontract Agreement'}
                </button>
              </div>
            )}

            {agreementMsg && (
              <div style={{ padding: '0.6rem 0.875rem', background: agreementMsg.includes('success') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${agreementMsg.includes('success') ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: 6, color: agreementMsg.includes('success') ? '#166534' : 'var(--pv-danger)', fontSize: '0.83rem', marginTop: '1rem' }}>
                {agreementMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
