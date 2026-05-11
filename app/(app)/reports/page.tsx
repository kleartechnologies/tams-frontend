'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { qk } from '@/lib/queries';

// Lazy-load recharts — ~142 KB gzipped, only needed on this page
const LineChart        = dynamic(() => import('recharts').then((m) => ({ default: m.LineChart })),        { ssr: false });
const Line             = dynamic(() => import('recharts').then((m) => ({ default: m.Line })),             { ssr: false });
const BarChart         = dynamic(() => import('recharts').then((m) => ({ default: m.BarChart })),         { ssr: false });
const Bar              = dynamic(() => import('recharts').then((m) => ({ default: m.Bar })),              { ssr: false });
const XAxis            = dynamic(() => import('recharts').then((m) => ({ default: m.XAxis })),            { ssr: false });
const YAxis            = dynamic(() => import('recharts').then((m) => ({ default: m.YAxis })),            { ssr: false });
const CartesianGrid    = dynamic(() => import('recharts').then((m) => ({ default: m.CartesianGrid })),    { ssr: false });
const Tooltip          = dynamic(() => import('recharts').then((m) => ({ default: m.Tooltip })),          { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => ({ default: m.ResponsiveContainer })), { ssr: false });
const Cell             = dynamic(() => import('recharts').then((m) => ({ default: m.Cell })),             { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  totalSales: number;
  salesChange: number | null;
  outstandingBalance: number;
  totalBookings: number;
  totalCustomers: number;
  totalSST: number;
  bookingsByStatus: { status: string; count: number }[];
}

interface TrendPoint { date: string; amount: number; }

interface TopPackage {
  packageId: string;
  name: string;
  bookings: number;
  revenue: number;
}

interface OutstandingBooking {
  id: string;
  status: string;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  customer: { id: string; fullName: string; phone: string };
  package: { id: string; name: string };
}

interface RecentPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentType: string;
  status: string;
  paymentDate: string;
  referenceNumber: string | null;
  booking: { customer: { fullName: string }; package: { name: string } };
}

interface ExportBooking {
  id: string;
  bookingNumber: string | null;
  status: string;
  createdAt: string;
  departureDate: string | null;
  subtotal: number;
  sstRate: number;
  sstAmount: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  customer: { fullName: string };
  package: { name: string };
}

// ── Preset types ──────────────────────────────────────────────────────────────

type Preset = 'TODAY' | 'YESTERDAY' | '7D' | '30D' | 'THIS_MONTH' | 'CUSTOM';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'TODAY',      label: 'Today'      },
  { key: 'YESTERDAY',  label: 'Yesterday'  },
  { key: '7D',         label: 'Last 7 Days'},
  { key: '30D',        label: 'Last 30 Days'},
  { key: 'THIS_MONTH', label: 'This Month' },
  { key: 'CUSTOM',     label: 'Custom'     },
];

function presetToRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = iso(now);

  if (preset === 'TODAY') return { from: today, to: today };

  if (preset === 'YESTERDAY') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    const y = iso(d);
    return { from: y, to: y };
  }

  if (preset === '7D') {
    const d = new Date(now); d.setDate(d.getDate() - 6);
    return { from: iso(d), to: today };
  }

  if (preset === '30D') {
    const d = new Date(now); d.setDate(d.getDate() - 29);
    return { from: iso(d), to: today };
  }

  if (preset === 'THIS_MONTH') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: iso(d), to: today };
  }

  // CUSTOM
  return {
    from: customFrom || today,
    to:   customTo   || today,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  INQUIRY:   '#f59e0b',
  QUOTED:    '#3b82f6',
  CONFIRMED: '#22c55e',
  CANCELLED: '#ef4444',
  COMPLETED: '#6b7280',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-gray-100 text-gray-500',
  VERIFIED: 'bg-green-100 text-green-700',
  FAILED:   'bg-red-100 text-red-600',
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer',
  ONLINE_BANKING: 'Online Banking', CREDIT_CARD: 'Credit Card', CHEQUE: 'Cheque',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMYR(v: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(v);
}

function formatMYRShort(v: number) {
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `RM ${(v / 1_000).toFixed(1)}k`;
  return `RM ${v.toFixed(0)}`;
}

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
}

function fmtShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Export helpers ─────────────────────────────────────────────────────────────

function buildRows(rows: ExportBooking[]) {
  return rows.map((b) => ({
    'Booking ID':      b.bookingNumber ?? b.id.slice(0, 8).toUpperCase(),
    'Customer':        b.customer.fullName,
    'Package':         b.package.name,
    'Departure Date':  fmtShortDate(b.departureDate),
    'Subtotal (MYR)':  b.subtotal.toFixed(2),
    'SST Rate (%)':    b.sstRate,
    'SST (MYR)':       b.sstAmount.toFixed(2),
    'Total (MYR)':     b.totalAmount.toFixed(2),
    'Paid (MYR)':      b.totalPaid.toFixed(2),
    'Balance (MYR)':   b.balanceDue.toFixed(2),
    'Status':          b.status,
    'Created Date':    fmtShortDate(b.createdAt),
  }));
}

