'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface Payment {
  id: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  referenceNumber: string | null;
}

interface Booking {
  id: string;
  status: string;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  package: { name: string };
}

interface CustomerDetail {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  icNumber: string | null;
  nationality: string;
  bookings: Booking[];
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
  INQUIRY: 'bg-yellow-100 text-yellow-800',
  QUOTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-500',
  VERIFIED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-600',
};

function formatMYR(v: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(v);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const EMPTY_PAYMENT_FORM = { amount: '', paymentType: '', paymentMethod: '', paymentDate: '', referenceNumber: '', status: '' };

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // expanded booking payment panels
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // payments per booking
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [paymentsLoading, setPaymentsLoading] = useState<Record<string, boolean>>({});


  // Payment modal (create + edit share one form)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Delete payment
  const [deletePayment, setDeletePayment] = useState<{ payment: Payment; bookingId: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  function fetchCustomer() {
    return api
      .get<CustomerDetail>(`/customers/${id}`)
      .then((res) => setCustomer(res.data))
      .catch(() => setError('Failed to load customer.'))
      .finally(() => setLoading(false));
  }

  function fetchPayments(bookingId: string) {
    setPaymentsLoading((p) => ({ ...p, [bookingId]: true }));
    return api
      .get<Payment[]>(`/bookings/${bookingId}/payments`)
      .then((res) => setPayments((p) => ({ ...p, [bookingId]: res.data })))
      .finally(() => setPaymentsLoading((p) => ({ ...p, [bookingId]: false })));
  }

  function refreshBookingTotals() {
    api.get<CustomerDetail>(`/customers/${id}`).then((res) => setCustomer(res.data));
  }

  useEffect(() => {
    fetchCustomer();
  }, [id, router]);

  // ── Toggle payments panel ──────────────────────────────────────
  function togglePayments(bookingId: string) {
    const opening = !expanded[bookingId];
    setExpanded((e) => ({ ...e, [bookingId]: opening }));
    if (opening && !payments[bookingId]) fetchPayments(bookingId);
  }

  // ── Payment modal open (create or edit) ───────────────────────
  function openAddPayment(bookingId: string) {
    setActiveBookingId(bookingId);
    setEditPayment(null);
    setPaymentForm(EMPTY_PAYMENT_FORM);
    setPaymentError('');
    setShowPaymentModal(true);
  }

  function openEditPayment(bookingId: string, payment: Payment) {
    setActiveBookingId(bookingId);
    setEditPayment(payment);
    setPaymentForm({
      amount: String(payment.amount),
      paymentType: payment.paymentType,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate.split('T')[0],
      referenceNumber: payment.referenceNumber ?? '',
      status: payment.status,
    });
    setPaymentError('');
    setShowPaymentModal(true);
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError('');
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0)
      return setPaymentError('Amount must be greater than 0.');
    if (!paymentForm.paymentType) return setPaymentError('Please select a payment type.');
    if (!paymentForm.paymentMethod) return setPaymentError('Please select a payment method.');
    if (!paymentForm.paymentDate) return setPaymentError('Payment date is required.');

    setPaymentSubmitting(true);
    try {
      const payload: Record<string, any> = {
        amount: Number(paymentForm.amount),
        paymentType: paymentForm.paymentType,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        referenceNumber: paymentForm.referenceNumber.trim() || undefined,
      };

      if (editPayment) {
        if (paymentForm.status) payload.status = paymentForm.status;
        await api.patch(`/bookings/${activeBookingId}/payments/${editPayment.id}`, payload);
      } else {
        await api.post(`/bookings/${activeBookingId}/payments`, payload);
      }

      setShowPaymentModal(false);
      await fetchPayments(activeBookingId!);
      refreshBookingTotals();
      if (!expanded[activeBookingId!]) {
        setExpanded((e) => ({ ...e, [activeBookingId!]: true }));
      }
    } catch (err: any) {
      setPaymentError(err.response?.data?.message ?? 'Failed to save payment.');
    } finally { setPaymentSubmitting(false); }
  }

  // ── Delete payment ─────────────────────────────────────────────
  async function handleDeletePayment() {
    if (!deletePayment) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/bookings/${deletePayment.bookingId}/payments/${deletePayment.payment.id}`);
      setDeletePayment(null);
      await fetchPayments(deletePayment.bookingId);
      refreshBookingTotals();
    } finally { setDeleteSubmitting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );

  if (error || !customer) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-red-500">{error || 'Customer not found.'}</p>
    </div>
  );

  return (
    <>
      <div className="max-w-4xl space-y-6">

        <Link href="/customers" className="text-sm text-blue-600 hover:underline">
          ← Back to Customers
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900">{customer.fullName}</h1>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email ?? '—'} />
            <InfoRow label="IC Number" value={customer.icNumber ?? '—'} />
            <InfoRow label="Nationality" value={customer.nationality} />
          </div>
        </div>

        {/* Bookings header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Bookings</h2>
          <Link
            href={`/bookings/create?customerId=${id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Create Booking
          </Link>
        </div>

        {customer.bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400">
            No bookings yet.
          </div>
        ) : (
          customer.bookings.map((booking) => {
            const isExpanded = !!expanded[booking.id];
            const bookingPayments = payments[booking.id] ?? [];
            const paidCount = bookingPayments.filter((p) => p.status === 'VERIFIED').length;

            return (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Booking header */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{booking.package?.name ?? '—'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Total: <strong className="text-gray-700">{formatMYR(Number(booking.totalAmount))}</strong></span>
                      <span>Paid: <strong className="text-green-700">{formatMYR(Number(booking.totalPaid))}</strong></span>
                      <span>Balance: <strong className={Number(booking.balanceDue) > 0 ? 'text-red-600' : 'text-green-700'}>{formatMYR(Number(booking.balanceDue))}</strong></span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${BOOKING_STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {booking.status}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddPayment(booking.id)}
                      className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">
                      + Payment
                    </button>
                    <button
                      onClick={() => togglePayments(booking.id)}
                      className="text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                      {paymentsLoading[booking.id] ? (
                        <span>Loading...</span>
                      ) : (
                        <>
                          <span>Payments{bookingPayments.length > 0 ? ` (${bookingPayments.length})` : ''}</span>
                          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable payments panel */}
                {isExpanded && (
                  <div className="px-6 py-4">
                    {paymentsLoading[booking.id] ? (
                      <p className="text-xs text-gray-400 py-3">Loading payments...</p>
                    ) : bookingPayments.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-400">No payments recorded.</p>
                        <button onClick={() => openAddPayment(booking.id)}
                          className="mt-2 text-xs text-blue-600 hover:underline">
                          + Record first payment
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-500">
                            <th className="text-left py-2 pr-3 font-semibold">Date</th>
                            <th className="text-left py-2 pr-3 font-semibold">Amount</th>
                            <th className="text-left py-2 pr-3 font-semibold">Type</th>
                            <th className="text-left py-2 pr-3 font-semibold">Method</th>
                            <th className="text-left py-2 pr-3 font-semibold">Ref</th>
                            <th className="text-left py-2 pr-3 font-semibold">Status</th>
                            <th className="text-right py-2 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookingPayments.map((payment) => (
                            <tr key={payment.id}
                              className={`border-b last:border-0 transition-colors ${payment.status === 'VERIFIED' ? 'bg-green-50/40' : payment.status === 'FAILED' ? 'bg-red-50/30' : ''}`}>
                              <td className="py-2.5 pr-3 text-gray-600">{formatDate(payment.paymentDate)}</td>
                              <td className="py-2.5 pr-3 font-semibold text-gray-900">{formatMYR(Number(payment.amount))}</td>
                              <td className="py-2.5 pr-3 text-gray-600">{payment.paymentType}</td>
                              <td className="py-2.5 pr-3 text-gray-600">{payment.paymentMethod}</td>
                              <td className="py-2.5 pr-3 text-gray-400">{payment.referenceNumber ?? '—'}</td>
                              <td className="py-2.5 pr-3">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditPayment(booking.id, payment)}
                                    className="text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeletePayment({ payment, bookingId: booking.id })}
                                    className="text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {paidCount > 0 && (
                          <tfoot>
                            <tr className="border-t border-gray-200">
                              <td colSpan={2} className="pt-2.5 text-xs text-gray-500">
                                {paidCount} verified payment{paidCount > 1 ? 's' : ''}
                              </td>
                              <td colSpan={5} className="pt-2.5 text-right text-xs font-semibold text-green-700">
                                {formatMYR(Number(booking.totalPaid))} received
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Payment Modal */}
      {showPaymentModal && (
        <Modal
          title={editPayment ? 'Edit Payment' : 'Add Payment'}
          subtitle={editPayment ? 'Update payment details.' : 'Record a new payment for this booking.'}
          onClose={() => setShowPaymentModal(false)}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <InputField label="Amount (MYR)" required type="number" value={paymentForm.amount}
              onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })} placeholder="0.00" />
            <SelectField label="Payment Type" required value={paymentForm.paymentType}
              onChange={(v) => setPaymentForm({ ...paymentForm, paymentType: v })}>
              <option value="">Select type...</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="INSTALMENT">Instalment</option>
              <option value="FULL_PAYMENT">Full Payment</option>
              <option value="REFUND">Refund</option>
            </SelectField>
            <SelectField label="Payment Method" required value={paymentForm.paymentMethod}
              onChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
              <option value="">Select method...</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE_BANKING">Online Banking</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CHEQUE">Cheque</option>
            </SelectField>
            <InputField label="Payment Date" required type="date" value={paymentForm.paymentDate}
              onChange={(v) => setPaymentForm({ ...paymentForm, paymentDate: v })} />
            <InputField label="Reference Number" value={paymentForm.referenceNumber}
              onChange={(v) => setPaymentForm({ ...paymentForm, referenceNumber: v })} placeholder="e.g. IBG12345678" />
            {editPayment && (
              <SelectField label="Status" value={paymentForm.status}
                onChange={(v) => setPaymentForm({ ...paymentForm, status: v })}>
                <option value="">Keep current ({editPayment.status})</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="FAILED">Failed</option>
              </SelectField>
            )}
            {paymentError && <FormError message={paymentError} />}
            <ModalActions onCancel={() => setShowPaymentModal(false)} loading={paymentSubmitting}
              label={editPayment ? 'Save Changes' : 'Add Payment'} />
          </form>
        </Modal>
      )}

      {/* Delete Payment Confirm */}
      {deletePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Payment</h2>
            <p className="text-sm text-gray-600 mb-1">
              Delete <strong>{formatMYR(Number(deletePayment.payment.amount))}</strong> {deletePayment.payment.paymentType} payment?
            </p>
            <p className="text-xs text-gray-400 mb-5">
              {deletePayment.payment.status === 'VERIFIED'
                ? 'This payment is VERIFIED — balance due will be recalculated.'
                : 'This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletePayment(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeletePayment} disabled={deleteSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors">
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

function SelectField({ label, value, onChange, required = false, children }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        {children}
      </select>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{message}</p>
  );
}

function ModalActions({ onCancel, loading, label }: { onCancel: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button type="submit" disabled={loading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
        {loading ? 'Saving...' : label}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
