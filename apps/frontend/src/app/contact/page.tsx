export const metadata = { title: 'Contact — Burger Consulting LLC' };

export default function ContactPage() {
  return (
    <>
      <section style={{ background: 'var(--navy)', color: 'var(--white)', padding: '3rem 0' }}>
        <div className="container">
          <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Get In Touch</div>
          <h1 style={{ fontSize: '2rem' }}>Contact Procurement</h1>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div>
            <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Physical Address</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Use for all federal forms: SF-1449, SAM.gov, proposal covers</p>
              <div style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                105 E 117th St Apt 5F<br />
                New York, NY 10035
              </div>
            </div>
            <div className="card card-navy">
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Mailing Address</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Use for all correspondence</p>
              <div style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 600, marginTop: '0.75rem', lineHeight: 1.7 }}>
                PO Box 997<br />
                New York, NY 10018
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Email</h3>
              <a href="mailto:procurement@burgergov.com" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1rem' }}>
                procurement@burgergov.com
              </a>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                For solicitation inquiries, teaming proposals, and subcontractor partnerships.
              </p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Web</h3>
              <a href="https://www.burgergov.com" style={{ color: 'var(--gold)', fontWeight: 700 }}>www.burgergov.com</a>
            </div>

            <div className="card" style={{ background: 'var(--navy)', color: 'var(--white)', marginTop: '1.5rem' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Are you a subcontractor?</h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginBottom: '1rem' }}>
                Apply through our vendor portal to receive RFQs and manage your engagement digitally.
              </p>
              <a href="/vendor-portal" className="btn btn-primary btn-sm">Apply as Vendor</a>
            </div>
          </div>

          <div>
            <div className="card card-gold">
              <h3 style={{ color: 'var(--navy)', marginBottom: '1rem' }}>Important Address Notice</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--navy)' }}>Federal Forms (SF-1449, SAM.gov, Proposals):</strong> Always use the physical address at 105 E 117th St Apt 5F, New York, NY 10035.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6, marginTop: '0.75rem' }}>
                <strong style={{ color: 'var(--navy)' }}>Correspondence & Mail:</strong> PO Box 997, New York, NY 10018.
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem' }}>
                NEVER combine or swap these addresses on federal submissions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