function doExportCSV(rows: ExportBooking[], filename: string) {
  const data = buildRows(rows);
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const lines = [
    headers.join(','),
    ...data.map((r) =>
      headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function doExportExcel(rows: ExportBooking[], filename: string) {
  const XLSX = await import('xlsx');
  const data = buildRows(rows);
  const ws   = XLSX.utils.json_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, { wch: 24 }, { wch: 28 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
  XLSX.writeFile(wb, filename);
}

// ── Custom Tooltips ───────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="text-gray-500 mb-1">{formatDate(label)}</p>
      <p className="font-semibold text-blue-600">{formatMYR(payload[0].value ?? 0)}</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md text-xs">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-800">{payload[0].value} bookings</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  // ── Date filter state ──────────────────────────────────────────
  const [preset, setPreset]       = useState<Preset>('30D');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  // computed range (stable reference for fetch dependency)
  const range = presetToRange(preset, customFrom, customTo);

  // ── Export state ───────────────────────────────────────────────
  const [exporting,   setExporting]   = useState<'csv' | 'xlsx' | null>(null);

  const { from, to } = range;
  const isCustomReady = preset !== 'CUSTOM' || (!!customFrom && !!customTo);

  const { data, isLoading: loading, isError } = useQuery({
    queryKey: qk.reports(from, to),
    queryFn:  async () => {
      const qs = `from=${from}&to=${to}`;
      const [s, t, tp, out, rec] = await Promise.all([
        api.get<Summary>(`/reports/summary?${qs}`),
        api.get<TrendPoint[]>(`/reports/revenue-trend?${qs}`),
        api.get<TopPackage[]>(`/reports/top-packages?${qs}`),
        api.get<OutstandingBooking[]>('/reports/outstanding'),
        api.get<{ data: RecentPayment[] }>('/payments?limit=10&page=1'),
      ]);
      return {
        summary:     s.data,
        trend:       t.data,
        topPackages: tp.data,
        outstanding: out.data,
        recent:      rec.data.data,
      };
    },
    enabled:   isCustomReady,
    staleTime: 60_000,
  });

  const summary     = data?.summary     ?? null;
  const trend       = data?.trend       ?? [];
  const topPackages = data?.topPackages ?? [];
  const outstanding = data?.outstanding ?? [];
  const recent      = data?.recent      ?? [];
  const error       = isError ? 'Failed to load report data.' : '';

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(format);
    try {
      const r = presetToRange(preset, customFrom, customTo);
      const res = await api.get<ExportBooking[]>(`/reports/bookings?from=${r.from}&to=${r.to}`);
      const rows = res.data;
      const filename = `bookings_${r.from}_to_${r.to}`;
      if (format === 'csv') doExportCSV(rows, `${filename}.csv`);
      else                  doExportExcel(rows, `${filename}.xlsx`);
    } catch {
      alert('Export failed.');
    } finally {
      setExporting(null);
    }
  }

  function tickInterval(len: number) {
    if (len <= 14) return 0;
    if (len <= 31) return 6;
    if (len <= 92) return 13;
    return 30;
  }

  const trendInterval = tickInterval(trend.length);
  const statusData    = (summary?.bookingsByStatus ?? []).map((r) => ({ status: r.status, count: r.count }));
  const totalOutstanding = outstanding.reduce((s, r) => s + r.balanceDue, 0);
  const activeRange   = presetToRange(preset, customFrom, customTo);

  return (
    <div className="max-w-7xl space-y-6">

      {/* ── Date filter bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* Preset pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  preset === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date pickers */}
          {preset === 'CUSTOM' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Active range label */}
          <p className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {formatDate(activeRange.from)} – {formatDate(activeRange.to)}
          </p>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
            >
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={!!exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {exporting === 'xlsx' ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Sales"
          value={formatMYR(Number(summary?.totalSales ?? 0))}
          sub={
            summary?.salesChange != null
              ? `${summary.salesChange >= 0 ? '+' : ''}${summary.salesChange.toFixed(1)}% vs prev period`
              : undefined
          }
          subColor={(summary?.salesChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}
          loading={loading}
          accent="blue"
        />
        <KpiCard
          label="Total SST"
          value={formatMYR(Number(summary?.totalSST ?? 0))}
          sub="Collected in period"
          loading={loading}
          accent="orange"
        />
        <KpiCard
          label="Outstanding"
          value={formatMYR(Number(summary?.outstandingBalance ?? 0))}
          sub="Active bookings only"
          loading={loading}
          accent="red"
        />
        <KpiCard
          label="Total Bookings"
          value={String(summary?.totalBookings ?? 0)}
          sub="In selected period"
          loading={loading}
          accent="green"
        />
        <KpiCard
          label="Total Customers"
          value={String(summary?.totalCustomers ?? 0)}
          sub="All time"
          loading={loading}
          accent="purple"
        />
      </div>

      {/* ── Charts Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Revenue Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Verified payments over time</p>
            </div>
            <span className="text-xs font-semibold text-blue-600">
              {formatMYR(trend.reduce((s, d) => s + d.amount, 0))}
            </span>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm text-gray-300">Loading...</p>
            </div>
          ) : trend.every((d) => d.amount === 0) ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm text-gray-400">No verified payments in this period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  interval={trendInterval} tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={formatMYRShort} width={60}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Line
                  type="monotone" dataKey="amount"
                  stroke="#3b82f6" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bookings by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-800">Bookings by Status</h2>
            <p className="text-xs text-gray-400 mt-0.5">In selected period</p>
          </div>
          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm text-gray-300">Loading...</p>
            </div>
          ) : statusData.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm text-gray-400">No bookings.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={statusData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal vertical={false} />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => v.charAt(0) + v.slice(1).toLowerCase()}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {statusData.map((r) => (
                    <Cell key={r.status} fill={STATUS_COLORS[r.status] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Packages ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Top Packages</h2>
            <p className="text-xs text-gray-400 mt-0.5">By total booking value in period</p>
          </div>
        </div>
        {loading ? (
          <TableSkeleton cols={4} rows={3} />
        ) : topPackages.length === 0 ? (
          <EmptyTable message="No bookings in this period." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bookings</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topPackages.map((pkg, i) => (
                <tr key={pkg.packageId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-900">{pkg.name}</td>
                  <td className="px-6 py-3.5 text-right text-gray-600">{pkg.bookings}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{formatMYR(pkg.revenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={2} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                  {topPackages.reduce((s, p) => s + p.bookings, 0)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                  {formatMYR(topPackages.reduce((s, p) => s + p.revenue, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Outstanding + Recent Payments ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Outstanding Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Outstanding Payments</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {outstanding.length} booking{outstanding.length !== 1 ? 's' : ''} ·{' '}
                <span className="text-orange-500 font-medium">{formatMYR(totalOutstanding)} unpaid</span>
              </p>
            </div>
          </div>
          {loading ? (
            <TableSkeleton cols={4} rows={5} />
          ) : outstanding.length === 0 ? (
            <EmptyTable message="All bookings are settled." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((b) => {
                    const pctPaid = b.totalAmount > 0 ? (b.totalPaid / b.totalAmount) * 100 : 0;
                    const isHigh  = b.balanceDue > 5000;
                    return (
                      <tr
                        key={b.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isHigh ? 'bg-red-50/30' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/customers/${b.customer.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {b.customer.fullName}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">{b.customer.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs leading-snug max-w-[120px] truncate">
                          {b.package.name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-xs text-gray-500">{formatMYR(b.totalPaid)}</p>
                          <div className="mt-1 h-1 w-16 ml-auto bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${Math.min(100, pctPaid)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold text-sm ${isHigh ? 'text-red-600' : 'text-orange-500'}`}>
                            {formatMYR(b.balanceDue)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Recent Payments</h2>
            <p className="text-xs text-gray-400 mt-0.5">Last 10 recorded</p>
          </div>
          {loading ? (
            <TableSkeleton cols={4} rows={5} />
          ) : recent.length === 0 ? (
            <EmptyTable message="No payments recorded." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(p.paymentDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs leading-snug">{p.booking?.customer?.fullName ?? '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatMYR(Number(p.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ACCENT: Record<string, { bg: string; ring: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   ring: 'ring-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-500'   },
  orange: { bg: 'bg-orange-50', ring: 'ring-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
  red:    { bg: 'bg-red-50',    ring: 'ring-red-100',    text: 'text-red-600',    dot: 'bg-red-500'    },
  green:  { bg: 'bg-green-50',  ring: 'ring-green-100',  text: 'text-green-600',  dot: 'bg-green-500'  },
  purple: { bg: 'bg-purple-50', ring: 'ring-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
};

function KpiCard({
  label, value, sub, subColor, loading, accent,
}: {
  label: string; value: string; sub?: string;
  subColor?: string; loading?: boolean; accent: keyof typeof ACCENT;
}) {
  const a = ACCENT[accent];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${a.dot}`} />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      {loading ? (
        <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      )}
      {sub && !loading && (
        <p className={`text-xs mt-2 ${subColor ?? 'text-gray-400'}`}>{sub}</p>
      )}
    </div>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
