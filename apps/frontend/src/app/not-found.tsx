import Link from 'next/link';

export default function NotFound() {
  return (
    <section style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--light)', padding: '4rem 1.5rem', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        {/* Large 404 */}
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(5rem, 15vw, 9rem)', color: 'var(--navy)', lineHeight: 1, opacity: 0.06, marginBottom: '-1.5rem', userSelect: 'none' }}>
          404
        </div>

        {/* Gold accent line */}
        <div style={{ width: 48, height: 3, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))', borderRadius: 2, margin: '0 auto 1.5rem' }} />

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '2rem', color: 'var(--navy)', fontWeight: 400, marginBottom: '0.875rem' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2.5rem', fontSize: '0.95rem' }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Use the links below to find what you need.
        </p>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '2rem' }}>
          {[
            { href: '/', label: 'Home', desc: 'Return to homepage' },
            { href: '/capabilities', label: 'Capabilities', desc: 'View our capabilities statement' },
            { href: '/services', label: 'Services', desc: 'Explore our service lines' },
            { href: '/contact', label: 'Contact', desc: 'Reach procurement directly' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{ display: 'block', background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.125rem', textDecoration: 'none', textAlign: 'left', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
              <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.875rem', marginBottom: '0.2rem' }}>{link.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{link.desc}</div>
            </Link>
          ))}
        </div>

        <Link href="/" className="btn btn-navy btn-lg" style={{ display: 'inline-flex' }}>
          Return Home
        </Link>
      </div>
    </section>
  );
}
