'use client';

import { useState } from 'react';

export default function DocumentVaultPage() {
  const [uploading, setUploading] = useState<string | null>(null);

  const docs = [
    { type: 'INSURANCE', label: 'General Liability Insurance Certificate', required: true, expiry: null, status: 'MISSING' },
    { type: 'W9', label: 'W-9', required: true, expiry: null, status: 'MISSING' },
    { type: 'LICENSE', label: 'State Business License', required: false, expiry: null, status: 'MISSING' },
    { type: 'SAM', label: 'SAM.gov / CAGE Verification', required: false, expiry: null, status: 'MISSING' },
  ];

  async function handleUpload(docType: string, file: File) {
    setUploading(docType);
    await new Promise(r => setTimeout(r, 1000));
    setUploading(null);
    alert(`${file.name} uploaded successfully.`);
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>Document Vault</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Upload and manage your compliance documents. Expired documents will trigger automatic alerts.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {docs.map(doc => (
            <div key={doc.type} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{doc.label}</span>
                  {doc.required && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>Required</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  <span className={`badge ${doc.status === 'VALID' ? 'badge-green' : doc.status === 'EXPIRING_SOON' ? 'badge-yellow' : 'badge-gray'}`}>
                    {doc.status}
                  </span>
                  {doc.expiry && <span>Expires: {doc.expiry}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                  {uploading === doc.type ? 'Uploading...' : 'Upload'}
                  <input type="file" accept=".pdf,.jpg,.png" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleUpload(doc.type, e.target.files[0])} />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="alert-zone info" style={{ marginTop: '2rem' }}>
          <strong>Automated Alerts:</strong> You will receive email notifications 30 days and 7 days before insurance expiry.
          Access will be suspended on the day of expiry until renewed documents are uploaded.
        </div>
      </div>
    </section>
  );
}
