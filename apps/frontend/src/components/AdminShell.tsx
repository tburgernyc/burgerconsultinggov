'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AdminShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const NAV = [
  {
    group: 'COMMAND',
    items: [
      { href: '/admin', label: 'Morning Brief', icon: '◉', exact: true },
      { href: '/admin/approvals', label: 'Approval Queue', icon: '◈' },
    ],
  },
  {
    group: 'PIPELINE',
    items: [
      { href: '/admin/solicitations', label: 'Solicitations', icon: '▦' },
      { href: '/admin/proposals', label: 'AI Proposals', icon: '✦' },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      { href: '/admin/vendors', label: 'Vendor Registry', icon: '◇' },
      { href: '/admin/contracts', label: 'Active Contracts', icon: '▣' },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      { href: '/admin/financials', label: 'Financials', icon: '◆' },
      { href: '/admin/intelligence', label: 'Intelligence', icon: '○' },
    ],
  },
];

export function AdminShell({ children, title, subtitle, actions }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="pv-shell">
      {/* ── Sidebar ── */}
      <aside className="pv-sidebar">
        {/* Brand */}
        <div className="pv-sidebar-brand">
          <div style={{ fontSize: '0.57rem', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 800, marginBottom: '0.3rem' }}>
            PMO Command
          </div>
          <div style={{ color: 'var(--pv-gold)', fontFamily: "'DM Serif Display', serif", fontSize: '1rem', lineHeight: 1.2 }}>
            Burger Consulting LLC
          </div>
          <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.65rem', marginTop: '0.2rem' }}>
            Admin — Restricted Access
          </div>
        </div>

        {/* Admin badge */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #C9A84C 0%, #E8C87A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#08111F', fontSize: '0.7rem', fontWeight: 800 }}>
            TJB
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Timothy J. Burger
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>Principal / Admin</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="pv-sidebar-nav">
          {NAV.map(group => (
            <div key={group.group} className="pv-sidebar-group">
              <div className="pv-sidebar-group-label">{group.group}</div>
              {group.items.map(item => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
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
            <div style={{ fontSize: '0.62rem', color: 'var(--pv-gold)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>HERMES ENGINE</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.45 }}>
              SAM scan: 7/11/15/19h ET<br />
              AR check: 17:00 ET daily
            </div>
          </div>
          <Link href="/" style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', padding: '0.4rem' }}>
            ← Public Site
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="pv-main">
        <div className="pv-page-header">
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
            {actions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
          </div>
        </div>
        <div className="pv-page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
