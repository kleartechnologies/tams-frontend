'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  bookingId: string;
  amount: string;
  paymentType: string;
  paymentMethod: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  paymentDate: string;
  referenceNumber: string | null;
  receiptNumber: string | null;
  notes: string | null;
  booking: {
    id: string;
    bookingNumber: string | null;
    customer: { fullName: string; phone: string };
    package: { name: string };
  };
}

interface PaymentsResponse {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

type Tab = 'PENDING' | 'VERIFIED' | 'FAILED' | 'ALL';
const TABS: { key: Tab; label: string }[] = [
  { key: 'PENDING',  label: 'Pending'  },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'FAILED',   label: 'Failed'   },
  { key: 'ALL',      label: 'All'      },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  FAILED:   { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400'     },
};

const LIMIT = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: string | number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(Number(n));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function humanize(s: string) {
  return s.replace(/_/g, ' ');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-2 py-2">
          <div className="skeleton h-4 rounded w-20" />
          <div className="skeleton h-4 rounded flex-1" style={{ maxWidth: `${120 + (i * 11) % 60}px` }} />
          <div className="skeleton h-4 rounded w-32" />
          <div className="skeleton h-4 rounded w-20 ml-auto" />
          <div className="skeleton h-4 rounded w-24" />
          <div className="skeleton h-4 rounded w-24" />
          <div className="skeleton h-6 rounded-full w-20" />
          <div className="skeleton h-4 rounded w-20" />
          <div className="skeleton h-7 rounded-lg w-16" />
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const router = useRouter();
  const toast = useToast();

  const [payments, setPayments]     = useState<Payment[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [activeTab, setActiveTab]   = useState<Tab>('PENDING');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [verifying, setVerifying]   = useState<string | null>(null); // payment id being verified

  const fetchPayments = useCallback(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { page, limit: LIMIT };
    if (activeTab !== 'ALL') params.status = activeTab;

    api.get<PaymentsResponse>('/payments', { params })
      .then((res) => {
        setPayments(res.data.data);
        setTotal(res.data.total);
      })
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, [page, activeTab]);

  useEffect(() => {
    fetchPayments();
  }, [router, fetchPayments]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setPage(1);
  }

  async function handleVerify(payment: Payment, e: React.MouseEvent) {
    e.stopPropagation();
    setVerifying(payment.id);
    try {
      await api.patch(`/payments/${payment.id}/verify`);
      toast.success('Payment verified successfully.');
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to verify payment.');
    } finally {
      setVerifying(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl space-y-6">

      {/* Tab filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 hidden sm:block">
          {loading ? '…' : `${total} payment${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">Booking</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Package</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">Amount</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Method</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/bookings/${p.bookingId}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {/* Booking number */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-medium text-blue-700">
                        {p.booking.bookingNumber ?? p.bookingId.slice(0, 8).toUpperCase()}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{p.booking.customer.fullName}</div>
                      <div className="text-xs text-gray-400">{p.booking.customer.phone}</div>
                    </td>

                    {/* Package */}
                    <td className="px-5 py-3.5 text-gray-700">{p.booking.package.name}</td>

                    {/* Amount */}
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {fmt(p.amount)}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{humanize(p.paymentType)}</td>

                    {/* Method */}
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{humanize(p.paymentMethod)}</td>

                    {/* Status */}
                    <td className="px-5 py-3.5"><StatusPill status={p.status} /></td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'PENDING' && (
                          <button
                            onClick={(e) => handleVerify(p, e)}
                            disabled={verifying === p.id}
                            className="text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {verifying === p.id ? 'Verifying…' : 'Verify'}
                          </button>
                        )}
                        <Link
                          href={`/bookings/${p.bookingId}`}
                          className="text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{total} payments</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
