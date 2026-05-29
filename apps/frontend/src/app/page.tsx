export default function HomePage() {
  const cageCode = process.env.CAGE_CODE || 'PENDING';
  const samStatus = process.env.SAM_STATUS || 'REGISTRATION_IN_PROGRESS';

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>BURGER CONSULTING LLC</h1>
          <div className="tagline">Federal Procurement Project Management Office</div>
          <div className="sub">
            Zero-Float B2G federal contract execution. NAICS 561210 · 561720 · 561730.
            Facilities support, janitorial services, and landscaping for federal agencies.
          </div>
          <div className="ctas">
            <a href="/vendor-portal" className="btn btn-primary btn-lg">Vendor Partnership Portal</a>
            <a href="/capabilities" className="btn btn-outline btn-lg">Download Capabilities Statement</a>
          </div>
          <div className="cred-grid">
            <div className="cred-item">
              <div className="cred-label">Legal Entity</div>
              <div className="cred-value">BURGER CONSULTING LLC</div>
            </div>
            <div className="cred-item">
              <div className="cred-label">EIN</div>
              <div className="cred-value">84-3113166</div>
            </div>
            <div className="cred-item">
              <div className="cred-label">NY DOS ID</div>
              <div className="cred-value">5624755</div>
            </div>
            <div className="cred-item">
              <div className="cred-label">CAGE Code</div>
              <div className="cred-value">{cageCode}</div>
            </div>
            <div className="cred-item">
              <div className="cred-label">SBA Status</div>
              <div className="cred-value">Small Business</div>
            </div>
            <div className="cred-item">
              <div className="cred-label">SAM.gov Status</div>
              <div className="cred-value" style={{ fontSize: '0.8rem' }}>{samStatus.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Core Capabilities</h2>
          <div className="section-divider"></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {capabilities.map((cap) => (
              <div key={cap.naics} className="card card-gold">
                <div style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  NAICS {cap.naics}
                </div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--navy)', marginBottom: '0.5rem' }}>{cap.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--navy)', color: 'var(--white)' }}>
        <div className="container">
          <h2 className="section-title" style={{ color: 'var(--gold)' }}>Zero-Float Doctrine</h2>
          <div className="section-divider"></div>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 700, lineHeight: 1.7, marginBottom: '2rem' }}>
            Burger Consulting operates under a strict Zero-Float procurement model. We reject any solicitation
            that requires upfront capital mobilization, Davis-Bacon certified payroll, security clearances,
            or billing structures incompatible with Firm-Fixed-Price execution.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {zeroFloat.map((item) => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                <div style={{ color: 'var(--gold)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <h2 className="section-title">Partner With Us</h2>
            <div className="section-divider"></div>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              We work with qualified subcontractors to execute federal facilities support contracts.
              Our Pay-When-Paid model ensures you receive payment within 30 days of agency payment receipt.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {partnerBenefits.map((b) => (
                <li key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 800 }}>✓</span> {b}
                </li>
              ))}
            </ul>
            <a href="/vendor-portal" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Apply as Subcontractor</a>
          </div>
          <div>
            <div className="card" style={{ background: 'var(--navy)', color: 'var(--white)' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Compliance Snapshot</h3>
              {compliance.map((item) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--light)', textAlign: 'center' }}>
        <div className="container">
          <h2 className="section-title">Ready to Execute</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 600, margin: '0.5rem auto 2rem', lineHeight: 1.7 }}>
            Contracting officers and subcontractors — connect with our procurement team directly.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/contact" className="btn btn-navy btn-lg">Contact Procurement</a>
            <a href="/capabilities" className="btn btn-outline btn-lg">View Full Capabilities</a>
          </div>
        </div>
      </section>
    </>
  );
}

const capabilities = [
  { naics: '561210', title: 'Facilities Support Services', desc: 'Comprehensive facilities management and support services for federal installations, including operations and maintenance coordination.' },
  { naics: '561720', title: 'Janitorial Services', desc: 'Professional commercial cleaning and janitorial services for federal buildings and facilities, compliant with federal green cleaning standards.' },
  { naics: '561730', title: 'Landscaping Services', desc: 'Full-service grounds maintenance and landscaping for federal properties, including mowing, snow removal, and seasonal services.' },
];

const zeroFloat = [
  { icon: '⚡', label: 'No Upfront Capital', desc: 'FFP execution only — no mobilization capital required' },
  { icon: '📋', label: 'FAR Compliant', desc: 'Full Federal Acquisition Regulation compliance' },
  { icon: '🏢', label: 'No Clearances Required', desc: 'NAICS codes do not require personnel clearances' },
  { icon: '💰', label: 'Net-30 Pay Cycle', desc: 'Vendor payment within 30 days of agency receipt' },
];

const partnerBenefits = [
  'Net-30 payment after agency receipt — transparent timeline',
  'Digital quote submission through the vendor portal',
  'No paper-chasing — all documents managed online',
  'Real-time contract status and invoice tracking',
  'Automated insurance expiry alerts and reminders',
];

const compliance = [
  { label: 'SBA Designation', value: 'Small Business Entity' },
  { label: 'Primary NAICS', value: '561210' },
  { label: 'SAM.gov Registration', value: 'Active' },
  { label: 'Contract Type', value: 'Firm Fixed Price' },
  { label: 'Payment Terms', value: 'Net-30 (Pay-When-Paid)' },
  { label: 'Subcontracting', value: 'Permitted' },
];
