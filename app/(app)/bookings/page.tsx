'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  bookingNumber: string | null;
  status: string;
  departureDate: string | null;
  totalAmount: string;
  totalPaid: string;
  balanceDue: string;
  createdAt: string;
  customer: { id: string; fullName: string; phone: string };
  package: { id: string; name: string; type: string };
  _count: { travelers: number; payments: number };
}

interface BookingsResponse {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INQUIRY:   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  },
  QUOTED:    { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400'   },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  CANCELLED: { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400'    },
  COMPLETED: { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
};

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'ONLINE_BANKING', 'CREDIT_CARD', 'CHEQUE'];
const PAYMENT_TYPES   = ['DEPOSIT', 'INSTALMENT', 'FULL_PAYMENT', 'REFUND'];
const TABS = ['ALL', 'INQUIRY', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
type Tab = (typeof TABS)[number];

const LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: string | number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(Number(n));
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {[80, 140, 120, 80, 90, 90, 70, 70, 80].map((w, j) => (
            <td key={j} className="px-5 py-4">
              <div className="skeleton h-3.5 rounded" style={{ width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── Quick Payment Modal ───────────────────────────────────────────────────────

function QuickPaymentModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const firstRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    amount: Number(booking.balanceDue) > 0 ? String(Number(booking.balanceDue).toFixed(2)) : '',
    paymentType: 'DEPOSIT',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    firstRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking.id}/payments`, {
        amount,
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        referenceNumber: form.referenceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Failed to record payment.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  }

  const balance = Number(booking.balanceDue);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Add Payment</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {booking.customer.fullName} · {booking.package.name}
          </p>
          {balance > 0 && (
            <p className="text-xs text-red-600 font-medium mt-1">
              Balance due: {fmt(balance)}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Amount (MYR) <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstRef}
              type="number" min="0.01" step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
              <select
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Date</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Reference No.</label>
              <input
                type="text"
                value={form.referenceNumber}
                onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                placeholder="IBG1234…"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              )}
              {submitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [search, setSearch]     = useState('');
  const [payTarget, setPayTarget] = useState<Booking | null>(null);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: LIMIT };
    if (activeTab !== 'ALL') params.status = activeTab;

    api.get<BookingsResponse>('/bookings', { params })
      .then((res) => {
        setBookings(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false));
  }, [page, activeTab]);

  useEffect(() => {
    fetchBookings();
  }, [router, fetchBookings]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setPage(1);
  }

  const filtered = search.trim()
    ? bookings.filter(
        (b) =>
          b.customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
          (b.bookingNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
          b.package.name.toLowerCase().includes(search.toLowerCase()),
      )
    : bookings;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Bookings</h1>
        <div className="flex flex-1 w-full items-center gap-3">
          <input
            type="text"
            placeholder="Search name, booking no, package…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <Link
            href="/bookings/create"
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            + New Booking
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 && !loading ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">
              {search ? 'No bookings match your search.' : 'No bookings yet.'}
            </p>
            {!search && (
              <Link href="/bookings/create" className="text-xs text-blue-600 hover:underline">
                Create the first booking →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Booking</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Package</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Departure</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Total</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Balance</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">Created</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>

              {loading ? (
                <TableSkeleton />
              ) : (
                <tbody>
                  {filtered.map((b) => {
                    const hasBalance = Number(b.balanceDue) > 0;
                    const isCancelled = b.status === 'CANCELLED';
                    return (
                      <tr
                        key={b.id}
                        onClick={() => router.push(`/bookings/${b.id}`)}
                        className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                          {b.bookingNumber ?? <span className="text-gray-300 font-sans font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-900">{b.customer.fullName}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{b.customer.phone}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-gray-800">{b.package.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{b.package.type.replace(/_/g, ' ')}</div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">{fmtDate(b.departureDate)}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-gray-800 whitespace-nowrap tabular-nums">
                          {fmt(b.totalAmount)}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap tabular-nums">
                          {hasBalance ? (
                            <span className="font-semibold text-red-600">{fmt(b.balanceDue)}</span>
                          ) : (
                            <span className="text-emerald-600 font-medium text-xs">Paid</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={b.status} />
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-xs">{fmtDate(b.createdAt)}</td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {hasBalance && !isCancelled && (
                              <button
                                onClick={() => setPayTarget(b)}
                                className="text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                              >
                                + Pay
                              </button>
                            )}
                            <Link
                              href={`/bookings/${b.id}`}
                              className="text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {total} bookings
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Payment Modal */}
      {payTarget && (
        <QuickPaymentModal
          booking={payTarget}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setPayTarget(null); fetchBookings(); }}
        />
      )}

    </div>
  );
}
