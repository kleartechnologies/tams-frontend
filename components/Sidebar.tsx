'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import {
  IconDashboard, IconCustomers, IconPackages,
  IconBookings, IconReports, IconCollapse, IconSettings, IconPayments,
} from './icons';
import { useBranding } from './BrandingContext';
import api from '@/lib/api';
import PlanBanner from './PlanBanner';
import UpgradeModal from './UpgradeModal';

// ── Nav structure ─────────────────────────────────────────────────────────────

const NAV_WORKSPACE = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'customers', href: '/customers', label: 'Customers', Icon: IconCustomers },
  { id: 'bookings',  href: '/bookings',  label: 'Bookings',  Icon: IconBookings  },
  { id: 'payments',  href: '/payments',  label: 'Payments',  Icon: IconPayments  },
  { id: 'packages',  href: '/packages',  label: 'Packages',  Icon: IconPackages  },
];

const NAV_ANALYTICS = [
  { id: 'reports', href: '/reports', label: 'Reports', Icon: IconReports },
];

const NAV_SETTINGS = [
  { id: 'settings', href: '/settings', label: 'Settings', Icon: IconSettings },
  { id: 'team',     href: '/settings/team', label: 'Team', Icon: Users },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

interface NavItemProps {
  id: string;
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({ id, href, label, Icon, active, collapsed, badge }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        className={`sb-item${active ? ' is-active' : ''}`}
        title={collapsed ? label : undefined}
      >
        <span className="sb-item-icon" style={{ position: 'relative' }}>
          <Icon size={17} />
          {/* Collapsed badge dot */}
          {id === 'payments' && badge !== undefined && badge > 0 && collapsed && (
            <span style={{
              position: 'absolute', top: -4, right: -5,
              minWidth: 14, height: 14, borderRadius: 7,
              background: '#e11d48', color: 'white',
              fontSize: 9, fontWeight: 700, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="sb-item-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            {label}
            {id === 'payments' && badge !== undefined && badge > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#e11d48', color: 'white',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', flexShrink: 0,
              }}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname      = usePathname();
  const { branding }  = useBranding();
  const [pendingCount, setPendingCount]   = useState<number>(0);
  const [showUpgrade, setShowUpgrade]     = useState(false);

  useEffect(() => {
    api.get<{ total: number }>('/payments', { params: { status: 'PENDING', limit: 1 } })
      .then((res) => setPendingCount(res.data.total ?? 0))
      .catch(() => {});
  }, [pathname]);

  function isActive(href: string) {
    if (href === '/settings' && pathname === '/settings') return true;
    if (href === '/settings/team' && pathname.startsWith('/settings/team')) return true;
    if (href !== '/settings' && href !== '/settings/team') {
      return pathname.split('/')[1] === href.split('/')[1];
    }
    return false;
  }

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />

      <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>

        {/* ── Brand ── */}
        <div className="sb-brand">
          <div className="sb-logo" aria-hidden="true">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.agencyName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {branding.agencyName.slice(0, 2).toUpperCase() || 'TM'}
              </span>
            )}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="sb-brand-name">{branding.agencyName}</div>
              <div className="sb-brand-sub">{branding.agencyTag}</div>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="sb-nav" aria-label="Primary">
          <ul>
            {/* Workspace group */}
            {!collapsed && <li><p className="sb-section-label">Workspace</p></li>}

            {NAV_WORKSPACE.map(item => (
              <NavItem
                key={item.id}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
                badge={item.id === 'payments' ? pendingCount : undefined}
              />
            ))}

            {/* Analytics group */}
            {!collapsed && <li><p className="sb-section-label">Analytics</p></li>}
            {collapsed && <li style={{ height: 10 }} />}

            {NAV_ANALYTICS.map(item => (
              <NavItem
                key={item.id}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}

            {/* Settings group */}
            {!collapsed && <li><p className="sb-section-label">Settings</p></li>}
            {collapsed && <li style={{ height: 10 }} />}

            {NAV_SETTINGS.map(item => (
              <NavItem
                key={item.id}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </ul>
        </nav>

        {/* ── Footer ── */}
        <div className="sb-foot">

          {/* Plan banner */}
          <div style={{ marginBottom: 10 }}>
            <PlanBanner onUpgradeClick={() => setShowUpgrade(true)} collapsed={collapsed} />
          </div>

          {/* Agency card */}
          {!collapsed ? (
            <Link href="/profile" className="sb-agency-card">
              <div className="sb-agency-avatar">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span>{branding.agencyName.slice(0, 2).toUpperCase() || 'TM'}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="sb-agency-name">{branding.agencyName}</p>
                <p className="sb-agency-link">View profile</p>
              </div>
            </Link>
          ) : (
            <Link href="/profile" className="sb-agency-avatar sb-agency-avatar--collapsed" title="View profile">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span>{branding.agencyName.slice(0, 2).toUpperCase() || 'TM'}</span>
              )}
            </Link>
          )}

          <button
            className="sb-collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <IconCollapse size={16} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

      </aside>
    </>
  );
}
