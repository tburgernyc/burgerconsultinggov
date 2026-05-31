import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Capabilities Statement — Burger Consulting LLC',
  description: 'Capabilities statement for Burger Consulting LLC. Federal facilities services provider — NAICS 561210, 561720, 561730. Small Business Entity. New York, NY.',
};

export default function CapabilitiesPage() {
  return (
    <>
      {/* Header */}
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '4rem 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1541726260-e6b6e8e3b931?auto=format&fit=crop&w=1920&q=50"
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,31,0.88)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800, marginBottom: '0.75rem' }}>
            Capabilities Statement
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
            Burger Consulting LLC
          </h1>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem' }}>
            Federal Facilities Services · Small Business Entity · New York, NY
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '3rem', alignItems: 'start' }}>

          {/* Main Content */}
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.625rem', color: 'var(--navy)', marginBottom: '0.5rem', fontWeight: 400 }}>Core Competencies</h2>
            <div className="section-divider" />

            {coreCompetencies.map(comp => (
              <div key={comp.naics} style={{ marginBottom: '1.5rem', borderRadius: 14, overflow: 'hidden', border: '1px solid #E4EAF6', boxShadow: '0 2px 8px rgba(10,22,40,0.05)' }}>
                <div style={{ height: 180, position: 'relative' }}>
                  <Image src={comp.image} alt={comp.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,17,31,0.75) 0%, transparent 50%)' }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem' }}>
                    <span style={{ background: 'var(--gold)', color: 'var(--navy)', fontSize: '0.62rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 4, letterSpacing: '0.06em' }}>NAICS {comp.naics}</span>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', background: '#fff' }}>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.15rem', color: 'var(--navy)', marginBottom: '0.5rem', fontWeight: 400 }}>{comp.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '0.875rem' }}>{comp.desc}</p>
                  <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {comp.services.map(s => (
                      <li key={s} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {/* Differentiators */}
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.625rem', color: 'var(--navy)', marginBottom: '0.5rem', fontWeight: 400, marginTop: '2.5rem' }}>
              Our Differentiators
            </h2>
            <div className="section-divider" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {differentiators.map(d => (
                <div key={d.title} className="card">
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.625rem' }}>{d.icon}</div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--navy)', marginBottom: '0.25rem', fontFamily: "'DM Sans', sans-serif" }}>{d.title}</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.55 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: '5rem' }}>
            {/* Company Profile */}
            <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Company Profile</h3>
              {profile.map(item => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Past Performance */}
            <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '0.75rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Past Performance</h3>
              <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
                Performance history and contracting officer references available upon request for all past federal engagements.
              </p>
            </div>

            {/* Contact CTA */}
            <div className="card">
              <h3 style={{ color: 'var(--navy)', marginBottom: '0.75rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Contact Procurement</h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.4rem' }}>procurement@burgergov.com</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>105 E 117th St Apt 5F</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>New York, NY 10035</div>
              <Link href="/contact" className="btn btn-primary btn-sm">Get In Touch</Link>
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
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    desc: 'Full-spectrum facilities support and management for federal installations under firm-fixed-price contracts. We coordinate all operational and maintenance activities, ensuring continuous compliance and documentation.',
    services: [
      'Operations coordination and scheduling',
      'Building maintenance oversight and tracking',
      'Subcontractor coordination and quality control',
      'Compliance documentation and reporting',
      'Facility inspection and punch-list management',
    ],
  },
  {
    naics: '561720',
    title: 'Janitorial Services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    desc: 'Commercial-grade cleaning services for federal buildings and facilities, adhering to GSA green cleaning standards and OSHA safety protocols throughout all engagements.',
    services: [
      'Daily, weekly, and periodic cleaning programs',
      'GSA-compliant green cleaning products and methods',
      'OSHA safety protocol adherence',
      'Quality control inspections and documentation',
      'Emergency response and deep-clean capabilities',
    ],
  },
  {
    naics: '561730',
    title: 'Landscaping Services',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    desc: 'Year-round professional grounds maintenance for federal properties. From routine lawn care to seasonal snow removal, we keep federal grounds maintained to agency standards.',
    services: [
      'Lawn maintenance, mowing, and edging',
      'Snow and ice removal and treatment',
      'Seasonal planting, mulching, and bed maintenance',
      'Irrigation system monitoring and repair',
      'Tree and shrub trimming and care',
    ],
  },
];

const differentiators = [
  {
    icon: '📄',
    title: 'Firm-Fixed-Price Contracts',
    desc: 'All work is structured as FFP — predictable pricing, no cost overruns, and full budget certainty for contracting officers.',
  },
  {
    icon: '📋',
    title: 'Full FAR Compliance',
    desc: 'Rigorous compliance with FAR Parts 9, 19, 52, and all applicable service contract clauses on every engagement.',
  },
  {
    icon: '🏢',
    title: 'Dedicated Project Management',
    desc: 'An experienced project management office oversees every contract from solicitation review through final close-out and payment.',
  },
  {
    icon: '💼',
    title: 'SBA Small Business',
    desc: 'Certified Small Business Entity designation, eligible for small business set-aside opportunities across all service lines.',
  },
];

const profile = [
  { label: 'Legal Entity', value: 'BURGER CONSULTING LLC' },
  { label: 'EIN', value: '84-3113166' },
  { label: 'NY DOS ID', value: '5624755' },
  { label: 'CAGE Code', value: 'PENDING — SAM Active' },
  { label: 'SAM.gov Status', value: 'Registration in Progress' },
  { label: 'SBA Status', value: 'Small Business Entity (SBE)' },
  { label: 'Primary NAICS', value: '561210' },
  { label: 'Secondary NAICS', value: '561720, 561730' },
  { label: 'Contract Types', value: 'FFP, IDIQ, BPA' },
  { label: 'Set-Asides', value: 'SB, SDVOSB-eligible' },
  { label: 'Principal', value: 'Timothy J. Burger' },
];
