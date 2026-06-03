import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Contact — Burger Consulting LLC',
  description: 'Contact the Burger Consulting LLC procurement team for solicitation inquiries, teaming proposals, and subcontractor partnerships.',
};

export default function ContactPage() {
  return (
    <>
      {/* Header */}
      <section style={{ position: 'relative', background: 'var(--navy)', color: '#fff', padding: '4rem 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=50"
            alt=""
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,17,31,0.85)' }} />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800, marginBottom: '0.75rem' }}>
            Get In Touch
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.5rem' }}>
            Contact Procurement
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem' }}>
            Solicitation inquiries, teaming proposals, and subcontractor partnerships.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

          {/* Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.5rem' }}>
                Let&apos;s Work Together
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Our procurement team is available to discuss opportunities, answer solicitation questions, and connect qualified subcontractors with federal work.
              </p>
            </div>

            {/* Email */}
            <div className="card card-gold">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>✉️</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>Email</div>
                  <a href="mailto:procurement@burgergov.com" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}>
                    procurement@burgergov.com
                  </a>
                  <p style={{ color: 'var(--muted)', fontSize: '0.83rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                    For solicitation inquiries, teaming proposals, and subcontractor partnerships. We respond within one business day.
                  </p>
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🌐</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>Website</div>
                  <a href="https://www.burgergov.com" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>www.burgergov.com</a>
                </div>
              </div>
            </div>

            {/* Physical Address */}
            <div className="card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📍</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Physical Address</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600, lineHeight: 1.7, marginBottom: '0.25rem' }}>
                    105 E 117th St Apt 5F<br />New York, NY 10035
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    For use on all federal forms: SF-1449, SAM.gov, and proposal submissions.
                  </div>
                </div>
              </div>
            </div>

            {/* Mailing Address */}
            <div className="card">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📬</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif" }}>Mailing Address</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600, lineHeight: 1.7, marginBottom: '0.25rem' }}>
                    PO Box 997<br />New York, NY 10018
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    For all correspondence and physical mail.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Subcontractor CTA */}
            <div style={{ background: 'var(--navy)', borderRadius: 14, padding: '2rem', color: '#fff' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: '0.75rem' }}>
                For Subcontractors
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.375rem', color: '#fff', marginBottom: '0.75rem', fontWeight: 400 }}>
                Partner With Burger Consulting
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, marginBottom: '1.5rem' }}>
                Qualified subcontractors can apply to join our vendor network and begin receiving federal RFQs in their service area. Apply online and receive a response within 24 hours.
              </p>
              <Link href="/vendor-portal" className="btn btn-primary">Apply as Subcontractor</Link>
            </div>

            {/* Company Quick Reference */}
            <div className="card card-gold">
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem', fontSize: '1rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Quick Reference</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {quickRef.map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                    <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif" }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* For Contracting Officers */}
            <div className="card" style={{ borderLeft: '4px solid var(--gold)' }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem', fontFamily: "'DM Sans', sans-serif", fontSize: '0.95rem' }}>
                For Contracting Officers
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
                We are available to discuss teaming arrangements, respond to sources sought notices, and provide our capabilities statement for any open solicitation in our NAICS codes.
              </p>
              <Link href="/capabilities" className="btn btn-outline btn-sm">View Capabilities Statement</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const quickRef = [
  { label: 'EIN', value: '84-3113166' },
  { label: 'NY DOS ID', value: '5624755' },
  { label: 'SAM.gov Status', value: 'Registered' },
  { label: 'SBA Status', value: 'Small Business Entity' },
  { label: 'Primary NAICS', value: '541511' },
  { label: 'Contract Types', value: 'FFP, IDIQ, BPA' },
];
