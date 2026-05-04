'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import {
  IconSearch, IconBell, IconPlus,
  IconChevron, IconUser, IconSettings, IconLogout,
} from './icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchCustomer {
  id: string;
  fullName: string;
  phone: string;
  icNumber: string | null;
}

interface OutstandingBooking {
  id: string;
  bookingNumber?: string;
  status: string;
  balanceDue: number | string;
  customer: { fullName: string };
  package: { name: string };
}

interface UpcomingBooking {
  id: string;
  bookingNumber?: string;
  departureDate: string;
  customer: { fullName: string };
  package: { name: string };
  _count?: { travelers: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  packages:  'Packages',
  bookings:  'Bookings',
  payments:  'Payments',
  reports:   'Reports',
  settings:  'Settings',
  profile:   'Profile',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(Number(n));
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return 'Departed';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d away`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const router   = useRouter();
  const pathname = usePathname();

  // Avatar dropdown
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // User profile
  const [userEmail,    setUserEmail]    = useState('');
  const [userInitials, setUserInitials] = useState('?');
  const [agencyLabel,  setAgencyLabel]  = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email ?? '';
      setUserEmail(email);
      setUserInitials(email.slice(0, 2).toUpperCase());
    });
    api.get<{ agency?: { name: string }; role?: string }>('/auth/me')
      .then((res) => { if (res.data.agency?.name) setAgencyLabel(res.data.agency.name); })
      .catch(() => {});
  }, []);

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchCustomer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCursor,  setSearchCursor]  = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bell / notifications state ─────────────────────────────────────────────
  const [bellOpen,      setBellOpen]      = useState(false);
  const [outstanding,   setOutstanding]   = useState<OutstandingBooking[]>([]);
  const [upcoming,      setUpcoming]      = useState<UpcomingBooking[]>([]);
  const [notifLoading,  setNotifLoading]  = useState(false);
  const [notifFetched,  setNotifFetched]  = useState(false);
  const bellRef  = useRef<HTMLDivElement>(null);

  const segment = pathname.split('/')[1];
  const title   = NAV_LABELS[segment] || 'Dashboard';
  const notifCount = outstanding.length + upcoming.length;

  // ── Close avatar on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!avatarOpen) return;
    const h = (e: MouseEvent) => {
      if (!avatarRef.current?.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [avatarOpen]);

  // ── Close bell on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!bellOpen) return;
    const h = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [bellOpen]);

  // ── ⌘K global shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // ── Focus search input when modal opens ────────────────────────────────────
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setSearchCursor(0);
    }
  }, [searchOpen]);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchOpen) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchDebounce.current = setTimeout(() => {
      api.get<{ data: SearchCustomer[] }>('/customers', { params: { search: searchQuery, limit: 7 } })
        .then((res) => {
          setSearchResults(res.data.data ?? []);
          setSearchCursor(0);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 280);
  }, [searchQuery, searchOpen]);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(() => {
    if (notifFetched) return;
    setNotifLoading(true);
    Promise.all([
      api.get<OutstandingBooking[]>('/reports/outstanding').catch(() => ({ data: [] as OutstandingBooking[] })),
      api.get<UpcomingBooking[]>('/reports/upcoming').catch(() => ({ data: [] as UpcomingBooking[] })),
    ]).then(([o, u]) => {
      setOutstanding(Array.isArray(o.data) ? o.data.slice(0, 6) : []);
      setUpcoming(Array.isArray(u.data) ? u.data.slice(0, 4) : []);
      setNotifFetched(true);
    }).finally(() => setNotifLoading(false));
  }, [notifFetched]);

  function openSearch() {
    setSearchOpen(true);
    setBellOpen(false);
  }

  function toggleBell() {
    const next = !bellOpen;
    setBellOpen(next);
    setAvatarOpen(false);
    if (next) fetchNotifications();
  }

  function goToCustomer(id: string) {
    setSearchOpen(false);
    router.push(`/customers/${id}`);
  }

  function goToBooking(id: string) {
    setBellOpen(false);
    router.push(`/bookings/${id}`);
  }

  // ── Keyboard nav inside search ─────────────────────────────────────────────
  function handleSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchCursor((c) => Math.min(c + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' && searchResults[searchCursor]) {
      goToCustomer(searchResults[searchCursor].id);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      <header className="header">
        {/* Hamburger — mobile only */}
        <button
          className="icon-btn mobile-menu-btn"
          onClick={onMenuOpen}
          aria-label="Open navigation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="header-title">
          <h1>{title}</h1>
        </div>

        <div className="header-tools">
          {/* Search icon — mobile only (compact trigger) */}
          <button
            className="icon-btn mobile-search-btn"
            onClick={openSearch}
            aria-label="Search"
          >
            <IconSearch size={16} />
          </button>

          {/* Search bar — desktop only */}
          <button
            className="search"
            onClick={openSearch}
            aria-label="Search"
            style={{ cursor: 'text' }}
          >
            <IconSearch size={15} />
            <span style={{ flex: 1, textAlign: 'left', color: 'var(--ink-5)', fontSize: 13 }}>
              Search bookings, customers…
            </span>
            <kbd>⌘K</kbd>
          </button>

          {/* Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={toggleBell}
            >
              <IconBell size={16} />
              {notifCount > 0 && (
                <span className="notif-dot" style={{
                  background: 'var(--rose)',
                  minWidth: 16, height: 16,
                  borderRadius: 8,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'absolute', top: 5, right: 5,
                  color: 'white', padding: '0 3px',
                  lineHeight: 1,
                }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
              {notifCount === 0 && !notifFetched && <span className="notif-dot" />}
            </button>

            {bellOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 340, maxHeight: 440, overflowY: 'auto',
                background: 'var(--canvas)', border: '1px solid var(--line)',
                borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,.10)',
                zIndex: 200,
              }}>
                <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--line)' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>Notifications</p>
                </div>

                {notifLoading ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-5)', fontSize: 13 }}>
                    Loading…
                  </div>
                ) : (outstanding.length === 0 && upcoming.length === 0) ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-5)', fontSize: 13 }}>
                    No pending notifications
                  </div>
                ) : (
                  <>
                    {outstanding.length > 0 && (
                      <>
                        <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Outstanding Balance
                        </div>
                        {outstanding.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => goToBooking(b.id)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              width: '100%', padding: '10px 16px',
                              background: 'none', border: 0, cursor: 'pointer',
                              textAlign: 'left', borderBottom: '1px solid var(--line-2)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <span style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: '#fff1f3', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: 14 }}>💳</span>
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                                {b.customer.fullName}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-5)' }}>
                                {b.package.name}
                              </p>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#e11d48', flexShrink: 0 }}>
                              {fmt(b.balanceDue)}
                            </span>
                          </button>
                        ))}
                      </>
                    )}

                    {upcoming.length > 0 && (
                      <>
                        <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Upcoming Departures
                        </div>
                        {upcoming.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => goToBooking(b.id)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              width: '100%', padding: '10px 16px',
                              background: 'none', border: 0, cursor: 'pointer',
                              textAlign: 'left', borderBottom: '1px solid var(--line-2)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <span style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: 14 }}>✈️</span>
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                                {b.customer.fullName}
                              </p>
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-5)' }}>
                                {b.package.name} · {fmtDate(b.departureDate)}
                              </p>
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)',
                              background: 'var(--accent-soft)', borderRadius: 6,
                              padding: '2px 7px', flexShrink: 0, alignSelf: 'center',
                            }}>
                              {daysUntil(b.departureDate)}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}

                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)' }}>
                  <Link
                    href="/bookings"
                    onClick={() => setBellOpen(false)}
                    style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
                  >
                    View all bookings →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href="/bookings/create" className="btn-primary header-new-booking">
            <IconPlus size={15} />
            <span>New Booking</span>
          </Link>

          {/* Avatar */}
          <div className="avatar-wrap" ref={avatarRef}>
            <button className="avatar-btn" onClick={() => setAvatarOpen(v => !v)}>
              <span className="avatar">{userInitials}</span>
              <IconChevron size={14} />
            </button>
            {avatarOpen && (
              <div className="avatar-menu" role="menu">
                <div className="avatar-menu-head">
                  <span className="avatar lg">{userInitials}</span>
                  <div>
                    <div className="avatar-menu-name">{agencyLabel || 'My Agency'}</div>
                    <div className="avatar-menu-mail">{userEmail}</div>
                  </div>
                </div>
                <div className="avatar-menu-sep" />
                <Link href="/profile"  className="avatar-menu-item" onClick={() => setAvatarOpen(false)}><IconUser size={14} /> Profile</Link>
                <Link href="/settings" className="avatar-menu-item" onClick={() => setAvatarOpen(false)}><IconSettings size={14} /> Settings</Link>
                <div className="avatar-menu-sep" />
                <button className="avatar-menu-item danger" onClick={logout}>
                  <IconLogout size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Search overlay ─────────────────────────────────────────────────── */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 560,
            background: 'var(--canvas)', borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,.22)',
            overflow: 'hidden',
            margin: '0 16px',
          }}>
            {/* Search input row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '14px 16px',
              borderBottom: searchQuery ? '1px solid var(--line)' : '1px solid transparent',
            }}>
              <IconSearch size={17} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search customers by name, phone or IC…"
                style={{
                  flex: 1, border: 0, outline: 'none',
                  font: 'inherit', fontSize: 15,
                  background: 'transparent', color: 'var(--ink)',
                }}
              />
              {searchLoading && (
                <span style={{ fontSize: 12, color: 'var(--ink-5)' }}>Searching…</span>
              )}
              <kbd style={{
                font: '500 11px/1 var(--font-geist-mono), monospace',
                background: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: 5, padding: '3px 6px', color: 'var(--ink-5)',
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--ink-5)', fontSize: 13 }}>
                No customers found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}

            {searchResults.length > 0 && (
              <div>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Customers
                </div>
                {searchResults.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => goToCustomer(c.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 16px',
                      background: i === searchCursor ? 'var(--accent-soft)' : 'none',
                      border: 0, cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={() => setSearchCursor(i)}
                  >
                    <span style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {c.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                        {c.fullName}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-5)' }}>
                        {c.phone}{c.icNumber ? ` · IC ${c.icNumber}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-5)' }}>↵</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick nav links (shown when no query) */}
            {!searchQuery && (
              <div style={{ padding: '8px 0 12px' }}>
                <div style={{ padding: '4px 16px 6px', fontSize: 11, fontWeight: 600, color: 'var(--ink-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick navigate
                </div>
                {[
                  { href: '/bookings',        label: 'View all bookings',  icon: '📋' },
                  { href: '/bookings/create', label: 'New booking',        icon: '➕' },
                  { href: '/customers',       label: 'View all customers', icon: '👥' },
                  { href: '/packages',        label: 'View packages',      icon: '📦' },
                  { href: '/reports',         label: 'Reports',            icon: '📊' },
                ].map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSearchOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 16px',
                      color: 'var(--ink)', textDecoration: 'none', fontSize: 13,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{icon}</span>
                    {label}
                  </Link>
                ))}
              </div>
            )}

            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--line)',
              display: 'flex', gap: 16,
              color: 'var(--ink-5)', fontSize: 11,
            }}>
              <span><kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '1px 4px' }}>↑↓</kbd> navigate</span>
              <span><kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '1px 4px' }}>↵</kbd> open</span>
              <span><kbd style={{ fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 3, padding: '1px 4px' }}>ESC</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
