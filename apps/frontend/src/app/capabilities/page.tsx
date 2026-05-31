import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Capabilities Statement — Burger Consulting LLC',
  description: 'Federal IT services capabilities statement. Custom software development, IT project management, and systems design. NAICS 541511, 541519, 541512. Small Business Entity.',
};

export default function CapabilitiesPage() {
  return (
    <>
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '4rem 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=50" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,31,0.88)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800, marginBottom: '0.75rem' }}>Capabilities Statement</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>Burger Consulting LLC</h1>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem' }}>Federal IT Services · Small Business Entity · New York, NY</div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '3rem', alignItems: 'start' }}>
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
                    {comp.services.map(s => <li key={s} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{s}</li>)}
                  </ul>
                </div>
              </div>
            ))}

            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.625rem', color: 'var(--navy)', marginBottom: '0.5rem', fontWeight: 400, marginTop: '2.5rem' }}>Our Differentiators</h2>
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

          <div style={{ position: 'sticky', top: '5rem' }}>
            <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Company Profile</h3>
              {profile.map(item => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '0.75rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Technical Expertise</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {techStack.map(t => (
                  <span key={t} style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, padding: '0.2rem 0.6rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif" }}>{t}</span>
                ))}
              </div>
            </div>

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
    naics: '541511',
    title: 'Custom Software & Web Development',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
    desc: 'End-to-end custom software and web application development for federal agencies. Delivered using modern frameworks with rigorous Section 508 accessibility compliance built into every deliverable from the first sprint.',
    services: [
      'Web application development (React, Next.js, TypeScript)',
      'UI/UX design and user research for government audiences',
      'Section 508 / WCAG 2.2 AA accessibility compliance and remediation',
      'API development and third-party system integration',
      'Mobile-responsive design and Progressive Web App (PWA) development',
      'Legacy application modernization and migration',
    ],
  },
  {
    naics: '541519',
    title: 'IT Services & Project Management',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80',
    desc: 'Comprehensive IT project management, technical consulting, and IT support services. We manage deliverables, timelines, subcontractor teams, and agency communication — delivering consistent, documented results.',
    services: [
      'Agile IT project management (Scrum, Kanban)',
      'Requirements analysis and technical documentation',
      'IT helpdesk and end-user support services',
      'Data management, analysis, and reporting',
      'IT process improvement consulting',
      'Technical writing and user documentation',
    ],
  },
  {
    naics: '541512',
    title: 'Systems Design & IT Infrastructure',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    desc: 'Enterprise systems architecture, cloud platform design, and IT infrastructure planning for federal agencies. All work aligned to FedRAMP, FISMA, and NIST SP 800-53 security standards.',
    services: [
      'System architecture and technical design documentation',
      'Cloud platform configuration (AWS GovCloud, Azure Government)',
      'Network infrastructure planning and documentation',
      'Security architecture aligned to NIST SP 800-53',
      'Database design and optimization',
      'DevSecOps pipeline implementation',
    ],
  },
];

const differentiators = [
  { icon: '♿', title: 'Section 508 Specialty', desc: 'WCAG 2.2 AA compliance is built into every deliverable from day one — a technical requirement many competitors cannot meet.' },
  { icon: '⚡', title: 'Engineer-Led PMO', desc: 'Timothy J. Burger personally reviews every technical deliverable — a distinct advantage over management-only prime contractors.' },
  { icon: '🌐', title: 'Remote-First Delivery', desc: 'All work delivered remotely with full documentation, version control (GitHub), and Agile sprint management.' },
  { icon: '📋', title: 'FAR Compliant', desc: 'Full Federal Acquisition Regulation compliance including FAR Parts 9, 19, and 52 on every engagement.' },
];

const profile = [
  { label: 'Legal Entity', value: 'BURGER CONSULTING LLC' },
  { label: 'EIN', value: '84-3113166' },
  { label: 'NY DOS ID', value: '5624755' },
  { label: 'CAGE Code', value: 'PENDING — SAM Active' },
  { label: 'SAM.gov Status', value: 'Registration in Progress' },
  { label: 'SBA Status', value: 'Small Business Entity (SBE)' },
  { label: 'Primary NAICS', value: '541511' },
  { label: 'Secondary NAICS', value: '541519, 541512' },
  { label: 'Contract Types', value: 'FFP, T&M, IDIQ' },
  { label: 'Set-Asides', value: 'SB, SDVOSB-eligible' },
  { label: 'Principal', value: 'Timothy J. Burger' },
];

const techStack = [
  'React', 'Next.js', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL',
  'AWS GovCloud', 'Azure Gov', 'WCAG 2.2 AA', 'Section 508', 'NIST 800-53',
  'REST APIs', 'Docker', 'GitHub', 'Agile/Scrum', 'Figma',
];
