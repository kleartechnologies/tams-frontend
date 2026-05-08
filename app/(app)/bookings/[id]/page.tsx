'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Traveler {
  id: string;
  fullName: string;
  travelerType: 'ADULT' | 'CHILD';
  icNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  phone: string | null;
  roomType: string | null;
  seatNumber: string | null;
}

interface Payment {
  id: string;
  amount: string;
  paymentType: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  referenceNumber: string | null;
  receiptNumber: string | null;
  notes: string | null;
}

interface BookingDetail {
  id: string;
  bookingNumber: string | null;
  status: string;
  bookingDate: string;
  departureDate: string | null;
  specialRequests: string | null;
  subtotal: string;
  sstRate: number;
  sstAmount: string;
  totalAmount: string;
  totalPaid: string;
  balanceDue: string;
  createdAt: string;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    icNumber: string | null;
    passportNumber: string | null;
    nationality: string;
  };
  package: {
    id: string;
    name: string;
    type: string;
    destination: string;
    days: number;
    nights: number;
    adultPrice: string;
    childPrice: string;
    isSSTApplicable: boolean;
    sstRate: number;
  };
  travelers: Traveler[];
  payments: Payment[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOOKING_STATUSES = ['INQUIRY', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
const PAYMENT_METHODS  = ['CASH', 'BANK_TRANSFER', 'ONLINE_BANKING', 'CREDIT_CARD', 'CHEQUE'];
const PAYMENT_TYPES    = ['DEPOSIT', 'INSTALMENT', 'FULL_PAYMENT', 'REFUND'];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INQUIRY:   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400' },
  QUOTED:    { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400' },
  CONFIRMED: { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400' },
  COMPLETED: { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  FAILED:   'bg-red-50 text-red-700',
};

// ── Document opener (fetches via API so auth header is attached) ───────────────

async function openDocument(path: string) {
  // Open the window synchronously (inside the click handler) so browsers
  // don't treat it as a popup. Writing content happens after the fetch.
  const win = window.open('', '_blank');
  if (!win) {
    alert('Popups are blocked. Please allow popups for this site and try again.');
    return;
  }
  try {
    const res = await api.get<string>(path, { responseType: 'text' });
    win.document.open();
    win.document.write(res.data);
    win.document.close();
  } catch {
    win.close();
    alert('Failed to load document. Please try again.');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: string | number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(Number(n));
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value ?? '—'}</dd>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: 'red' | 'green';
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent === 'red' ? 'text-red-600' : accent === 'green' ? 'text-emerald-600' : 'text-gray-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
      {message}
    </p>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

function invoiceStatus(totalPaid: string | number, totalAmount: string | number): {
  label: string; bg: string; text: string; dot: string;
} {
  const paid   = Number(totalPaid);
  const total  = Number(totalAmount);
  if (total > 0 && paid >= total) return { label: 'Fully Paid',     bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (paid > 0)                   return { label: 'Partially Paid', bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400'  };
  return                                 { label: 'Unpaid',         bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400'    };
}

function deriveInvoiceNumber(bookingNumber: string | null, bookingId: string): string {
  const base = bookingNumber ?? bookingId.slice(0, 8).toUpperCase();
  return base.startsWith('BKG-') ? base.replace(/^BKG-/, 'INV-') : `INV-${base}`;
}

function InvoiceCard({ booking }: { booking: BookingDetail }) {
  const status    = invoiceStatus(booking.totalPaid, booking.totalAmount);
  const invNumber = deriveInvoiceNumber(booking.bookingNumber, booking.id);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Invoice</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {invNumber} &middot; Booking {booking.bookingNumber ?? booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openDocument(`/bookings/${booking.id}/invoice`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            View Invoice
          </button>
          <button
            onClick={() => openDocument(`/bookings/${booking.id}/invoice`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            Download PDF
          </button>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Invoice No.</p>
            <p className="text-sm font-semibold text-gray-900 font-mono">{invNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Invoice Total</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(booking.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Amount Paid</p>
            <p className="text-sm font-semibold text-emerald-600">{fmt(booking.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Status</p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </div>
        {Number(booking.balanceDue) > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Balance due: <strong className="font-semibold">{fmt(booking.balanceDue)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Add payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: 'DEPOSIT',
    paymentMethod: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    receiptNumber: '',
    notes: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const fetchBooking = useCallback(() => {
    setLoading(true);
    api.get<BookingDetail>(`/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch(() => setError('Failed to load booking.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [router, fetchBooking]);

  // Escape key to close any open modal
  useEffect(() => {
    if (!showStatusModal && !showPaymentModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowStatusModal(false);
        setShowPaymentModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showStatusModal, showPaymentModal]);

  function openStatusModal() {
    setNewStatus(booking?.status ?? 'INQUIRY');
    setStatusError('');
    setShowStatusModal(true);
  }

  async function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusError('');
    setStatusSubmitting(true);
    try {
      await api.patch(`/bookings/${id}`, { status: newStatus });
      setShowStatusModal(false);
      toast.success('Booking status updated.');
      fetchBooking();
    } catch (err: any) {
      setStatusError(err.response?.data?.message ?? 'Failed to update status.');
    } finally {
      setStatusSubmitting(false);
    }
  }

  function openPaymentModal() {
    setPaymentForm({
      amount: '',
      paymentType: 'DEPOSIT',
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      receiptNumber: '',
      notes: '',
    });
    setPaymentError('');
    setShowPaymentModal(true);
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError('');
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return setPaymentError('Enter a valid amount.');
    setPaymentSubmitting(true);
    try {
      await api.post(`/bookings/${id}/payments`, {
        amount,
        paymentType: paymentForm.paymentType,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
        receiptNumber: paymentForm.receiptNumber.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      });
      setShowPaymentModal(false);
      toast.success('Payment recorded successfully.');
      fetchBooking();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message ?? 'Failed to record payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading booking...</div>;
  }

  if (error || !booking) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500 mb-4">{error || 'Booking not found.'}</p>
        <Link href="/bookings" className="text-sm text-blue-600 hover:underline">← Back to Bookings</Link>
      </div>
    );
  }

  const balanceNum = Number(booking.balanceDue);
  const paidPct = Number(booking.totalAmount) > 0
    ? Math.min(100, Math.round((Number(booking.totalPaid) / Number(booking.totalAmount)) * 100))
    : 0;

  return (
    <>
      <div className="max-w-5xl space-y-6">

        {/* Breadcrumb + actions */}
        <div className="flex flex-col gap-3">
          <Link href="/bookings" className="text-sm text-gray-400 hover:text-gray-600 transition-colors self-start">
            ← Bookings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 font-mono break-all">
                  {booking.bookingNumber ?? booking.id.slice(0, 8).toUpperCase()}
                </h1>
                <StatusPill status={booking.status} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Created {fmtDateTime(booking.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openDocument(`/bookings/${booking.id}/pdf`)}
                className="text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                PDF
              </button>
              <button
                onClick={openStatusModal}
                className="text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Edit Status
              </button>
              <button
                onClick={openPaymentModal}
                className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Add Payment
              </button>
            </div>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Subtotal" value={fmt(booking.subtotal)} />
          <SummaryCard label="Total" value={fmt(booking.totalAmount)}
            sub={booking.sstRate > 0 ? `incl. SST ${booking.sstRate}%` : undefined}
          />
          <SummaryCard
            label="Total Paid"
            value={fmt(booking.totalPaid)}
            sub={`${paidPct}% paid`}
            accent="green"
          />
          <SummaryCard
            label="Balance Due"
            value={fmt(booking.balanceDue)}
            accent={balanceNum > 0 ? 'red' : undefined}
            sub={balanceNum === 0 ? 'Fully paid' : undefined}
          />
        </div>

        {/* Price breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Price Breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(booking.subtotal)}</span>
            </div>
            {booking.sstRate > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>SST ({booking.sstRate}%)</span>
                <span>+{fmt(booking.sstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{fmt(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>Paid</span>
              <span>{fmt(booking.totalPaid)}</span>
            </div>
            <div className={`flex justify-between font-semibold pt-2 border-t border-gray-100 ${balanceNum > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              <span>Balance Due</span>
              <span>{fmt(booking.balanceDue)}</span>
            </div>
          </div>
        </div>

        {/* Payment progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Payment progress</span>
            <span>{paidPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>

        {/* Customer + Package */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Customer</h2>
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="Name" value={
                <Link href={`/customers/${booking.customer.id}`} className="text-blue-600 hover:underline font-medium">
                  {booking.customer.fullName}
                </Link>
              } />
              <InfoRow label="Phone" value={booking.customer.phone} />
              <InfoRow label="IC Number" value={booking.customer.icNumber} />
              <InfoRow label="Passport" value={booking.customer.passportNumber} />
              <InfoRow label="Email" value={booking.customer.email} />
              <InfoRow label="Nationality" value={booking.customer.nationality} />
            </dl>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Package</h2>
            <dl className="grid grid-cols-2 gap-3">
              <InfoRow label="Name" value={
                <Link href={`/packages/${booking.package.id}`} className="text-blue-600 hover:underline font-medium">
                  {booking.package.name}
                </Link>
              } />
              <InfoRow label="Type" value={booking.package.type.replace('_', ' ')} />
              <InfoRow label="Destination" value={booking.package.destination} />
              <InfoRow label="Duration" value={`${booking.package.days}D / ${booking.package.nights}N`} />
              <InfoRow label="Departure" value={fmtDate(booking.departureDate)} />
              <InfoRow label="Adult / Child" value={`${fmt(booking.package.adultPrice)} / ${fmt(booking.package.childPrice)}`} />
              {booking.package.isSSTApplicable && (
                <InfoRow label="SST" value={`${booking.package.sstRate}% applicable`} />
              )}
            </dl>
          </div>
        </div>

        {/* Special requests */}
        {booking.specialRequests && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Special Requests</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.specialRequests}</p>
          </div>
        )}

        {/* Travelers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Travelers <span className="text-gray-400 font-normal">({booking.travelers.length})</span>
            </h2>
          </div>
          {booking.travelers.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No travelers added yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Name</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Type</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">IC / Passport</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Nationality</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Room</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Seat</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.travelers.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-900">{t.fullName}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.travelerType === 'ADULT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {t.travelerType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{t.icNumber ?? t.passportNumber ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{t.nationality ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{t.roomType ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600">{t.seatNumber ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Payments <span className="text-gray-400 font-normal">({booking.payments.length})</span>
            </h2>
            <button
              onClick={openPaymentModal}
              className="text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Add Payment
            </button>
          </div>
          {booking.payments.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Date</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Type</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Method</th>
                    <th className="text-right px-5 py-2.5 font-semibold text-gray-500 text-xs">Amount</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Status</th>
                    <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                      <td className="px-5 py-3 text-gray-700">{p.paymentType.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-gray-600">{p.paymentMethod.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{fmt(p.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{p.referenceNumber ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoice */}
        <InvoiceCard booking={booking} />

      </div>

      {/* Edit Status Modal */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowStatusModal(false); }}
        >
          <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {statusError && <FormError message={statusError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={statusSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                  {statusSubmitting ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
        >
          <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Payment</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Balance due: <span className="font-medium text-red-600">{fmt(booking.balanceDue)}</span>
              </p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (MYR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={paymentForm.paymentType}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
                  <input
                    type="text"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    placeholder="IBG1234..."
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt No.</label>
                  <input
                    type="text"
                    value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                    placeholder="RCP-001"
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {paymentError && <FormError message={paymentError} />}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={paymentSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                  {paymentSubmitting ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
