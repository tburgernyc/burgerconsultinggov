import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Burger Consulting LLC — Federal IT Services',
  description: 'Burger Consulting LLC is a federally registered small business delivering custom software development, IT project management, and systems design to U.S. government agencies. NAICS 541511, 541519, 541512. New York, NY.',
  keywords: 'federal IT services, custom software development, IT project management, systems design, Section 508, small business, NAICS 541511, NAICS 541519, NAICS 541512, government contractor, New York',
  openGraph: {
    title: 'Burger Consulting LLC — Federal IT Services',
    description: 'SBA-registered small business delivering custom software development, IT project management, and systems design to federal agencies nationwide.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="site-header">
      <nav className="container">
        <Link href="/" className="logo" style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: '-0.01em' }}>
          BURGER<span> CONSULTING</span>
        </Link>
        <ul className="nav-links">
          <li><a href="/about">About</a></li>
          <li><a href="/services">Services</a></li>
          <li><a href="/capabilities">Capabilities</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/portal/register" style={{ color: 'var(--gold)' }}>Partner With Us</a></li>
          <li><a href="/portal" className="btn btn-outline btn-sm">Subcontractor Login</a></li>
        </ul>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ color: 'var(--gold)', fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', marginBottom: '0.5rem' }}>Burger Consulting LLC</div>
            <div style={{ opacity: 0.7, fontSize: '0.875rem', lineHeight: 1.6 }}>
              Federal IT services provider. Small Business Entity registered with the U.S. Small Business Administration.
            </div>
            <div style={{ marginTop: '1rem', opacity: 0.45, fontSize: '0.78rem' }}>EIN: 84-3113166 | DOS ID: 5624755</div>
          </div>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service Areas</div>
            <div style={{ opacity: 0.7, fontSize: '0.875rem', lineHeight: 1.8 }}>
              NAICS 541511 — Software Development<br />
              NAICS 541519 — IT Services &amp; PM<br />
              NAICS 541512 — Systems Design
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</div>
            <div style={{ opacity: 0.8, fontSize: '0.875rem', lineHeight: 1.8 }}>
              procurement@burgergov.com<br />
              www.burgergov.com
            </div>
            <div style={{ marginTop: '0.75rem', opacity: 0.55, fontSize: '0.8rem', lineHeight: 1.6 }}>
              Physical: 105 E 117th St Apt 5F, New York, NY 10035<br />
              Mail: PO Box 997, New York, NY 10018
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { href: '/about', label: 'About Us' },
                { href: '/services', label: 'Our Services' },
                { href: '/capabilities', label: 'Capabilities Statement' },
                { href: '/portal/register', label: 'Become a Partner' },
                { href: '/contact', label: 'Contact Procurement' },
                { href: '/portal', label: 'Subcontractor Login' },
              ].map(l => (
                <a key={l.href} href={l.href} className="footer-link">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ opacity: 0.4, fontSize: '0.78rem' }}>
            © 2026 Burger Consulting LLC. All rights reserved. Small Business Entity (SBE).
          </div>
          <div style={{ opacity: 0.4, fontSize: '0.78rem' }}>
            Registered · New York State · Federal SAM.gov
          </div>
        </div>
      </div>
    </footer>
  );
}
