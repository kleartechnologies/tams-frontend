'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

interface LatestBooking {
  id: string;
  status: string;
  balanceDue: number;
  package: { id: string; name: string } | null;
}

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  icNumber: string | null;
  email: string | null;
  nationality: string;
  bookings: LatestBooking[];
}

interface CustomersResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_COLORS: Record<string, string> = {
  INQUIRY: 'bg-yellow-100 text-yellow-800',
  QUOTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

const EMPTY_CUSTOMER_FORM = {
  fullName: '',
  phone: '',
  icNumber: '',
  passportNumber: '',
  email: '',
};

function formatMYR(value: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(value);
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-2 py-2">
          <div className="skeleton h-4 rounded flex-1" style={{ maxWidth: `${50 + (i * 7) % 30}%` }} />
          <div className="skeleton h-4 rounded w-28" />
          <div className="skeleton h-4 rounded w-32" />
          <div className="skeleton h-4 rounded w-20" />
          <div className="skeleton h-6 rounded-full w-16" />
          <div className="skeleton h-4 rounded w-24" />
          <div className="skeleton h-7 rounded-lg w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER_FORM);
  const [customerFormError, setCustomerFormError] = useState('');
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  function fetchCustomers() {
    return api
      .get<CustomersResponse>('/customers')
      .then((res) => setCustomers(res.data.data))
      .catch(() => setError('Failed to load customers.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchCustomers();
  }, [router]);

  // Escape key to close modal
  useEffect(() => {
    if (!showCustomerModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCustomerModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCustomerModal]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (showCustomerModal) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [showCustomerModal]);

  function openCustomerModal() {
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFormError('');
    setShowCustomerModal(true);
  }

  async function handleCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCustomerFormError('');

    if (!customerForm.fullName.trim()) return setCustomerFormError('Full name is required.');
    if (!customerForm.phone.trim()) return setCustomerFormError('Phone is required.');
    if (customerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email)) {
      return setCustomerFormError('Enter a valid email address.');
    }

    setCustomerSubmitting(true);
    try {
      await api.post('/customers', {
        fullName: customerForm.fullName.trim(),
        phone: customerForm.phone.trim(),
        icNumber: customerForm.icNumber.trim() || undefined,
        passportNumber: customerForm.passportNumber.trim() || undefined,
        email: customerForm.email.trim() || undefined,
      });
      setShowCustomerModal(false);
      toast.success('Customer added successfully.');
      setLoading(true);
      fetchCustomers();
    } catch (err: any) {
      setCustomerFormError(err.response?.data?.message ?? 'Failed to create customer.');
    } finally {
      setCustomerSubmitting(false);
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search),
  );

  return (
    <>
      <div className="max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Customers</h1>
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={openCustomerModal}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="p-10 text-center text-sm text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-gray-400 mb-3">
                {search ? 'No customers match your search.' : 'No customers yet.'}
              </p>
              {!search && (
                <button
                  onClick={openCustomerModal}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Add the first customer →
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">IC Number</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Latest Package</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Balance</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link href={`/customers/${customer.id}`} className="hover:text-blue-600 hover:underline">
                        {customer.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{customer.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{customer.icNumber ?? '—'}</td>
                    {(() => {
                      const booking = customer.bookings?.[0] ?? null;
                      return (
                        <>
                          <td className="px-6 py-4 text-gray-600">
                            {booking?.package ? (
                              <Link
                                href={`/customers/${customer.id}`}
                                className="text-blue-600 hover:underline font-medium"
                              >
                                {booking.package.name}
                              </Link>
                            ) : (
                              <span className="text-gray-400 text-xs">No booking</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {booking ? (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {booking ? formatMYR(Number(booking.balanceDue)) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </>
                      );
                    })()}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/bookings/create?customerId=${customer.id}`}
                        className="text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-block"
                      >
                        + Booking
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && (
          <p className="text-xs text-gray-400 text-right">
            {filtered.length} of {customers.length} customers
          </p>
        )}

      </div>

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomerModal(false); }}
        >
          <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Customer</h2>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the customer details below.</p>
            </div>

            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={customerForm.fullName}
                  onChange={(e) => setCustomerForm({ ...customerForm, fullName: e.target.value })}
                  placeholder="Ahmad bin Ismail"
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Field label="Phone" required value={customerForm.phone}
                onChange={(v) => setCustomerForm({ ...customerForm, phone: v })}
                placeholder="0123456789" />
              <Field label="IC Number" value={customerForm.icNumber}
                onChange={(v) => setCustomerForm({ ...customerForm, icNumber: v })}
                placeholder="750315145678" />
              <Field label="Passport Number" value={customerForm.passportNumber}
                onChange={(v) => setCustomerForm({ ...customerForm, passportNumber: v })}
                placeholder="A12345678" />
              <Field label="Email" type="email" value={customerForm.email}
                onChange={(v) => setCustomerForm({ ...customerForm, email: v })}
                placeholder="ahmad@email.com" />

              {customerFormError && <FormError message={customerFormError} />}

              <div className="flex justify-end gap-3 pt-2">
                <CancelButton onClick={() => setShowCustomerModal(false)} />
                <SubmitButton loading={customerSubmitting} label="Save Customer" />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      Cancel
    </button>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
      {loading ? 'Saving...' : label}
    </button>
  );
}
