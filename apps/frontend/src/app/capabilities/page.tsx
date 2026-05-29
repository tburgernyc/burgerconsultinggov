export const metadata = {
  title: 'Capabilities Statement — Burger Consulting LLC',
  description: 'Full capabilities statement for Burger Consulting LLC federal contracting.',
};

export default function CapabilitiesPage() {
  return (
    <>
      <section style={{ background: 'var(--navy)', color: 'var(--white)', padding: '3rem 0' }}>
        <div className="container">
          <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Capabilities Statement</div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>BURGER CONSULTING LLC</h1>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>Federal Procurement Project Management Office</div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '1rem' }}>Core Competencies</h2>
            <div className="section-divider"></div>

            {coreCompetencies.map((comp) => (
              <div key={comp.naics} className="card card-gold" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>NAICS {comp.naics}</span>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', margin: '0.25rem 0' }}>{comp.title}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{comp.desc}</p>
                  </div>
                </div>
                <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {comp.services.map((s) => (
                    <li key={s} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}

            <h2 style={{ fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '1rem', marginTop: '2rem' }}>Differentiators</h2>
            <div className="section-divider"></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {differentiators.map((d) => (
                <div key={d.title} className="card">
                  <div style={{ color: 'var(--gold)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>{d.icon}</div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', marginBottom: '0.25rem' }}>{d.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card card-navy" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem', fontSize: '1rem' }}>Company Profile</h3>
              {profile.map((item) => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: 'var(--navy)', color: 'var(--white)', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '1rem', fontSize: '1rem' }}>Past Performance</h3>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                Performance history available upon request. References from contracting officers provided
                for all past federal engagements.
              </p>
            </div>

            <div className="card">
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '1rem' }}>Contact Procurement</h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.5rem' }}>procurement@burgergov.com</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>105 E 117th St Apt 5F</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>New York, NY 10035</div>
              <a href="/contact" className="btn btn-primary btn-sm">Contact Us</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const coreCompetencies = [
  {
    naics: '561210',
    title: 'Facilities Support Services',
    desc: 'Full-spectrum facilities support and management for federal installations under Firm-Fixed-Price contracts.',
    services: ['Operations coordination and scheduling', 'Building maintenance oversight', 'Vendor coordination and quality control', 'Compliance documentation management'],
  },
  {
    naics: '561720',
    title: 'Janitorial Services',
    desc: 'Commercial and federal-grade cleaning services adhering to GSA green cleaning standards.',
    services: ['Daily, weekly, and periodic cleaning', 'Green cleaning product compliance', 'OSHA-compliant protocols', 'Quality control inspections'],
  },
  {
    naics: '561730',
    title: 'Landscaping Services',
    desc: 'Professional grounds maintenance for federal properties year-round.',
    services: ['Lawn maintenance and mowing', 'Snow and ice removal', 'Seasonal planting and mulching', 'Irrigation system management'],
  },
];

const differentiators = [
  { icon: '⚡', title: 'Zero-Float Operations', desc: 'No upfront capital required. FFP contracts only — cash flow neutral for the government.' },
  { icon: '🤖', title: 'AI-Powered PMO', desc: 'Hermes cognitive engine screens every solicitation before bid decision.' },
  { icon: '📋', title: 'FAR Compliance', desc: 'Full compliance with FAR Parts 9, 19, 52, and applicable service contract clauses.' },
  { icon: '💼', title: 'SBA Certified', desc: 'Small Business Entity designation. Set-aside eligible for small business set-asides.' },
];

const profile = [
  { label: 'Legal Entity', value: 'BURGER CONSULTING LLC' },
  { label: 'EIN', value: '84-3113166' },
  { label: 'NY DOS ID', value: '5624755' },
  { label: 'CAGE Code', value: 'PENDING — SAM Active' },
  { label: 'SAM Status', value: 'Registration in Progress' },
  { label: 'SBA Status', value: 'Small Business Entity (SBE)' },
  { label: 'Primary NAICS', value: '561210' },
  { label: 'Secondary NAICS', value: '561720, 561730' },
  { label: 'Contract Types', value: 'FFP, IDIQ, BPA' },
  { label: 'Set-Asides', value: 'SB, SDVOSB-eligible' },
  { label: 'Principal', value: 'Timothy J. Burger' },
];
