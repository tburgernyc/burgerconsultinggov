import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Services — Burger Consulting LLC',
  description: 'Federal IT services — custom software development, IT project management, systems design, and Section 508 accessibility compliance. NAICS 541511, 541519, 541512.',
};

export default function ServicesPage() {
  return (
    <>
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '5rem 0 4rem', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1920&q=50" alt="" fill style={{ objectFit: 'cover', objectPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,31,0.87)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '0.3rem 0.875rem', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.25rem' }}>Federal IT Service Lines</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '1rem', maxWidth: 640 }}>
            IT Services Built for the Federal Government
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.68)', maxWidth: 540, lineHeight: 1.75 }}>
            Three NAICS-registered IT service lines. Delivered remotely by vetted specialists. Section 508 compliant. FAR compliant. Managed by an engineer.
          </p>
        </div>
      </section>

      {/* Nav Pills */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', gap: '0.5rem', padding: '0.875rem 1.5rem', overflowX: 'auto' }}>
          {serviceNav.map(s => (
            <a key={s.href} href={s.href} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', borderRadius: 999, border: '1.5px solid var(--border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif', background: '#fff'" }}>
              <span style={{ fontSize: '0.65rem', background: 'var(--navy)', color: 'var(--gold)', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 700 }}>{s.naics}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Services */}
      {services.map((svc, i) => (
        <section key={svc.naics} id={svc.id} className="section" style={{ background: i % 2 === 0 ? '#fff' : 'var(--light)', scrollMarginTop: '100px' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '1fr 480px' : '480px 1fr', gap: '4rem', alignItems: 'center' }}>
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.125rem' }}>
                  <span style={{ background: 'var(--navy)', color: 'var(--gold)', fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: 4, letterSpacing: '0.06em' }}>NAICS {svc.naics}</span>
                  <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '1rem', lineHeight: 1.2 }}>{svc.title}</h2>
                <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '0.95rem' }}>{svc.description}</p>

                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>Scope of Services</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {svc.scope.map(s => (
                      <div key={s} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}>—</span> {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--navy)', borderRadius: 10, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)', marginBottom: '0.625rem' }}>Compliance & Standards</div>
                  {svc.compliance.map(c => (
                    <div key={c} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--gold)', flexShrink: 0 }}>·</span> {c}
                    </div>
                  ))}
                </div>

                <Link href="/contact" className="btn btn-primary btn-sm" style={{ marginRight: '0.75rem' }}>Inquire About This Service</Link>
                <Link href="/capabilities" className="btn btn-outline btn-sm">Full Capabilities</Link>
              </div>

              <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
                <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(10,22,40,0.12)' }}>
                  <Image src={svc.image} alt={svc.title} width={480} height={400} style={{ display: 'block', width: '100%', height: 'auto' }} />
                </div>
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {svc.contractTypes.map(ct => (
                    <span key={ct} style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', color: 'var(--navy)', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 999, fontFamily: "'DM Sans', sans-serif" }}>{ct}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* 508 Highlight */}
      <section className="section" style={{ background: 'var(--navy)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.875rem' }}>Our Specialty</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: '#fff', fontWeight: 400, marginBottom: '1.125rem' }}>Section 508 Accessibility Compliance</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Every federal digital product must comply with Section 508 of the Rehabilitation Act — WCAG 2.2 Level AA standards. Most small IT vendors cannot certify this. We can.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: '2rem', fontSize: '0.875rem' }}>
              We incorporate accessibility from the first line of code: semantic HTML, keyboard navigation, screen reader compatibility, color contrast ratios, and Voluntary Product Accessibility Template (VPAT) documentation on every deliverable.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['WCAG 2.2 AA', 'Section 508', 'VPAT Documentation', 'Screen Reader Testing', 'Keyboard Navigation', 'Color Contrast Audits'].map(tag => (
                <span key={tag} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif" }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <Image src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80" alt="Accessibility and digital inclusion" width={700} height={520} style={{ display: 'block', width: '100%', height: 'auto' }} />
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section" style={{ background: 'var(--light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>How We Deliver</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400 }}>From Solicitation to Accepted Deliverable</h2>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(10,22,40,0.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}>
            {process.map((step, i) => (
              <div key={step.title} style={{ padding: '2rem 1.5rem', borderRight: i < process.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', color: 'var(--navy)', opacity: 0.06, position: 'absolute', top: '1rem', right: '1.25rem', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--gold-pale)', border: '1px solid #EDD88A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--gold)' }}>{i + 1}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>{step.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>Ready to discuss your IT requirement?</h2>
          <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7 }}>Send us a solicitation number or a project brief — we respond within one business day.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact" className="btn btn-navy btn-lg">Contact Procurement</Link>
            <Link href="/capabilities" className="btn btn-outline btn-lg">Download Capabilities</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const serviceNav = [
  { naics: '541511', label: 'Software Development', href: '#software-dev' },
  { naics: '541519', label: 'IT Services & PM', href: '#it-services' },
  { naics: '541512', label: 'Systems Design', href: '#systems-design' },
];

const services = [
  {
    id: 'software-dev', naics: '541511', title: 'Custom Software & Web Development',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80',
    description: 'Modern, accessible federal web applications and software delivered using current frameworks and engineering best practices. Every deliverable includes Section 508 accessibility compliance, thorough documentation, and acceptance-tested quality. Our principal is a working engineer — code quality is not an abstraction.',
    scope: ['Web application development (React, Next.js)', 'UI/UX design and wireframing', 'Section 508 accessibility audits & remediation', 'REST API development & integration', 'Database design and optimization', 'Progressive Web App (PWA) development', 'Legacy system modernization', 'Automated testing and QA'],
    compliance: ['Section 508 / WCAG 2.2 Level AA', 'FAR 39.2 — IT Acquisitions', 'FISMA — Federal Information Security', 'NIST SP 800-53 Security Controls', 'VPAT (Voluntary Product Accessibility Template) documentation'],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'Time & Materials (T&M)', 'IDIQ Task Orders', 'Small Business Set-Aside'],
  },
  {
    id: 'it-services', naics: '541519', title: 'IT Services & Project Management',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=800&q=80',
    description: 'End-to-end IT project management, technical consulting, and support services. We bring structured Agile delivery to federal IT programs — biweekly sprints, weekly status reports, documented decisions, and clear deliverable acceptance criteria. Agencies know exactly where the project stands at every moment.',
    scope: ['Agile / Scrum IT project management', 'Requirements gathering and analysis', 'Technical documentation and SOPs', 'IT helpdesk and user support (Tier 1/2)', 'Data analysis and reporting dashboards', 'Process improvement consulting', 'Change management support', 'Training material development'],
    compliance: ['FAR Parts 9, 19, 52', 'OMB IT management circulars', 'Agency-specific CPIC requirements', 'Section 508 for all deliverable documentation', 'Federal Records Act compliance'],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'IDIQ', 'BPA', 'Small Business Set-Aside'],
  },
  {
    id: 'systems-design', naics: '541512', title: 'Systems Design & IT Infrastructure',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    description: 'Technical architecture and IT infrastructure design for federal agencies. From cloud migration planning to network architecture documentation, we deliver thorough design artifacts aligned to federal security frameworks — all documented to FedRAMP, FISMA, and NIST SP 800-53 standards.',
    scope: ['Enterprise system architecture design', 'Cloud migration planning (AWS GovCloud, Azure Gov)', 'Network infrastructure design', 'Security architecture (Zero Trust, NIST 800-53)', 'Database architecture and ERD documentation', 'DevSecOps pipeline design', 'System integration planning', 'Disaster recovery and continuity planning'],
    compliance: ['NIST SP 800-53 Rev 5 Security Controls', 'FedRAMP Authorization Framework', 'FISMA — Information Security Management', 'FIPS 140-2/3 Cryptographic Standards', 'Zero Trust Architecture (CISA guidance)'],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'T&M', 'IDIQ', 'Small Business Set-Aside'],
  },
];

const process = [
  { title: 'Solicitation Review', desc: 'Hermes evaluates federal IT solicitations across all three NAICS codes daily, scoring each for scope fit and competition.' },
  { title: 'Proposal Submitted', desc: 'A compliant, technically detailed proposal is developed and submitted before the agency deadline.' },
  { title: 'Developer Sourcing', desc: 'The right subcontractor is matched to the technical requirements from our vetted developer network.' },
  { title: 'Sprint Delivery', desc: 'Work begins in 2-week Agile sprints with agency checkpoints, GitHub commits, and weekly status reports.' },
  { title: 'QA & Acceptance', desc: 'Timothy reviews all deliverables for quality, accessibility compliance, and technical accuracy before submission.' },
  { title: 'Invoice & Payment', desc: 'Agency invoiced monthly or per milestone. Subcontractor paid within 30 days of agency receipt.' },
];
