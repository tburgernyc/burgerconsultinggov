'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ReactNode } from 'react';

interface PortalShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumb?: string;
  actions?: ReactNode;
}

const NAV = [
  {
    group: 'MAIN',
    items: [
      { href: '/portal/dashboard', label: 'Dashboard', icon: '▦' },
      { href: '/portal/rfq', label: 'Open RFQs', icon: '◈' },
      { href: '/portal/contracts', label: 'My Contracts', icon: '◉' },
    ],
  },
  {
    group: 'BILLING',
    items: [
      { href: '/portal/invoices', label: 'Invoices & Payments', icon: '◇' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { href: '/portal/documents', label: 'Document Vault', icon: '▣' },
      { href: '/portal/profile', label: 'Company Profile', icon: '○' },
    ],
  },
];

export function PortalShell({ children, title, subtitle, breadcrumb, actions }: PortalShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SC';

  const companyName = user?.name || 'Subcontractor';

  return (
    <div className="pv-shell">
      {/* ── Sidebar ── */}
      <aside className="pv-sidebar">
        {/* Brand */}
        <div className="pv-sidebar-brand">
          <div style={{ fontSize: '0.57rem', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800, marginBottom: '0.3rem' }}>
            Subcontractor Portal
          </div>
          <div style={{ color: 'var(--pv-gold)', fontFamily: "'DM Serif Display', serif", fontSize: '1rem', lineHeight: 1.2 }}>
            Burger Consulting LLC
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem', marginTop: '0.2rem', letterSpacing: '0.04em' }}>
            Federal Procurement PMO
          </div>
        </div>

        {/* User Card */}
        <div className="pv-sidebar-user">
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--pv-gold) 0%, var(--pv-gold-light) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pv-navy)', fontSize: '0.72rem', fontWeight: 800,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {companyName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || 'Active Partner'}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          </div>
        </div>

        {/* Nav */}
        <nav className="pv-sidebar-nav">
          {NAV.map(group => (
            <div key={group.group} className="pv-sidebar-group">
              <div className="pv-sidebar-group-label">{group.group}</div>
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`pv-sidebar-link${active ? ' active' : ''}`}
                  >
                    <span style={{ fontSize: '0.85rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="pv-sidebar-footer">
          <div className="pv-sidebar-help">
            <div style={{ fontSize: '0.62rem', color: 'var(--pv-gold)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.3rem' }}>NEED HELP?</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.45 }}>
              procurement@burgergov.com
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>
              Mon–Fri, 9am–5pm ET
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              width: '100%', padding: '0.55rem', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
              color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="pv-main">
        <div className="pv-page-header">
          {breadcrumb && (
            <div style={{ fontSize: '0.75rem', color: 'var(--pv-muted)', marginBottom: '0.375rem', fontFamily: "'DM Sans', sans-serif" }}>
              {breadcrumb}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.75rem', color: 'var(--pv-text)', fontWeight: 400, lineHeight: 1.1 }}>
                {title}
              </h1>
              {subtitle && (
                <p style={{ color: 'var(--pv-muted)', fontSize: '0.86rem', marginTop: '0.3rem', fontFamily: "'DM Sans', sans-serif" }}>
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        </div>
        <div className="pv-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
