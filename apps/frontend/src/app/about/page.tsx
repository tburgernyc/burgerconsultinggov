import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'About — Burger Consulting LLC',
  description: 'Burger Consulting LLC is a federally registered small business led by Timothy J. Burger. We deliver professional facilities support, janitorial, and landscaping services to U.S. government agencies.',
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '5rem 0 4rem', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1920&q=50"
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,17,31,0.95) 0%, rgba(10,22,40,0.88) 100%)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '0.3rem 0.875rem', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.25rem' }}>
            About the Company
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(2rem, 4vw, 3.25rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '1rem', maxWidth: 680 }}>
            A Federal Prime Contractor Built on Compliance, Transparency, and Reliable Execution
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.68)', maxWidth: 560, lineHeight: 1.75 }}>
            Burger Consulting LLC is a New York-based small business registered with the U.S. federal government to deliver facilities support, janitorial, and landscaping services to government agencies nationwide.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.875rem' }}>Our Mission</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '1.25rem', lineHeight: 1.2 }}>
              Connecting Federal Agencies with Qualified Service Providers
            </h2>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              Burger Consulting LLC was founded to bridge the gap between federal agencies that need reliable, professional facilities services and the qualified small businesses capable of delivering them.
            </p>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
              As a federally registered prime contractor, we absorb the complexity of federal contracting — compliance requirements, solicitation management, billing administration, and payment processing — so agencies get consistent service delivery and subcontractors get reliable federal work opportunities they couldn&apos;t access alone.
            </p>
            <p style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '0.95rem' }}>
              Every engagement is structured as a firm-fixed-price contract, ensuring predictable costs for government contracting officers and clear expectations for every party.
            </p>
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(10,22,40,0.12)' }}>
            <Image
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
              alt="Federal government building"
              width={700}
              height={520}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      {/* Principal */}
      <section className="section" style={{ background: 'var(--light)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '3.5rem', alignItems: 'start' }}>
            <div>
              <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 40px rgba(10,22,40,0.12)', marginBottom: '1.5rem', background: 'var(--navy)', aspectRatio: '4/5', position: 'relative' }}>
                <Image
                  src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=600&q=80"
                  alt="Timothy J. Burger, Principal"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
              <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                <div style={{ color: 'var(--gold)', fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', marginBottom: '0.2rem' }}>Timothy J. Burger</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif" }}>Principal · Burger Consulting LLC</div>
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
                    New York, NY<br />
                    procurement@burgergov.com
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.875rem' }}>Leadership</div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '1.25rem' }}>
                Timothy J. Burger, Principal
              </h2>
              <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                Timothy J. Burger founded Burger Consulting LLC with a clear mandate: build a federal contracting firm grounded in professional integrity, regulatory compliance, and transparent partnerships with both government agencies and subcontractors.
              </p>
              <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                Operating out of New York City, Timothy oversees all aspects of the company&apos;s operations — from solicitation review and subcontractor selection to contract performance and billing. Every vendor partnership and every federal engagement is subject to his direct review and approval, ensuring the highest standard of accountability at every level.
              </p>
              <p style={{ color: 'var(--muted)', lineHeight: 1.8, marginBottom: '2rem', fontSize: '0.95rem' }}>
                His approach to federal contracting is straightforward: respond to every solicitation with integrity, select subcontractors who meet the same standards, and pay on time — every time.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'EIN', value: '84-3113166' },
                  { label: 'Founded', value: 'New York, NY' },
                  { label: 'Designation', value: 'Small Business' },
                  { label: 'Focus', value: 'Federal Facilities' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#fff', borderRadius: 10, padding: '1rem 1.125rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif", marginBottom: '0.25rem' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{ background: 'var(--navy)', color: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>How We Operate</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: '#fff', fontWeight: 400 }}>
              Our Commitments
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {values.map(v => (
              <div key={v.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 12, padding: '2rem 1.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {v.svgPath}
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.15rem', color: 'var(--gold)', marginBottom: '0.625rem', fontWeight: 400 }}>{v.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.58)', lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work — Two Audiences */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.75rem' }}>Who We Serve</div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.25rem', color: 'var(--navy)', fontWeight: 400 }}>
              Two Audiences. One Standard.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* For Agencies */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(10,22,40,0.06)' }}>
              <div style={{ height: 200, position: 'relative' }}>
                <Image
                  src="https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=700&q=80"
                  alt="Federal agency building"
                  fill
                  style={{ objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,17,31,0.8) 0%, rgba(8,17,31,0.3) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem' }}>
                  <div style={{ color: 'var(--gold)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>For</div>
                  <div style={{ color: '#fff', fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', fontWeight: 400 }}>Contracting Officers</div>
                </div>
              </div>
              <div style={{ padding: '1.75rem' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                  We respond to federal solicitations in facilities support, janitorial, and landscaping with fully compliant proposals. Our FFP contract structure means predictable costs, no surprises, and professional delivery you can document and close.
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {agencyBenefits.map(b => (
                    <li key={b} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text)' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}>—</span> {b}
                    </li>
                  ))}
                </ul>
                <Link href="/capabilities" className="btn btn-navy btn-sm" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                  View Capabilities Statement
                </Link>
              </div>
            </div>

            {/* For Subcontractors */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(10,22,40,0.06)' }}>
              <div style={{ height: 200, position: 'relative' }}>
                <Image
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80"
                  alt="Professional business team"
                  fill
                  style={{ objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(8,17,31,0.8) 0%, rgba(8,17,31,0.3) 100%)' }} />
                <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem' }}>
                  <div style={{ color: 'var(--gold)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>For</div>
                  <div style={{ color: '#fff', fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', fontWeight: 400 }}>Subcontractors</div>
                </div>
              </div>
              <div style={{ padding: '1.75rem' }}>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                  If you run a cleaning, landscaping, or facilities business, we can connect you with federal work. We handle all the compliance, paperwork, and billing — and you receive payment within 30 days of agency receipt, every time.
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {subBenefits.map(b => (
                    <li key={b} style={{ display: 'flex', gap: '0.625rem', fontSize: '0.875rem', color: 'var(--text)' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}>—</span> {b}
                    </li>
                  ))}
                </ul>
                <Link href="/portal/register" className="btn btn-primary btn-sm" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                  Apply to Partner
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Snapshot */}
      <section style={{ background: 'var(--light)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '3rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)', marginBottom: '0.5rem' }}>Registration Status</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: 'var(--navy)', fontWeight: 400 }}>
                Federally Registered and SAM.gov Active
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {registrationItems.map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '0.25rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ background: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.75rem' }}>
            Questions? Let&apos;s Connect.
          </h2>
          <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
            Whether you&apos;re a contracting officer evaluating vendors or a business owner looking for federal opportunities — we&apos;re a direct email away.
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

const values = [
  {
    title: 'Transparency',
    desc: 'Clear pricing, predictable timelines, and honest communication — from solicitation response through final payment. No hidden fees, no surprises.',
    svgPath: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  },
  {
    title: 'Compliance',
    desc: 'Rigorous adherence to FAR, SBA regulations, and all applicable agency requirements on every contract, every time.',
    svgPath: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  },
  {
    title: 'Reliability',
    desc: 'Every commitment is honored. Every deadline respected. Every subcontractor paid on schedule. Accountability is not optional in federal contracting.',
    svgPath: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  },
  {
    title: 'Professionalism',
    desc: 'We operate with the discipline and attention to detail that federal procurement demands — in our proposals, our vendor relationships, and our documentation.',
    svgPath: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  },
];

const agencyBenefits = [
  'Firm-fixed-price contracts with no cost overruns',
  'SAM.gov registered and FAR Part 9 compliant',
  'Responsive to sources sought and pre-solicitation notices',
  'Performance documentation available upon request',
  'Small business set-aside eligible',
];

const subBenefits = [
  'Federal contract opportunities matched to your NAICS codes',
  'All federal compliance and billing handled by us',
  'Digital quote submission and status tracking',
  'Payment within 30 days of agency receipt',
  'No upfront costs or capital requirements',
];

const registrationItems = [
  { label: 'EIN', value: '84-3113166' },
  { label: 'NY DOS ID', value: '5624755' },
  { label: 'SBA Status', value: 'Small Business' },
  { label: 'SAM.gov', value: 'Registered' },
  { label: 'Primary NAICS', value: '561210' },
  { label: 'Set-Asides', value: 'SB Eligible' },
];
