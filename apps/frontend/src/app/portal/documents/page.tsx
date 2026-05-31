'use client';

import { useState } from 'react';
import { PortalShell } from '@/components/PortalShell';

type DocStatus = 'VALID' | 'EXPIRING_SOON' | 'MISSING' | 'EXPIRED';

type Doc = {
  type: string;
  label: string;
  description: string;
  required: boolean;
  expiry: string | null;
  status: DocStatus;
};

const INITIAL_DOCS: Doc[] = [
  {
    type: 'INSURANCE',
    label: 'General Liability Insurance Certificate',
    description: 'Minimum $1M per occurrence, $2M aggregate. Must name Burger Consulting LLC as additional insured.',
    required: true,
    expiry: null,
    status: 'MISSING',
  },
  {
    type: 'W9',
    label: 'W-9 — Request for Taxpayer Identification',
    description: 'Current year W-9 signed by an authorized representative of your business entity.',
    required: true,
    expiry: null,
    status: 'MISSING',
  },
  {
    type: 'LICENSE',
    label: 'State Business License',
    description: 'Active business license for the state(s) where services will be performed.',
    required: false,
    expiry: null,
    status: 'MISSING',
  },
  {
    type: 'SAM',
    label: 'SAM.gov / CAGE Verification',
    description: 'Screenshot or PDF confirming active SAM.gov registration and CAGE code assignment.',
    required: false,
    expiry: null,
    status: 'MISSING',
  },
];

const STATUS_CONFIG: Record<DocStatus, { label: string; badge: string; icon: string; color: string; cardClass: string }> = {
  VALID:         { label: 'Valid',          badge: 'pv-badge-green', icon: '✓',  color: 'var(--pv-success)',  cardClass: 'pv-doc-valid' },
  EXPIRING_SOON: { label: 'Expiring Soon',  badge: 'pv-badge-gold',  icon: '⚠', color: 'var(--pv-warning)',  cardClass: 'pv-doc-expiring' },
  EXPIRED:       { label: 'Expired',        badge: 'pv-badge-red',   icon: '✗',  color: 'var(--pv-danger)',   cardClass: 'pv-doc-missing' },
  MISSING:       { label: 'Missing',        badge: 'pv-badge-gray',  icon: '○',  color: 'var(--pv-muted)',    cardClass: 'pv-doc-missing' },
};

export default function DocumentVaultPage() {
  const [docs, setDocs] = useState<Doc[]>(INITIAL_DOCS);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  async function handleUpload(docType: string, file: File) {
    setUploading(docType);
    await new Promise(r => setTimeout(r, 1400));
    setUploading(null);
    setUploadedFiles(prev => ({ ...prev, [docType]: file.name }));
    setDocs(prev => prev.map(d =>
      d.type === docType ? { ...d, status: 'VALID' as DocStatus } : d
    ));
  }

  const compliant = docs.filter(d => d.required && d.status === 'VALID').length;
  const requiredCount = docs.filter(d => d.required).length;
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
              <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                {compliant} of {requiredCount} required documents on file
              </div>
            </div>
            <span className={`pv-badge ${compliancePct === 100 ? 'pv-badge-green' : 'pv-badge-gold'}`}>
              {compliancePct}% Compliant
            </span>
          </div>
          <div style={{ height: 8, background: '#F0F4FB', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${compliancePct}%`,
              background: compliancePct === 100 ? 'var(--pv-success)' : 'linear-gradient(90deg, var(--pv-gold), var(--pv-gold-light))',
              borderRadius: 999,
              transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>
          {compliancePct < 100 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', marginTop: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
              Upload all required documents to maintain uninterrupted portal access and RFQ eligibility.
            </p>
          )}
        </div>

        {/* Document Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {docs.map((doc, i) => {
            const cfg = STATUS_CONFIG[doc.status];
            const uploaded = uploadedFiles[doc.type];
            return (
              <div key={doc.type} className={`pv-doc-card ${cfg.cardClass} pv-fade pv-d${Math.min(i + 1, 6)}`}>
                <div className="pv-doc-header-inner">
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: doc.status === 'VALID' ? 'var(--pv-success-bg)' : doc.status === 'EXPIRING_SOON' ? 'var(--pv-warning-bg)' : 'var(--pv-danger-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', color: cfg.color, fontWeight: 800,
                    border: `1px solid ${doc.status === 'VALID' ? '#6EE7B7' : doc.status === 'EXPIRING_SOON' ? '#FDE68A' : '#FCA5A5'}`,
                  }}>
                    {doc.status === 'VALID' ? '📄' : doc.status === 'EXPIRING_SOON' ? '⚠️' : '📋'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--pv-text)', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif" }}>{doc.label}</span>
                      {doc.required && <span className="pv-badge pv-badge-red" style={{ fontSize: '0.6rem' }}>Required</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`pv-badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span>
                      {doc.expiry && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                          Expires: {doc.expiry}
                        </span>
                      )}
                      {uploaded && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--pv-success)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                          ✓ {uploaded}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <label className="pv-btn pv-btn-outline pv-btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      {uploading === doc.type ? (
                        <span style={{ opacity: 0.6 }}>Uploading…</span>
                      ) : (
                        <>{doc.status === 'VALID' ? '↑ Replace' : '↑ Upload'}</>
                      )}
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
                  <p style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                    {doc.description}
                  </p>
                  {!uploaded && doc.status === 'MISSING' && (
                    <label
                      className="pv-upload-zone"
                      style={{ display: 'block', marginTop: '0.875rem', cursor: 'pointer' }}
                    >
                      <div style={{ pointerEvents: 'none' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>☁</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--pv-muted)', fontFamily: "'DM Sans', sans-serif" }}>
                          Drag & drop or <span style={{ color: 'var(--pv-gold)', fontWeight: 600 }}>click to upload</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--pv-muted)', marginTop: '0.2rem', fontFamily: "'DM Sans', sans-serif" }}>PDF, JPG, or PNG</div>
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

        {/* Policy notice */}
        <div className="pv-alert pv-alert-info pv-fade pv-d5">
          <strong>Automated Compliance Monitoring:</strong> You will receive email alerts 30 days and 7 days before your insurance certificate expires. Portal access and RFQ eligibility are automatically suspended on the expiry date until a renewed certificate is uploaded.
        </div>
      </div>
    </PortalShell>
  );
}
