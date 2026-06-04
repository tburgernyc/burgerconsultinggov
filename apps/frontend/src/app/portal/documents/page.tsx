'use client';

import { useEffect, useState } from 'react';
import { PortalShell } from '@/components/PortalShell';
import { VENDOR_API as API } from '@/lib/api';

type DocType = 'INSURANCE' | 'W9' | 'LICENSE' | 'SAM';
type DocStatus = 'VALID' | 'EXPIRING_SOON' | 'MISSING' | 'EXPIRED';

type UploadedDoc = { id: string; doc_type: string; filename: string; created_at: string };

const DOC_DEFS: { type: DocType; label: string; description: string; required: boolean }[] = [
  {
    type: 'INSURANCE',
    label: 'General Liability Insurance Certificate',
    description: 'Minimum $1M per occurrence, $2M aggregate. Must name Burger Consulting LLC as additional insured.',
    required: true,
  },
  {
    type: 'W9',
    label: 'W-9 — Request for Taxpayer Identification',
    description: 'Current year W-9 signed by an authorized representative of your business entity.',
    required: true,
  },
  {
    type: 'LICENSE',
    label: 'State Business License',
    description: 'Active business license for the state(s) where services will be performed.',
    required: false,
  },
  {
    type: 'SAM',
    label: 'SAM.gov / CAGE Verification',
    description: 'Screenshot or PDF confirming active SAM.gov registration and CAGE code assignment.',
    required: false,
  },
];

const STATUS_CONFIG: Record<DocStatus, { label: string; badge: string; icon: string; color: string; cardClass: string }> = {
  VALID:         { label: 'Valid',         badge: 'pv-badge-green', icon: '✓', color: 'var(--pv-success)', cardClass: 'pv-doc-valid' },
  EXPIRING_SOON: { label: 'Expiring Soon', badge: 'pv-badge-gold',  icon: '⚠', color: 'var(--pv-warning)', cardClass: 'pv-doc-expiring' },
  EXPIRED:       { label: 'Expired',       badge: 'pv-badge-red',   icon: '✗', color: 'var(--pv-danger)',  cardClass: 'pv-doc-missing' },
  MISSING:       { label: 'Missing',       badge: 'pv-badge-gray',  icon: '○', color: 'var(--pv-muted)',   cardClass: 'pv-doc-missing' },
};

function docStatus(uploaded: UploadedDoc | undefined, expiryDate: string | null): DocStatus {
  if (!uploaded) return 'MISSING';
  if (!expiryDate) return 'VALID';
  const exp = new Date(expiryDate);
  const now = new Date();
  const daysLeft = (exp.getTime() - now.getTime()) / 86400000;
  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= 30) return 'EXPIRING_SOON';
  return 'VALID';
}

