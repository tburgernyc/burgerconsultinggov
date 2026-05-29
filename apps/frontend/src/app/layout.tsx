import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Burger Consulting LLC — Federal Procurement PMO',
  description: 'Federal procurement project management office. NAICS 561210, 561720, 561730. Small Business Entity.',
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
        <a href="/" className="logo">BURGER<span> CONSULTING</span></a>
        <ul className="nav-links">
          <li><a href="/capabilities">Capabilities</a></li>
          <li><a href="/vendor-portal">Vendor Portal</a></li>
          <li><a href="/contact">Contact</a></li>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>BURGER CONSULTING LLC</div>
            <div>Federal Procurement Project Management Office</div>
            <div style={{ marginTop: '0.5rem', opacity: 0.6 }}>EIN: 84-3113166 | DOS ID: 5624755</div>
          </div>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem' }}>Physical Address</div>
            <div>105 E 117th St Apt 5F</div>
            <div>New York, NY 10035</div>
            <div style={{ marginTop: '0.5rem', color: 'var(--gold)', fontWeight: 700 }}>Mailing Address</div>
            <div>PO Box 997, New York, NY 10018</div>
          </div>
          <div>
            <div style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem' }}>Contact</div>
            <div>procurement@burgergov.com</div>
            <div style={{ marginTop: '0.5rem' }}>www.burgergov.com</div>
            <div style={{ marginTop: '0.5rem', opacity: 0.6 }}>NAICS: 561210 | 561720 | 561730</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>
          © 2026 Burger Consulting LLC. All rights reserved. Small Business Entity (SBE).
        </div>
      </div>
    </footer>
  );
}
