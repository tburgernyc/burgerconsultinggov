import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Services — Burger Consulting LLC',
  description: 'Federal facilities support, janitorial services, and landscaping under NAICS 561210, 561720, and 561730. Firm-fixed-price contracts. FAR compliant. SBA small business.',
};

export default function ServicesPage() {
  return (
    <>
      {/* Header */}
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '5rem 0 4rem', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=50"
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,31,0.87)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '0.3rem 0.875rem', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.25rem' }}>
            Federal Service Lines
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '1rem', maxWidth: 640 }}>
            Professional Facilities Services for the Federal Government
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.68)', maxWidth: 540, lineHeight: 1.75 }}>
            Three NAICS-registered service lines, executed under firm-fixed-price contracts with full Federal Acquisition Regulation compliance.
          </p>
        </div>
      </section>

      {/* Nav Pills */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', gap: '0.5rem', padding: '0.875rem 1.5rem', overflowX: 'auto' }}>
          {serviceNav.map(s => (
            <a key={s.href} href={s.href} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', borderRadius: 999, border: '1.5px solid var(--border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s', background: '#fff' }}>
              <span style={{ fontSize: '0.65rem', background: 'var(--navy)', color: 'var(--gold)', padding: '0.1rem 0.4rem', borderRadius: 3, fontWeight: 700 }}>{s.naics}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* Services */}
      {services.map((svc, i) => (
        <section
          key={svc.naics}
          id={svc.id}
          className="section"
          style={{ background: i % 2 === 0 ? '#fff' : 'var(--light)', scrollMarginTop: '100px' }}
        >
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '1fr 480px' : '480px 1fr', gap: '4rem', alignItems: 'center' }}>

              {/* Text (alternates side) */}
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.125rem' }}>
                  <span style={{ background: 'var(--navy)', color: 'var(--gold)', fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: 4, letterSpacing: '0.06em' }}>
                    NAICS {svc.naics}
                  </span>
                  <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '1rem', lineHeight: 1.2 }}>
                  {svc.title}
                </h2>
                <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                  {svc.description}
                </p>

                {/* Service Lines */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', marginBottom: '0.75rem', fontFamily: "'DM Sans', sans-serif" }}>
                    Scope of Services
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {svc.scope.map(s => (
                      <div key={s} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0, marginTop: '0.05rem' }}>—</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance */}
                <div style={{ background: 'var(--navy)', borderRadius: 10, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)', marginBottom: '0.625rem' }}>Compliance Standards</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {svc.compliance.map(c => (
                      <div key={c} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '0.05rem' }}>·</span> {c}
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/contact" className="btn btn-primary btn-sm" style={{ marginRight: '0.75rem' }}>Inquire About This Service</Link>
                <Link href="/capabilities" className="btn btn-outline btn-sm">Full Capabilities</Link>
              </div>

              {/* Image */}
              <div style={{ order: i % 2 === 0 ? 1 : 0 }}>
                <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(10,22,40,0.12)', position: 'relative' }}>
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    width={480}
                    height={400}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </div>
                {/* Contract type badge */}
                <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  {svc.contractTypes.map(ct => (
                    <span key={ct} style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', color: 'var(--navy)', fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: 999, fontFamily: "'DM Sans', sans-serif" }}>
                      {ct}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Process Section */}
      <section className="section" style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>How It Works</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: '#fff', fontWeight: 400, marginBottom: '0.75rem' }}>
              From Solicitation to Delivery
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Every contract follows the same disciplined process — fully documented and compliant at each stage.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0', position: 'relative' }}>
            {process.map((step, i) => (
              <div key={step.title} style={{ padding: '2rem 1.5rem', position: 'relative', textAlign: 'center' }}>
                {i < process.length - 1 && (
                  <div style={{ position: 'absolute', top: '2.75rem', right: 0, width: '50%', height: 1, background: 'rgba(201,168,76,0.2)', display: 'none' }} />
                )}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontFamily: "'DM Serif Display', serif", fontSize: '1.25rem', color: 'var(--gold)' }}>
                  {i + 1}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>{step.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.52)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>
            Interested in Working Together?
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Send us a solicitation number or introduction — we respond to all qualified inquiries within one business day.
          </p>
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
  { naics: '561210', label: 'Facilities Support', href: '#facilities-support' },
  { naics: '561720', label: 'Janitorial Services', href: '#janitorial' },
  { naics: '561730', label: 'Landscaping', href: '#landscaping' },
];

const services = [
  {
    id: 'facilities-support',
    naics: '561210',
    title: 'Facilities Support Services',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    description: 'Comprehensive facilities management and support for federal installations. We coordinate all operational and maintenance activities — from routine upkeep to documentation and compliance reporting — ensuring your facility runs without interruption and meets every agency standard.',
    scope: [
      'Operations scheduling & coordination',
      'Preventive maintenance oversight',
      'Subcontractor coordination & QC',
      'Compliance documentation',
      'Facility inspection programs',
      'Punch-list & close-out management',
      'Emergency response coordination',
      'Property management support',
    ],
    compliance: [
      'FAR Part 46 — Quality Assurance',
      'GSA P100 Facilities Standards for the Public Buildings Service',
      'OMB Circular A-131 — Value Engineering',
      'Agency-specific performance work statements',
    ],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'IDIQ', 'BPA', 'Small Business Set-Aside'],
  },
  {
    id: 'janitorial',
    naics: '561720',
    title: 'Janitorial Services',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    description: 'Commercial-grade cleaning services for federal office buildings, courthouses, VA facilities, and military installations. Every cleaning program is tailored to agency specifications and compliant with GSA green cleaning mandates and OSHA safety standards.',
    scope: [
      'Daily, weekly & periodic cleaning',
      'GSA green product compliance',
      'Floor care & carpet maintenance',
      'Restroom sanitation programs',
      'Window & glass cleaning',
      'Emergency & deep-clean response',
      'Post-event & move-in/out cleaning',
      'Quality inspection documentation',
    ],
    compliance: [
      'GSA Green Cleaning Specifications',
      'Executive Order 13101 — Greening the Government',
      'OSHA 29 CFR 1910 — General Industry Safety',
      'EPA Safer Choice certified products preferred',
      'ISSA/CIMS quality framework alignment',
    ],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'IDIQ', 'Small Business Set-Aside'],
  },
  {
    id: 'landscaping',
    naics: '561730',
    title: 'Landscaping Services',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
    description: 'Year-round professional grounds maintenance for federal properties — from military installations and federal courthouses to office complexes and VA campuses. We maintain grounds to exacting agency standards through every season, including full snow and ice management.',
    scope: [
      'Lawn mowing, edging & trimming',
      'Snow & ice removal & treatment',
      'Seasonal plantings & bed care',
      'Mulching & soil management',
      'Irrigation monitoring & repair',
      'Tree & shrub care',
      'Athletic field maintenance',
      'Storm debris cleanup',
    ],
    compliance: [
      'EPA Pesticide Regulations — FIFRA compliance',
      'OSHA 29 CFR 1928 — Agricultural Operations',
      'Agency-specific grounds maintenance standards',
      'Federal water conservation requirements',
    ],
    contractTypes: ['Firm-Fixed-Price (FFP)', 'IDIQ', 'BPA', 'Small Business Set-Aside'],
  },
];

const process = [
  { title: 'Solicitation Review', desc: 'We identify and evaluate federal solicitations in our NAICS areas for scope, compliance, and feasibility.' },
  { title: 'Proposal Development', desc: 'A fully compliant proposal is prepared, priced, and submitted before the response deadline.' },
  { title: 'Vendor Sourcing', desc: 'Qualified subcontractors are selected and issued detailed RFQs through our digital vendor portal.' },
  { title: 'Award & Mobilization', desc: 'Upon contract award, the selected subcontractor mobilizes and performance begins per the SOW.' },
  { title: 'Billing & Payment', desc: 'Invoices are submitted to the agency monthly. Subcontractor payment follows within 30 days of agency receipt.' },
  { title: 'Close-Out', desc: 'Formal contract close-out with full documentation, performance records, and past performance references.' },
];