export default function DocumentVaultPage() {
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>({});
  const [insuranceExpiry, setInsuranceExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expiryInputs, setExpiryInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/vendor-docs`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/vendor-profile`).then(r => r.json()).catch(() => ({})),
    ]).then(([docs, profile]) => {
      const map: Record<string, UploadedDoc> = {};
      for (const d of (docs as UploadedDoc[])) map[d.doc_type] = d;
      setUploaded(map);
      setInsuranceExpiry(profile.insurance_expiry || null);
    }).finally(() => setLoading(false));
  }, []);

  async function handleUpload(docType: DocType, file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setErrors(p => ({ ...p, [docType]: 'Only PDF, JPG, or PNG accepted.' }));
      return;
    }
    if (docType === 'INSURANCE' && !expiryInputs[docType]) {
      setErrors(p => ({ ...p, [docType]: 'Enter the certificate expiry date before uploading.' }));
      return;
    }

    setErrors(p => ({ ...p, [docType]: '' }));
    setUploading(docType);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('doc_type', docType);
      if (docType === 'INSURANCE' && expiryInputs[docType]) {
        form.append('expiry_date', expiryInputs[docType]);
      }
      const res = await fetch(`${API}/api/vendor-docs`, { method: 'POST', body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrors(p => ({ ...p, [docType]: d.detail || `Upload failed (${res.status})` }));
        return;
      }
      const data = await res.json();
      setUploaded(prev => ({
        ...prev,
        [docType]: { id: data.doc_id, doc_type: docType, filename: data.filename, created_at: new Date().toISOString() },
      }));
      if (docType === 'INSURANCE' && expiryInputs[docType]) {
        setInsuranceExpiry(expiryInputs[docType]);
      }
    } finally {
      setUploading(null);
    }
  }

  const statuses = Object.fromEntries(
    DOC_DEFS.map(d => [d.type, docStatus(uploaded[d.type], d.type === 'INSURANCE' ? insuranceExpiry : null)])
  ) as Record<DocType, DocStatus>;

  const compliant = DOC_DEFS.filter(d => d.required && statuses[d.type] === 'VALID').length;
  const requiredCount = DOC_DEFS.filter(d => d.required).length;
  const compliancePct = Math.round((compliant / requiredCount) * 100);

  return (
    <PortalShell title="Document Vault" subtitle="Upload and manage your compliance documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 820 }}>

        {/* Compliance Progress */}
        <div className="pv-card pv-fade" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.125rem', color: 'var(--pv-text)', marginBottom: '0.2rem' }}>
                Compliance Status
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)' }}>
                {loading ? 'Loading…' : `${compliant} of ${requiredCount} required documents on file`}
              </div>
            </div>
            {!loading && (
              <span className={`pv-badge ${compliancePct === 100 ? 'pv-badge-green' : 'pv-badge-gold'}`}>
                {compliancePct}% Compliant
              </span>
            )}
          </div>
          <div style={{ height: 8, background: '#F0F4FB', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: loading ? '0%' : `${compliancePct}%`,
              background: compliancePct === 100 ? 'var(--pv-success)' : 'linear-gradient(90deg, var(--pv-gold), var(--pv-gold-light))',
              borderRadius: 999,
              transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>
        </div>

        {/* Document Cards */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 100, background: '#E4EAF6', borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {DOC_DEFS.map((doc, i) => {
              const status = statuses[doc.type];
              const cfg = STATUS_CONFIG[status];
              const up = uploaded[doc.type];
              const isUploading = uploading === doc.type;

              return (
                <div key={doc.type} className={`pv-doc-card ${cfg.cardClass} pv-fade pv-d${Math.min(i + 1, 6)}`}>
                  <div className="pv-doc-header-inner">
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: status === 'VALID' ? 'var(--pv-success-bg)' : status === 'EXPIRING_SOON' ? 'var(--pv-warning-bg)' : 'var(--pv-danger-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem',
                      border: `1px solid ${status === 'VALID' ? '#6EE7B7' : status === 'EXPIRING_SOON' ? '#FDE68A' : '#FCA5A5'}`,
                    }}>
                      {status === 'VALID' ? '📄' : status === 'EXPIRING_SOON' ? '⚠️' : '📋'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--pv-text)', fontSize: '0.9rem' }}>{doc.label}</span>
                        {doc.required && <span className="pv-badge pv-badge-red" style={{ fontSize: '0.6rem' }}>Required</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`pv-badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span>
                        {up && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--pv-success)', fontWeight: 600 }}>
                            ✓ {up.filename}
                          </span>
                        )}
                        {doc.type === 'INSURANCE' && insuranceExpiry && status !== 'MISSING' && (
                          <span style={{ fontSize: '0.75rem', color: status === 'EXPIRING_SOON' || status === 'EXPIRED' ? cfg.color : 'var(--pv-muted)' }}>
                            Expires: {new Date(insuranceExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <label className="pv-btn pv-btn-outline pv-btn-sm" style={{ cursor: isUploading ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        {isUploading ? 'Uploading…' : up ? '↑ Replace' : '↑ Upload'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={e => e.target.files?.[0] && handleUpload(doc.type, e.target.files[0])}
                          disabled={uploading !== null}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pv-doc-body">
                    <p style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', lineHeight: 1.55, margin: '0 0 0.5rem' }}>
                      {doc.description}
                    </p>

                    {/* Insurance expiry date input */}
                    {doc.type === 'INSURANCE' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Certificate Expiry:
                        </label>
                        <input
                          type="date"
                          value={expiryInputs['INSURANCE'] || ''}
                          onChange={e => setExpiryInputs(p => ({ ...p, INSURANCE: e.target.value }))}
                          style={{ padding: '0.3rem 0.5rem', border: '1.5px solid var(--pv-border)', borderRadius: 5, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", color: 'var(--pv-text)' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--pv-muted)' }}>Required before upload</span>
                      </div>
                    )}

                    {errors[doc.type] && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--pv-danger)', fontWeight: 600, marginBottom: '0.25rem' }}>
                        ✕ {errors[doc.type]}
                      </div>
                    )}

                    {!up && status === 'MISSING' && (
                      <label className="pv-upload-zone" style={{ display: 'block', marginTop: '0.5rem', cursor: 'pointer' }}>
                        <div style={{ pointerEvents: 'none' }}>
                          <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>☁</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)' }}>
                            Drag & drop or <span style={{ color: 'var(--pv-gold)', fontWeight: 600 }}>click to upload</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)', marginTop: '0.2rem' }}>PDF, JPG, or PNG</div>
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={e => e.target.files?.[0] && handleUpload(doc.type, e.target.files[0])}
                          disabled={uploading !== null}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pv-alert pv-alert-info pv-fade pv-d5">
          <strong>Automated Compliance Monitoring:</strong> You will receive email alerts 30 days and 7 days before your insurance certificate expires. Portal access and RFQ eligibility are automatically suspended on the expiry date until a renewed certificate is uploaded.
        </div>
      </div>
    </PortalShell>
  );
}
