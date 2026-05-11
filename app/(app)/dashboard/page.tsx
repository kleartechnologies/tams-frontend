'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { qk, fetchDashboard, fetchRevenueTrend } from '@/lib/queries';
import { motion, type Variants } from 'framer-motion';
import CountUp from 'react-countup';
import { Wallet, CalendarDays, Users2, AlertTriangle, Download, TrendingUp, TrendingDown, Clock, Lightbulb } from 'lucide-react';
import {
  IconArrowUp, IconArrowDown, IconBookings,
  IconCustomers, IconPackages, IconChevron, IconPlus,
} from '@/components/icons';

import type { RevPoint } from '@/components/RevenueChart';

const RevenueChart = dynamic(() => import('@/components/RevenueChart'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 4px' }}>
      {[60, 85, 45, 90, 70, 100, 55].map((h, i) => (
        <div key={i} className="skeleton" style={{ flex: 1, height: `${h}%`, borderRadius: 6 }} />
      ))}
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  totalSales: number;
  salesChange: number | null;
  outstandingBalance: number;
  totalBookings: number;
  totalCustomers: number;
}

interface UpcomingBooking {
  id: string;
  departureDate: string;
  customer: { id: string; fullName: string };
  package: { id: string; name: string; destination: string };
}

interface OutstandingBooking {
  id: string;
  status: string;
  balanceDue: number;
  customer: { id: string; fullName: string };
  package: { id: string; name: string };
}

interface RecentBooking {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  customer: { id: string; fullName: string };
  package: { id: string; name: string; type: string };
}

interface TrendPoint  { date: string; amount: number }
interface TopPackage  { packageId: string; name: string; bookings: number; revenue: number }
interface BookingExport {
  id: string; bookingNumber: string | null; status: string;
  createdAt: string; departureDate: string | null;
  totalAmount: number; totalPaid: number; balanceDue: number;
  customer: { fullName: string };
  package: { name: string };
}

type RangeKey = 'today' | '7d' | '30d';

const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  '7d':  '7 Days',
  '30d': '30 Days',
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_TONES: Record<string, { bg: string; fg: string; dot: string }> = {
  INQUIRY:   { bg: 'rgba(202,138,4,.12)', fg: '#92610a', dot: '#d59316' },
  CONFIRMED: { bg: 'rgba(37,99,235,.10)', fg: '#1d4ed8', dot: '#2563eb' },
  CANCELLED: { bg: 'rgba(225,29,72,.10)', fg: '#9f1239', dot: '#e11d48' },
  COMPLETED: { bg: 'rgba(71,85,105,.10)', fg: '#334155', dot: '#64748b' },
  Upcoming:  { bg: 'rgba(71,85,105,.10)', fg: '#334155', dot: '#64748b' },
};

const STATUS_LABELS: Record<string, string> = {
  INQUIRY:   'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('en-US'); }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return { day, mon };
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return `${Math.abs(diff)}d ago`;
  return `in ${diff} days`;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getRangeDates(r: RangeKey): { from: string; to: string } {
  const now = new Date();
  const to = isoDate(now);
  if (r === 'today') return { from: to, to };
  const from = new Date(now);
  from.setDate(from.getDate() - (r === '7d' ? 6 : 29));
  return { from: isoDate(from), to };
}

function chartFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  return isoDate(d);
}

function aggregateMonthly(points: TrendPoint[]): RevPoint[] {
  const byMonth: Record<string, number> = {};
  for (const p of points) {
    const key = p.date.slice(0, 7);
    byMonth[key] = (byMonth[key] ?? 0) + p.amount;
  }
  return Object.entries(byMonth).map(([key, revenue]) => ({
    month: new Date(key + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue,
  }));
}

function escapeCsvCell(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Derive a first name from an email address as a last-resort fallback.
// "amirulaidi@gmail.com" → "Amirulaidi", "john.doe@co.com" → "John"
function nameFromEmail(email: string): string {
  const local = email.split('@')[0].split(/[._\-]/)[0].replace(/\d+$/, '');
  if (!local) return '';
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

// ── Animation variants ────────────────────────────────────────────────────────

const EASE_OUT = [0, 0, 0.2, 1] as [number, number, number, number];

const kpiRowVariants: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const kpiCardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 14 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.35, ease: EASE_OUT, delay },
});

// ── Insights ─────────────────────────────────────────────────────────────────

interface Insight {
  text: string;
  tone: 'positive' | 'warning' | 'neutral';
}

function computeInsights(
  summary: Summary | null,
  topPackages: TopPackage[],
  range: RangeKey,
): Insight[] {
  if (!summary) return [];
  const period = RANGE_LABELS[range].toLowerCase();
  const out: Insight[] = [];

  // Revenue change
  if (summary.salesChange !== null) {
    const pct = Math.abs(summary.salesChange).toFixed(0);
    if (summary.salesChange >= 10) {
      out.push({ tone: 'positive', text: `Revenue is up ${pct}% vs the previous period — strong growth momentum.` });
    } else if (summary.salesChange > 0) {
      out.push({ tone: 'positive', text: `Revenue trending up ${pct}% vs last period. Keep the pipeline moving.` });
    } else {
      out.push({ tone: 'warning', text: `Revenue is down ${pct}% vs last period. Review recent cancellations and pending conversions.` });
    }
  }

  // Outstanding balance
  if (summary.outstandingBalance > 0) {
    out.push({ tone: 'warning', text: `RM ${fmt(Math.round(summary.outstandingBalance))} in outstanding payments — follow up to strengthen cash flow.` });
  } else {
    out.push({ tone: 'positive', text: `No outstanding balance this period — collections are fully on track.` });
  }

  // Booking volume
  if (summary.totalBookings === 0) {
    out.push({ tone: 'neutral', text: `No bookings recorded ${period}. A targeted promotion could help drive reservations.` });
  } else if (summary.totalBookings < 5) {
    out.push({ tone: 'neutral', text: `${summary.totalBookings} booking${summary.totalBookings !== 1 ? 's' : ''} recorded ${period}. Volume is low — consider a limited-time offer.` });
  } else {
    out.push({ tone: 'positive', text: `${summary.totalBookings} bookings recorded ${period} — solid activity for the period.` });
  }

  // Top package
  if (topPackages[0]) {
    const p = topPackages[0];
    out.push({ tone: 'positive', text: `Top performer: "${p.name}" — ${p.bookings} booking${p.bookings !== 1 ? 's' : ''} generating RM ${(p.revenue / 1000).toFixed(0)}k this period.` });
  }

  return out.slice(0, 4);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusPill = memo(function StatusPill({ status }: { status: string }) {
  const t = STATUS_TONES[status] ?? STATUS_TONES.Upcoming;
  return (
    <span className="pill" style={{ background: t.bg, color: t.fg }}>
      <i className="pill-dot" style={{ background: t.dot }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
});

const KpiCard = memo(function KpiCard({ label, prefix, value, delta, loading, icon, iconColor }: {
  label: string; prefix: string; value: number;
  delta: number | null; loading: boolean;
  icon: React.ReactNode; iconColor: string;
}) {
  const up = delta !== null && delta >= 0;
  return (
    <motion.div
      className="kpi"
      style={{ borderTopColor: `${iconColor}44`, borderTopWidth: 2 }}
      variants={kpiCardVariants}
      whileHover={{
        y: -4,
        boxShadow: '0 14px 32px rgba(15,23,42,.09), 0 4px 10px rgba(15,23,42,.05)',
        transition: { type: 'spring', stiffness: 380, damping: 26 },
      }}
    >
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon-badge" style={{ background: `${iconColor}18`, color: iconColor }}>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="kpi-value">
          <span className="skeleton" style={{ width: 110, height: 30, display: 'block', borderRadius: 6 }} />
        </div>
      ) : (
        <>
          <div className="kpi-value">
            {prefix && <span className="kpi-prefix">{prefix}</span>}
            <span className="kpi-num">
              <CountUp end={value} duration={1.1} separator="," decimals={0} />
            </span>
          </div>
          {delta !== null && (
            <div className={`kpi-delta ${up ? 'up' : 'down'}`}>
              {up ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />}
              {Math.abs(delta).toFixed(1)}%
              <span className="kpi-delta-sub">vs last period</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
});

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange]   = useState<RangeKey>('30d');
  const rangeRef            = useRef<RangeKey>('30d');
  rangeRef.current          = range;

  const [exporting, setExporting] = useState(false);
  const [filter, setFilter]       = useState('All');

  const queryClient = useQueryClient();

  // ── Greeting ────────────────────────────────────────────────────────────────

  const [greeting, setGreeting] = useState('Dashboard');
  const [userName, setUserName] = useState('');
  const [dateStr, setDateStr]   = useState('');

  useEffect(() => {
    const now = new Date();
    setGreeting(getGreeting(now.getHours()));
    setDateStr(now.toLocaleDateString('en-MY', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }));

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const meta = user.user_metadata as Record<string, string> | undefined;
      const fullName = meta?.full_name || meta?.name || '';
      const first = fullName.split(' ')[0] || nameFromEmail(user.email ?? '');
      if (first) setUserName(first);
    });
  }, []);

  // ── Data fetching via React Query ───────────────────────────────────────────

  const { from, to } = getRangeDates(range);
  const trendFrom    = chartFromDate();

  const { data, isLoading: loading } = useQuery({
    queryKey: qk.dashboard(from, to),
    queryFn:  () => fetchDashboard(from, to),
    staleTime: 30_000,
  });

  const { data: rawTrend } = useQuery({
    queryKey: ['revenueTrend', trendFrom],
    queryFn:  () => fetchRevenueTrend(trendFrom),
    staleTime: 5 * 60_000,
  });

  // Derive typed slices from the combined response
  const summary: Summary | null      = data?.summary ?? null;
  const upcoming: UpcomingBooking[]  = (data?.upcoming?.bookings ?? []).slice(0, 5);
  const outstanding: OutstandingBooking[] = (data?.outstanding ?? []).slice(0, 5);
  const recent: RecentBooking[]      = data?.recentBookings ?? [];
  const topPackages: TopPackage[]    = (data?.topPackages ?? []).slice(0, 5);
  const revenueTrend: RevPoint[]     = rawTrend ? aggregateMonthly(rawTrend) : [];

  // ── Realtime: invalidate React Query cache on DB changes ────────────────────

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout>;

    const channel = supabase
      .channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }, 600);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }, 600);
      })
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ── Export CSV ──────────────────────────────────────────────────────────────

  const exportCSV = useCallback(async () => {
    setExporting(true);
    const { from: f, to: t } = getRangeDates(rangeRef.current);
    try {
      const res = await api.get<BookingExport[]>(`/reports/bookings?from=${f}&to=${t}`);
      const rows = res.data;
      if (!rows.length) return;

      const headers = ['Booking #', 'Customer', 'Package', 'Status', 'Total (RM)', 'Paid (RM)', 'Balance (RM)', 'Created'];
      const lines = rows.map(r => [
        r.bookingNumber ?? r.id.slice(0, 8),
        r.customer.fullName,
        r.package.name,
        STATUS_LABELS[r.status] ?? r.status,
        r.totalAmount.toFixed(2),
        r.totalPaid.toFixed(2),
        r.balanceDue.toFixed(2),
        new Date(r.createdAt).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }),
      ].map(escapeCsvCell).join(','));

      const csv = [headers.join(','), ...lines].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookings-${f}-to-${t}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[exportCSV]', err);
    } finally {
      setExporting(false);
    }
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────

  const FILTERS = ['All', 'CONFIRMED', 'INQUIRY', 'COMPLETED', 'CANCELLED'];
  const filteredRecent    = filter === 'All' ? recent : recent.filter(r => r.status === filter);
  const totalOutstanding  = outstanding.reduce((s, b) => s + b.balanceDue, 0);
  const avgBookingValue   = summary && summary.totalBookings > 0
    ? summary.totalSales / summary.totalBookings
    : 0;
  const bestPackage = topPackages[0]?.name ?? null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">
            {greeting}{userName ? `, ${userName}` : ''}
            {greeting !== 'Dashboard' && (
              <span className="dash-wave" aria-hidden="true">👋</span>
            )}
          </h1>
          <p className="dash-sub">
            {dateStr
              ? <><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{dateStr}</>
              : 'Here’s what’s happening with your agency today.'
            }
          </p>
        </div>
        <div className="dash-header-actions">
          {/* Date range toggle */}
          <div className="seg" style={{ flexShrink: 0 }}>
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map(r => (
              <button
                key={r}
                className={`seg-btn${range === r ? ' is-on' : ''}`}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          {/* Export */}
          <button className="btn-ghost" onClick={exportCSV} disabled={exporting} style={{ gap: 6, flexShrink: 0 }}>
            <Download size={13} />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          {/* New Booking — hidden on mobile (FAB takes over) */}
          <Link href="/bookings/create" className="btn-primary" style={{ flexShrink: 0 }}>
            <IconPlus size={14} /> New Booking
          </Link>
        </div>
      </div>

      {/* KPI Row — staggered entrance */}
      <motion.div className="kpi-row" variants={kpiRowVariants} initial="hidden" animate="show">
        <KpiCard label="Total Revenue"   prefix="RM" value={summary?.totalSales ?? 0}         delta={summary?.salesChange ?? null} loading={loading} icon={<Wallet size={15} />}        iconColor="#2563eb" />
        <KpiCard label="Total Bookings"  prefix=""   value={summary?.totalBookings ?? 0}       delta={null}                         loading={loading} icon={<CalendarDays size={15} />}  iconColor="#7c3aed" />
        <KpiCard label="Outstanding"     prefix="RM" value={summary?.outstandingBalance ?? 0}  delta={null}                         loading={loading} icon={<AlertTriangle size={15} />} iconColor="#e11d48" />
        <KpiCard label="Total Customers" prefix=""   value={summary?.totalCustomers ?? 0}      delta={null}                         loading={loading} icon={<Users2 size={15} />}        iconColor="#16a34a" />
      </motion.div>

      {/* Insights panel */}
      <motion.div {...fadeUp(0.15)} className="insights-panel">
        <div className="insights-panel-head">
          <Lightbulb size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <h3 className="insights-panel-title">Insights</h3>
          <span className="insights-panel-meta">
            Based on {RANGE_LABELS[range].toLowerCase()} · Avg booking RM {loading ? '—' : fmt(Math.round(avgBookingValue))}
          </span>
        </div>
        {loading ? (
          <div className="insights-list">
            {[80, 65, 90, 55].map((w, i) => (
              <div key={i} className="insight-row">
                <span className="skeleton" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                <span className="skeleton" style={{ width: `${w}%`, height: 13, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="insights-list">
            {computeInsights(summary, topPackages, range).map((ins, i) => (
              <div key={i} className={`insight-row insight-tone-${ins.tone}`}>
                <span className={`insight-badge insight-badge--${ins.tone}`}>
                  {ins.tone === 'positive' ? <TrendingUp size={13} />
                    : ins.tone === 'warning' ? <AlertTriangle size={13} />
                    : <Lightbulb size={13} />}
                </span>
                <p className="insight-text">{ins.text}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link href="/bookings/create" className="qa is-accent">
          <span className="qa-icon"><IconBookings size={18} /></span>
          <span className="qa-text">
            <span className="qa-label"><IconPlus size={13} /> New Booking</span>
            <span className="qa-sub">Create a reservation</span>
          </span>
          <IconChevron size={16} style={{ color: 'var(--ink-5)' }} />
        </Link>
        <Link href="/customers" className="qa">
          <span className="qa-icon"><IconCustomers size={18} /></span>
          <span className="qa-text">
            <span className="qa-label"><IconPlus size={13} /> Add Customer</span>
            <span className="qa-sub">Register a new traveller</span>
          </span>
          <IconChevron size={16} style={{ color: 'var(--ink-5)' }} />
        </Link>
        <Link href="/packages" className="qa">
          <span className="qa-icon"><IconPackages size={18} /></span>
          <span className="qa-text">
            <span className="qa-label"><IconPlus size={13} /> Add Package</span>
            <span className="qa-sub">List a new tour offer</span>
          </span>
          <IconChevron size={16} style={{ color: 'var(--ink-5)' }} />
        </Link>
      </div>

      {/* Revenue Trend + Top Packages */}
      <motion.div {...fadeUp(0.1)} className="grid-chart">
        <div className="card">
          <header className="card-head">
            <div>
              <h3>Revenue Trend</h3>
              <p>Verified payments — 6-month view</p>
            </div>
          </header>
          <RevenueChart data={revenueTrend} loading={loading} />
        </div>

        <div className="card">
          <header className="card-head">
            <div>
              <h3>Top Packages</h3>
              <p>By revenue — {RANGE_LABELS[range].toLowerCase()}</p>
            </div>
          </header>
          {loading ? (
            <div className="dest-list">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="dest-item">
                  <span className="skeleton" style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0 }} />
                  <div className="dest-main">
                    <div className="skeleton" style={{ width: '70%', height: 13, borderRadius: 4, marginBottom: 5 }} />
                    <div className="skeleton" style={{ width: '40%', height: 11, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : topPackages.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)', paddingTop: 12 }}>No booking data for this period.</p>
          ) : (() => {
            const maxRev = Math.max(...topPackages.map(p => p.revenue), 1);
            return (
              <div className="dest-list">
                {topPackages.map((p, i) => (
                  <div key={p.packageId} className="dest-item">
                    <span className="dest-rank">{i + 1}</span>
                    <div className="dest-main">
                      <div className="dest-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                      <div className="dest-count">{p.bookings} booking{p.bookings !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="dest-bar-wrap">
                      <div className="dest-bar-track">
                        <div className="dest-bar-fill" style={{ width: `${(p.revenue / maxRev) * 100}%` }} />
                      </div>
                      <div className="dest-pct">RM {(p.revenue / 1000).toFixed(0)}k</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Ops Grid */}
      <div className="grid-ops">
        <section className="card">
          <header className="card-head">
            <div>
              <h3>Upcoming Departures</h3>
              <p>{upcoming.length} trips coming up</p>
            </div>
            <Link href="/bookings" className="link-btn">View all <IconChevron size={14} /></Link>
          </header>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading…</p>
          ) : upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>No upcoming departures.</p>
          ) : (
            <ul className="list">
              {upcoming.map((b) => {
                const { day, mon } = fmtDate(b.departureDate);
                return (
                  <li key={b.id} className="list-row">
                    <div className="date-tile">
                      <span className="date-tile-d">{day}</span>
                      <span className="date-tile-m">{mon}</span>
                    </div>
                    <div className="list-main">
                      <div className="list-strong">{b.customer.fullName}</div>
                      <div className="list-sub">
                        {b.package.name}
                        {b.package.destination && (
                          <> <span className="sep">·</span> {b.package.destination}</>
                        )}
                      </div>
                    </div>
                    <div className="list-right">
                      <span className="soft-pill">{daysUntil(b.departureDate)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <div>
              <h3>Pending Payments</h3>
              <p>RM {fmt(Math.round(totalOutstanding))} outstanding · {outstanding.length} bookings</p>
            </div>
            <Link href="/reports" className="link-btn">View all <IconChevron size={14} /></Link>
          </header>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Loading…</p>
          ) : outstanding.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>No outstanding balances.</p>
          ) : (
            <ul className="list">
              {outstanding.map((b) => (
                <li key={b.id} className="list-row">
                  <span className="avatar sm">{initials(b.customer.fullName)}</span>
                  <div className="list-main">
                    <div className="list-strong">{b.customer.fullName}</div>
                    <div className="list-sub">{b.package.name}</div>
                  </div>
                  <div className="list-right col">
                    <span className="amount mono">RM {fmt(Math.round(b.balanceDue))}</span>
                    <StatusPill status={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Recent Bookings */}
      <section className="card table-card">
        <header className="card-head">
          <div>
            <h3>Recent Bookings</h3>
            <p>{filteredRecent.length} of {recent.length} shown</p>
          </div>
          <div className="seg">
            {FILTERS.map(f => (
              <button key={f} className={`seg-btn${filter === f ? ' is-on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'All' ? 'All' : STATUS_LABELS[f] ?? f}
              </button>
            ))}
          </div>
        </header>
        <div className="tbl">
          <div className="tr th">
            <div>Customer</div><div>Package</div><div>Status</div>
            <div className="ta-right">Amount (RM)</div><div className="ta-right">Date</div>
          </div>
          {loading ? (
            <div style={{ padding: '24px 6px', fontSize: 13, color: 'var(--ink-4)' }}>Loading…</div>
          ) : filteredRecent.length === 0 ? (
            <div style={{ padding: '24px 6px', fontSize: 13, color: 'var(--ink-4)' }}>No bookings found.</div>
          ) : (
            filteredRecent.map((r) => (
              <Link href={`/customers/${r.customer.id}`} key={r.id} className="tr" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="cell-cust">
                  <span className="avatar sm">{initials(r.customer.fullName)}</span>
                  <div>
                    <div className="cell-strong">{r.customer.fullName}</div>
                    <div className="cell-sub">{r.id.slice(0, 8)}…</div>
                  </div>
                </div>
                <div>
                  <div className="cell-strong">{r.package.name}</div>
                  <div className="cell-sub">{r.package.type}</div>
                </div>
                <div><StatusPill status={r.status} /></div>
                <div className="ta-right mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                  {fmt(Math.round(r.totalAmount))}
                </div>
                <div className="ta-right cell-sub">
                  {new Date(r.createdAt).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
