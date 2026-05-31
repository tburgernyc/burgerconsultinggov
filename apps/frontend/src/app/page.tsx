import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Burger Consulting LLC — Federal Facilities Services',
  description: 'SBA-registered small business delivering professional facilities support, janitorial, and landscaping services to U.S. federal agencies. NAICS 561210, 561720, 561730.',
};

const cageCode = process.env.CAGE_CODE || 'PENDING';

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '6rem 0 5rem', overflow: 'hidden' }}>
        {/* Background image overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1555448248-2571daf6344b?auto=format&fit=crop&w=1920&q=60"
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            priority
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,17,31,0.93) 0%, rgba(10,22,40,0.88) 60%, rgba(19,34,56,0.80) 100%)' }} />
        </div>
        {/* Subtle grid overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg,#C9A84C 0,#C9A84C 1px,transparent 1px,transparent 80px),repeating-linear-gradient(90deg,#C9A84C 0,#C9A84C 1px,transparent 1px,transparent 80px)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '0.3rem 0.875rem', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.25rem' }}>
            SBA Small Business · Federally Registered
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '1rem', maxWidth: 720 }}>
            Federal IT Services,<br />Built and Managed by Engineers.
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.72)', maxWidth: 580, lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Burger Consulting LLC delivers custom software development, IT project management, and systems design to U.S. government agencies — Section 508 compliant, remotely delivered, and fully FAR compliant.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/vendor-portal" className="btn btn-primary btn-lg">Partner With Us</Link>
            <Link href="/capabilities" className="btn btn-outline btn-lg">View Capabilities</Link>
          </div>

          {/* Credential Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '4rem', maxWidth: 860 }}>
            {[
              { label: 'Entity', value: 'Burger Consulting LLC' },
              { label: 'EIN', value: '84-3113166' },
              { label: 'NY DOS ID', value: '5624755' },
              { label: 'CAGE Code', value: cageCode },
              { label: 'SBA Status', value: 'Small Business' },
              { label: 'SAM.gov', value: 'Registered' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Services ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>Core Service Lines</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>
              What We Deliver
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: 540, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Three federally registered IT service lines. All delivered remotely by vetted specialists under firm-fixed-price contracts with full FAR compliance.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {services.map(svc => (
              <div key={svc.naics} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(10,22,40,0.08)', border: '1px solid #E4EAF6', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 220, position: 'relative', background: 'var(--navy)' }}>
                  <Image src={svc.image} alt={svc.title} fill style={{ objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,17,31,0.7) 0%, transparent 60%)' }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1.25rem' }}>
                    <span style={{ background: 'var(--gold)', color: 'var(--navy)', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 4, letterSpacing: '0.06em' }}>
                      NAICS {svc.naics}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '1.5rem', background: '#fff', flex: 1 }}>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.2rem', color: 'var(--navy)', marginBottom: '0.625rem', fontWeight: 400 }}>{svc.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1rem' }}>{svc.desc}</p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {svc.bullets.map(b => (
                      <li key={b} style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 800, marginTop: '0.05rem', flexShrink: 0 }}>—</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Approach ── */}
      <section className="section" style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>Why Choose Us</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: '#fff', fontWeight: 400, marginBottom: '0.75rem' }}>
              Built for Federal Execution
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Our operating model is designed around the requirements of federal contracting — transparent, compliant, and accountable at every stage.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {approach.map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '1.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.125rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 4 12 14.01 9 11.01"/><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  </svg>
                </div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', fontWeight: 400, marginBottom: '0.4rem', color: '#fff' }}>{item.title}</div>
                <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Partner Section ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.875rem' }}>Subcontractor Partners</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '1rem' }}>
              Grow Your Business with Federal Contracts
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.75, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              We connect qualified subcontractors with federal agency opportunities they couldn&apos;t access alone. As the prime contractor, we handle all federal compliance and billing — you focus on delivering great service.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {partnerBenefits.map(b => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                  <span style={{ color: '#059669', fontWeight: 800, fontSize: '1rem', flexShrink: 0, marginTop: '0.05rem' }}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <Link href="/vendor-portal" className="btn btn-primary" style={{ marginRight: '0.75rem' }}>Apply as Subcontractor</Link>
            <Link href="/contact" className="btn btn-outline">Contact Us</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
              <Image
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80"
                alt="Professional business partnership"
                width={700}
                height={520}
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>
            {/* Credential badge overlay */}
            <div style={{ position: 'absolute', bottom: '-1.5rem', left: '-1.5rem', background: 'var(--navy)', borderRadius: 12, padding: '1.125rem 1.5rem', boxShadow: '0 8px 32px rgba(10,22,40,0.2)' }}>
              <div style={{ color: 'var(--gold)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Payment Terms</div>
              <div style={{ color: '#fff', fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem' }}>Net-30 Guarantee</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginTop: '0.2rem' }}>From agency payment receipt</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section" style={{ background: 'var(--light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>The Process</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>
              Simple. Compliant. Reliable.
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}>
              Whether you&apos;re a government agency or a subcontractor, here&apos;s how an engagement with Burger Consulting LLC works.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0', background: '#fff', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(10,22,40,0.05)' }}>
            {howItWorks.map((step, i) => (
              <div key={step.title} style={{ padding: '2rem 1.5rem', borderRight: i < howItWorks.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', color: 'var(--navy)', opacity: 0.06, position: 'absolute', top: '1rem', right: '1.25rem', lineHeight: 1 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {step.icon}
                  </svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', marginBottom: '0.4rem', fontFamily: "'DM Sans', sans-serif" }}>{step.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/services" className="btn btn-outline">Learn More About Our Services</Link>
          </div>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <section style={{ background: 'var(--light)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              Registered &amp; Verified
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {trustItems.map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '0.2rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section" style={{ background: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>
            Ready to Work Together?
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 500, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Whether you&apos;re a contracting officer looking for a qualified prime, or a subcontractor ready to execute federal work — we&apos;re ready.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/contact" className="btn btn-navy btn-lg">Contact Procurement</Link>
            <Link href="/capabilities" className="btn btn-outline btn-lg">View Capabilities</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const services = [
  {
    naics: '541511',
    title: 'Custom Software & Web Development',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80',
    desc: 'Federal-grade software development and web application delivery. UI/UX design, frontend engineering, and Section 508 accessibility compliance for government digital services.',
    bullets: [
      'Web application development (React, Next.js, TypeScript)',
      'UI/UX design and prototyping for federal audiences',
      'Section 508 / WCAG 2.2 AA accessibility compliance',
      'Legacy system modernization and migration',
    ],
  },
  {
    naics: '541519',
    title: 'IT Services & Project Management',
    image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=600&q=80',
    desc: 'End-to-end IT project management, technical consulting, and IT support services. We manage timelines, deliverables, and subcontractor teams so agencies receive consistent, documented results.',
    bullets: [
      'IT project management (Agile / Scrum delivery)',
      'Technical consulting and requirements analysis',
      'IT helpdesk and user support services',
      'Data management and reporting services',
    ],
  },
  {
    naics: '541512',
    title: 'Systems Design & IT Infrastructure',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    desc: 'Systems architecture, cloud platform configuration, and IT infrastructure design for federal agencies. From design through deployment — delivered remotely, documented thoroughly.',
    bullets: [
      'System architecture and technical design',
      'Cloud platform configuration (AWS GovCloud, Azure Government)',
      'Network and infrastructure planning',
      'Security controls aligned to NIST SP 800-53',
    ],
  },
];

const approach = [
  { title: 'FAR & Section 508 Compliant', desc: 'Full Federal Acquisition Regulation compliance including Section 508 accessibility requirements on every digital deliverable — a technical standard that narrows competition.' },
  { title: 'Remote-First Delivery', desc: 'All IT work is delivered remotely using Agile methodology with biweekly agency check-ins, GitHub version control, and milestone-based acceptance criteria.' },
  { title: 'Dedicated IT Project Management', desc: 'Timothy J. Burger personally oversees every engagement — reviewing code, tracking milestones, managing subcontractors, and communicating with agency CORs.' },
  { title: 'Net-30 Subcontractor Payment', desc: 'Developer and IT subcontractor payments released within 30 days of confirmed agency receipt — transparent, contractually committed, and always on time.' },
];

const howItWorks = [
  { title: 'Solicitation Review', desc: 'We identify and evaluate federal solicitations across our NAICS service areas.', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></> },
  { title: 'Proposal Submitted', desc: 'A fully compliant, competitively priced proposal is submitted before the deadline.', icon: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
  { title: 'Vendor Sourced', desc: 'Qualified subcontractors are selected and issued RFQs matched to their capabilities.', icon: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></> },
  { title: 'Work Executed', desc: 'The awarded subcontractor delivers services per the statement of work.', icon: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></> },
  { title: 'Invoiced & Paid', desc: 'Agency is invoiced monthly. Subcontractor receives payment within 30 days of agency receipt.', icon: <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></> },
];

const partnerBenefits = [
  'Federal IT contract opportunities matched to your tech stack and skills',
  'We handle all federal compliance, billing, and administration — you write the code',
  'Digital quote submission, milestone tracking, and payment management via our portal',
  'Payment within 30 days of agency receipt — transparent, reliable, every time',
  'Section 508 compliance support — we help your deliverables meet federal accessibility standards',
];

const trustItems = [
  { label: 'SBA Status', value: 'Small Business Entity' },
  { label: 'SAM.gov', value: 'Registered' },
  { label: 'Contract Type', value: 'Firm Fixed Price' },
  { label: 'Primary NAICS', value: '561210' },
  { label: 'Set-Asides', value: 'SB Eligible' },
  { label: 'Jurisdiction', value: 'New York State' },
];
