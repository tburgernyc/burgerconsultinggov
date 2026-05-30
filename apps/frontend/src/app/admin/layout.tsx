import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== 'admin') redirect('/portal');
  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.9rem' }}>ADMIN PMO</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Burger Consulting LLC</div>
        </div>
        {[
          { href: '/admin', label: 'Morning Brief', icon: '☀️' },
          { href: '/admin/solicitations', label: 'Pipeline', icon: '📊' },
          { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
          { href: '/admin/vendors', label: 'Vendors', icon: '🤝' },
          { href: '/admin/contracts', label: 'Contracts', icon: '📄' },
          { href: '/admin/proposals', label: 'Proposals', icon: '✨' },
          { href: '/admin/intelligence', label: 'Intelligence', icon: '🔍' },
          { href: '/admin/financials', label: 'Financials', icon: '💰' },
        ].map(l => (
          <a key={l.href} href={l.href} className="portal-sidebar nav-item">
            <span>{l.icon}</span> {l.label}
          </a>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '1rem 1.5rem', marginTop: '2rem' }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>← Public Site</Link>
        </div>
      </aside>
      <main className="portal-main">{children}</main>
    </div>
  );
}
