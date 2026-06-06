'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PortalShell } from '@/components/PortalShell';
import { VENDOR_API as API } from '@/lib/api';

type Profile = {
  id: string; legal_name: string; cage_code: string; email: string;
  contact_name: string; phone: string; city: string; state: string;
  naics_codes: string[]; tech_stack: string[]; primary_skill: string;
  github_url: string; portfolio_url: string;
  clearance_level: string; remote_ok: boolean;
  hourly_rate_min: number | null; hourly_rate_max: number | null;
  section_508_certified: boolean; insurance_verified: boolean;
  insurance_expiry: string | null; sam_verified: boolean;
  pay_when_paid_accepted: boolean; performance_rating: number | null;
  contracts_completed: number; onboarding_status: string;
  created_at: string | null;
};

const CLEARANCE_OPTIONS = ['NONE', 'PUBLIC_TRUST', 'SECRET', 'TOP_SECRET'];

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string } | undefined;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    contact_name: '', phone: '', tech_stack: '',
    primary_skill: '', github_url: '', portfolio_url: '',
    hourly_rate_min: '', hourly_rate_max: '',
    remote_ok: true, clearance_level: 'NONE',
  });

  useEffect(() => {
    fetch(`${API}/api/vendor-profile`)
      .then(r => r.json())
      .then((p: Profile) => {
        setProfile(p);
        setForm({
          contact_name: p.contact_name || '',
          phone: p.phone || '',
          tech_stack: (p.tech_stack || []).join(', '),
          primary_skill: p.primary_skill || '',
          github_url: p.github_url || '',
          portfolio_url: p.portfolio_url || '',
          hourly_rate_min: p.hourly_rate_min != null ? String(p.hourly_rate_min) : '',
          hourly_rate_max: p.hourly_rate_max != null ? String(p.hourly_rate_max) : '',
          remote_ok: p.remote_ok ?? true,
          clearance_level: p.clearance_level || 'NONE',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API}/api/vendor-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: form.contact_name || null,
          phone: form.phone || null,
          tech_stack: form.tech_stack ? form.tech_stack.split(',').map(s => s.trim()).filter(Boolean) : [],
          primary_skill: form.primary_skill || null,
          github_url: form.github_url || null,
          portfolio_url: form.portfolio_url || null,
          hourly_rate_min: form.hourly_rate_min ? parseFloat(form.hourly_rate_min) : null,
          hourly_rate_max: form.hourly_rate_max ? parseFloat(form.hourly_rate_max) : null,
          remote_ok: form.remote_ok,
          clearance_level: form.clearance_level,
        }),
      });
      if (!res.ok) { alert(`Save failed (${res.status})`); return; }
      const updated = await fetch(`${API}/api/vendor-profile`).then(r => r.json());
      setProfile(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' }); return;
    }
    if (pwForm.next.length < 12) {
      setPwMsg({ ok: false, text: 'New password must be at least 12 characters.' }); return;
    }
    {
      const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(re => re.test(pwForm.next)).length;
      if (classes < 3) {
        setPwMsg({ ok: false, text: 'Use at least 3 of: lowercase, uppercase, digit, symbol.' }); return;
      }
    }
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch(`${API}/api/vendor-password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      if (res.ok) {
        setPwMsg({ ok: true, text: 'Password updated successfully.' });
        setPwForm({ current: '', next: '', confirm: '' });
      } else {
        const d = await res.json();
        setPwMsg({ ok: false, text: d.detail || `Failed (${res.status})` });
      }
    } finally { setPwSaving(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.875rem', border: '1.5px solid var(--pv-border)',
    borderRadius: 6, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
    color: 'var(--pv-text)', background: '#fff', boxSizing: 'border-box',
  };

  const initials = (profile?.legal_name || user?.name || 'SC')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <PortalShell title="Company Profile" subtitle="Your account and partnership information">
      <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {loading ? (
          <div style={{ height: 120, background: '#E4EAF6', borderRadius: 12 }} />
        ) : (
          <>
            {/* Identity card — read-only */}
            <div className="pv-card pv-card-gold-border pv-fade">
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--pv-gold) 0%, var(--pv-gold-light) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--pv-navy)', fontSize: '1.375rem', fontWeight: 800,
                }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: 'var(--pv-text)', marginBottom: '0.25rem' }}>
                    {profile?.legal_name || user?.name || 'Your Company'}
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--pv-muted)', marginBottom: '0.625rem' }}>
                    {profile?.email || user?.email || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="pv-badge pv-badge-green">Active Partner</span>
                    <span className="pv-badge pv-badge-navy">Subcontractor</span>
                    {profile?.section_508_certified && <span className="pv-badge pv-badge-blue">508 Certified</span>}
                    {profile?.sam_verified && <span className="pv-badge pv-badge-gold">SAM Verified</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {saved && <span style={{ fontSize: '0.8rem', color: 'var(--pv-success)', fontWeight: 600 }}>✓ Saved</span>}
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="pv-btn pv-btn-outline pv-btn-sm">Edit Profile</button>
                  ) : (
                    <>
                      <button onClick={() => setEditing(false)} className="pv-btn pv-btn-outline pv-btn-sm">Cancel</button>
                      <button onClick={save} disabled={saving} className="pv-btn pv-btn-primary pv-btn-sm">
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Read-only fixed fields */}
            <div className="pv-card pv-fade pv-d1">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>
                Registration Details
              </div>
              {[
                { label: 'Legal Business Name', val: profile?.legal_name || '—' },
                { label: 'Email / Login', val: profile?.email || '—' },
                { label: 'CAGE Code', val: profile?.cage_code || 'Pending' },
                { label: 'NAICS Codes', val: (profile?.naics_codes || []).join(', ') || '—' },
                { label: 'Location', val: [profile?.city, profile?.state].filter(Boolean).join(', ') || '—' },
                { label: 'Member Since', val: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--pv-border)' : 'none' }}>
                  <span style={{ fontSize: '0.83rem', color: 'var(--pv-muted)' }}>{row.label}</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pv-text)' }}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* Editable fields */}
            <div className="pv-card pv-fade pv-d2">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>
                Contact & Capabilities
              </div>

              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Contact Name</label>
                      <input style={inp} value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Phone</label>
                      <input style={inp} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 000-0000" />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Primary Skill</label>
                    <input style={inp} value={form.primary_skill} onChange={e => setForm(p => ({ ...p, primary_skill: e.target.value }))} placeholder="e.g. Full-Stack Web Development" />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Tech Stack <span style={{ fontWeight: 400, color: 'var(--pv-muted)' }}>(comma-separated)</span></label>
                    <input style={inp} value={form.tech_stack} onChange={e => setForm(p => ({ ...p, tech_stack: e.target.value }))} placeholder="React, Python, AWS, PostgreSQL, Section 508…" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Min Hourly Rate ($)</label>
                      <input style={inp} type="number" min="0" value={form.hourly_rate_min} onChange={e => setForm(p => ({ ...p, hourly_rate_min: e.target.value }))} placeholder="75" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Max Hourly Rate ($)</label>
                      <input style={inp} type="number" min="0" value={form.hourly_rate_max} onChange={e => setForm(p => ({ ...p, hourly_rate_max: e.target.value }))} placeholder="150" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Clearance Level</label>
                      <select style={{ ...inp, background: '#fff' }} value={form.clearance_level} onChange={e => setForm(p => ({ ...p, clearance_level: e.target.value }))}>
                        {CLEARANCE_OPTIONS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                      <input type="checkbox" id="remote_ok" checked={form.remote_ok} onChange={e => setForm(p => ({ ...p, remote_ok: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--pv-navy)' }} />
                      <label htmlFor="remote_ok" style={{ fontSize: '0.86rem', color: 'var(--pv-text)', fontWeight: 600 }}>Remote delivery OK</label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>GitHub URL</label>
                      <input style={inp} value={form.github_url} onChange={e => setForm(p => ({ ...p, github_url: e.target.value }))} placeholder="https://github.com/yourorg" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Portfolio URL</label>
                      <input style={inp} value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://yourcompany.com" />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[
                    { label: 'Contact Name', val: profile?.contact_name || '—' },
                    { label: 'Phone', val: profile?.phone || '—' },
                    { label: 'Primary Skill', val: profile?.primary_skill || '—' },
                    { label: 'Tech Stack', val: (profile?.tech_stack || []).join(', ') || '—' },
                    { label: 'Hourly Rate', val: profile?.hourly_rate_min && profile?.hourly_rate_max ? `$${profile.hourly_rate_min}–$${profile.hourly_rate_max}/hr` : profile?.hourly_rate_min ? `From $${profile.hourly_rate_min}/hr` : '—' },
                    { label: 'Clearance', val: (profile?.clearance_level || 'NONE').replace('_', ' ') },
                    { label: 'Remote OK', val: profile?.remote_ok ? 'Yes' : 'No' },
                    { label: 'GitHub', val: profile?.github_url || '—' },
                    { label: 'Portfolio', val: profile?.portfolio_url || '—' },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--pv-border)' : 'none' }}>
                      <span style={{ fontSize: '0.83rem', color: 'var(--pv-muted)' }}>{row.label}</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--pv-text)', textAlign: 'right', maxWidth: 320, wordBreak: 'break-all' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compliance status — read-only */}
            <div className="pv-card pv-fade pv-d3">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>
                Compliance Status
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Insurance', ok: profile?.insurance_verified, detail: profile?.insurance_expiry ? `Expires ${new Date(profile.insurance_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Not on file' },
                  { label: 'SAM Registration', ok: profile?.sam_verified, detail: profile?.sam_verified ? 'Verified' : 'Pending verification' },
                  { label: 'Pay-When-Paid', ok: profile?.pay_when_paid_accepted, detail: profile?.pay_when_paid_accepted ? 'Accepted' : 'Not accepted' },
                  { label: 'Portal Access', ok: profile?.onboarding_status === 'VERIFIED', detail: profile?.onboarding_status || '—' },
                ].map(item => (
                  <div key={item.label} style={{ background: item.ok ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${item.ok ? '#86EFAC' : '#FCD34D'}`, borderRadius: 8, padding: '0.875rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: item.ok ? '#166534' : '#92400E', marginBottom: '0.25rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.8rem', color: item.ok ? '#166534' : '#92400E', fontWeight: 600 }}>{item.detail}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', marginTop: '1rem', lineHeight: 1.5 }}>
                To update insurance certificates or compliance documents, visit the{' '}
                <a href="/portal/documents" style={{ color: 'var(--pv-navy)', fontWeight: 600 }}>Document Vault</a>.
                SAM registration changes require admin review — email{' '}
                <a href="mailto:procurement@burgergov.com" style={{ color: 'var(--pv-navy)', fontWeight: 600 }}>procurement@burgergov.com</a>.
              </p>
            </div>
            {/* Change Password */}
            <div className="pv-card pv-fade pv-d4">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--pv-text)', marginBottom: '1rem' }}>
                Change Password
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
                {[
                  { label: 'Current Password', key: 'current' as const },
                  { label: 'New Password', key: 'next' as const },
                  { label: 'Confirm New Password', key: 'confirm' as const },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pv-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>{field.label}</label>
                    <input
                      type="password"
                      style={inp}
                      value={pwForm[field.key]}
                      onChange={e => setPwForm(p => ({ ...p, [field.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && changePassword()}
                    />
                  </div>
                ))}
                {pwMsg && (
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: pwMsg.ok ? 'var(--pv-success)' : 'var(--pv-danger)' }}>
                    {pwMsg.ok ? '✓ ' : '✕ '}{pwMsg.text}
                  </div>
                )}
                <button onClick={changePassword} disabled={pwSaving || !pwForm.current || !pwForm.next} className="pv-btn pv-btn-navy pv-btn-sm" style={{ alignSelf: 'flex-start' }}>
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
