'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';
import UpgradeModal from '@/components/UpgradeModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  icNumber: string | null;
  nationality: string;
}

interface Departure {
  id: string;
  departureDate: string;
  quota: number;
  bookedCount: number;
}

interface InclusionItem {
  type: string;
  value: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
  destination: string;
  days: number;
  nights: number;
  adultPrice: number;
  childPrice: number;
  isSSTApplicable: boolean;
  sstRate: number;
  inclusions: InclusionItem[] | null;
}

type TravelerType = 'ADULT' | 'CHILD';

interface TravelerRow {
  key: string;
  travelerType: TravelerType;
  fullName: string;
  icNumber: string;
  nationality: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group Tour',
  PRIVATE_TOUR: 'Private Tour',
  UMRAH: 'Umrah',
  HAJJ: 'Hajj',
};

const NATIONALITY_OPTIONS = [
  { value: 'MALAYSIAN', label: 'Malaysian' },
  { value: 'INDONESIAN', label: 'Indonesian' },
  { value: 'SINGAPOREAN', label: 'Singaporean' },
  { value: 'BRUNEIAN', label: 'Bruneian' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'ONLINE_BANKING', label: 'Online Banking' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CHEQUE', label: 'Cheque' },
];

const PAYMENT_TYPES = [
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'INSTALMENT', label: 'Instalment' },
  { value: 'FULL_PAYMENT', label: 'Full Payment' },
];

const BOOKING_STATUSES = [
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'CONFIRMED', label: 'Confirmed' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMYR(v: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(v);
}

let _key = 0;
function nextKey() { return String(++_key); }

function emptyTraveler(type: TravelerType = 'ADULT'): TravelerRow {
  return { key: nextKey(), travelerType: type, fullName: '', icNumber: '', nationality: '' };
}

// ── Inline new-customer form ──────────────────────────────────────────────────

interface NewCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

function NewCustomerModal({ onClose, onCreated }: NewCustomerModalProps) {
  const [form, setForm] = useState({ fullName: '', phone: '', icNumber: '', passportNumber: '', email: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('Full name is required.');
    if (!form.phone.trim()) return setError('Phone number is required.');

    setSubmitting(true);
    try {
      const res = await api.post<Customer>('/customers', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        icNumber: form.icNumber.trim() || undefined,
        passportNumber: form.passportNumber.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      onCreated(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Failed to create customer.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">New Customer</h2>
          <p className="text-xs text-gray-400 mt-0.5">Create a customer and select them instantly</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstRef}
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="As per IC / passport"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01X-XXXXXXX"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">IC Number</label>
              <input
                type="text"
                value={form.icNumber}
                onChange={(e) => setForm({ ...form, icNumber: e.target.value })}
                placeholder="970101-01-1234"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Passport No.</label>
              <input
                type="text"
                value={form.passportNumber}
                onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                placeholder="A12345678"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="customer@email.com"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {submitting ? 'Creating...' : 'Create & Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {step}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

function CreateBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get('customerId');
  const toast = useToast();

  // Customer
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Package
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(false);
  const [selectedDepartureId, setSelectedDepartureId] = useState('');

  // Travelers
  const [travelers, setTravelers] = useState<TravelerRow[]>([emptyTraveler('ADULT')]);

  // Pricing adjustments
  const [discount, setDiscount] = useState('');
  const [extraCharges, setExtraCharges] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingStatus, setBookingStatus] = useState('INQUIRY');

  // Initial payment
  const [recordPayment, setRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentType, setPaymentType] = useState('DEPOSIT');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitStep, setSubmitStep]   = useState('');
  const [error, setError]             = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // ── Derived values ─────────────────────────────────────────────────────────

  const selectedDep    = departures.find((d) => d.id === selectedDepartureId) ?? null;
  const availableSeats = selectedDep ? selectedDep.quota - selectedDep.bookedCount : Infinity;
  const seatsExceeded  = selectedDep !== null && travelers.length > availableSeats;

  const adultPrice    = selectedPackage ? Number(selectedPackage.adultPrice) : 0;
  const childPrice    = selectedPackage ? Number(selectedPackage.childPrice) : 0;
  const adultCount    = travelers.filter((t) => t.travelerType === 'ADULT').length;
  const childCount    = travelers.filter((t) => t.travelerType === 'CHILD').length;
  const adultSubtotal = adultPrice * adultCount;
  const childSubtotal = childPrice * childCount;
  const subtotal      = adultSubtotal + childSubtotal;
  const sstRate       = selectedPackage?.isSSTApplicable ? (selectedPackage.sstRate || 6) : 0;
  const sstAmount     = Math.round(subtotal * sstRate) / 100;
  const discountNum   = Math.max(0, Number(discount) || 0);
  const extraNum      = Math.max(0, Number(extraCharges) || 0);
  const totalAmount   = Math.max(0, subtotal + sstAmount - discountNum + extraNum);
  const balanceAfterPayment = recordPayment
    ? Math.max(0, totalAmount - (Number(paymentAmount) || 0))
    : totalAmount;

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<{ data: Package[] }>('/packages?limit=100').then((r) => setPackages(r.data.data));
    api.get<{ data: Customer[] }>('/customers?limit=6').then((r) => setRecentCustomers(r.data.data));

    if (prefilledId) {
      api.get<Customer>(`/customers/${prefilledId}`).then((r) => {
        prefillCustomer(r.data);
      });
    }
  }, [prefilledId]);

  // ── Debounced customer search ──────────────────────────────────────────────

  useEffect(() => {
    if (customer) { setShowDropdown(false); return; }
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setCustomerSearching(true);
      api
        .get<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(customerSearch)}&limit=8`)
        .then((r) => { setCustomerResults(r.data.data); setShowDropdown(true); })
        .finally(() => setCustomerSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customer]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function prefillCustomer(c: Customer) {
    setCustomer(c);
    setCustomerSearch('');
    setShowDropdown(false);
    setCustomerResults([]);
    setTravelers((prev) => {
      const updated = [...prev];
      updated[0] = { ...updated[0], fullName: c.fullName, icNumber: c.icNumber ?? '', nationality: c.nationality ?? '' };
      return updated;
    });
  }

  function selectCustomer(c: Customer) { prefillCustomer(c); }
  function clearCustomer() { setCustomer(null); setCustomerSearch(''); }

  function handleSearchFocus() {
    if (!customer && !customerSearch.trim() && recentCustomers.length > 0) {
      setShowDropdown(true);
    }
  }

  function handleNewCustomerCreated(c: Customer) {
    setShowNewCustomerModal(false);
    prefillCustomer(c);
    toast.success('Customer created and selected.');
  }

  function handlePackageChange(pkgId: string) {
    const pkg = packages.find((p) => p.id === pkgId) ?? null;
    setSelectedPackage(pkg);
    setSelectedDepartureId('');
    setDepartures([]);
    if (pkg) {
      setDeparturesLoading(true);
      api.get<Departure[]>(`/packages/${pkg.id}/departures`)
        .then((r) => setDepartures(r.data))
        .catch(() => setDepartures([]))
        .finally(() => setDeparturesLoading(false));
    }
  }

  function addTraveler(type: TravelerType) {
    setTravelers((prev) => [...prev, emptyTraveler(type)]);
  }

  function removeTraveler(key: string) {
    setTravelers((prev) => prev.filter((t) => t.key !== key));
  }

  function updateTraveler(key: string, field: keyof Omit<TravelerRow, 'key'>, value: string) {
    setTravelers((prev) => prev.map((t) => (t.key === key ? { ...t, [field]: value } : t)));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!customer) return setError('Please select or create a customer.');
    if (!selectedPackage) return setError('Please select a package.');
    if (departures.length > 0 && !selectedDepartureId) return setError('Please select a departure date.');
    if (seatsExceeded) return setError(`Only ${availableSeats} seat(s) available. Reduce travelers or pick a different date.`);
    if (travelers.length === 0) return setError('At least 1 traveler is required.');
    if (travelers.some((t) => !t.fullName.trim())) return setError('All traveler names are required.');
    if (totalAmount <= 0) return setError('Total amount must be greater than 0.');
    if (recordPayment) {
      const pAmt = Number(paymentAmount);
      if (!pAmt || pAmt <= 0) return setError('Enter a valid payment amount.');
      if (pAmt > totalAmount) return setError('Payment cannot exceed the total amount.');
    }

    setSubmitting(true);
    try {
      setSubmitStep('Creating booking...');
      const bookingRes = await api.post<{ id: string }>('/bookings', {
        customerId: customer.id,
        packageId: selectedPackage.id,
        departureId: selectedDep?.id || undefined,
        departureDate: selectedDep?.departureDate || undefined,
        requestedSeats: travelers.length,
        subtotal,
        sstRate,
        sstAmount,
        totalAmount,
        specialRequests: specialRequests.trim() || undefined,
      });
      const bookingId = bookingRes.data.id;

      if (bookingStatus !== 'INQUIRY') {
        await api.patch(`/bookings/${bookingId}`, { status: bookingStatus });
      }

      for (let i = 0; i < travelers.length; i++) {
        const t = travelers[i];
        setSubmitStep(`Adding traveler ${i + 1} of ${travelers.length}...`);
        await api.post(`/bookings/${bookingId}/travelers`, {
          travelerType: t.travelerType,
          fullName: t.fullName.trim(),
          icNumber: t.icNumber.trim() || undefined,
          nationality: t.nationality || undefined,
        });
      }

      if (recordPayment) {
        setSubmitStep('Recording payment...');
        await api.post(`/bookings/${bookingId}/payments`, {
          amount: Number(paymentAmount),
          paymentType,
          paymentMethod,
          paymentDate,
          referenceNumber: paymentReference.trim() || undefined,
        });
      }

      toast.success('Booking created successfully');
      router.push(`/bookings/${bookingId}`);
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw[0] : (raw ?? 'Failed to create booking.');
      if (typeof msg === 'string' && msg.toLowerCase().includes('booking limit')) {
        setUpgradeReason(msg);
        setShowUpgrade(true);
      } else {
        setError(msg);
      }
      setSubmitting(false);
      setSubmitStep('');
    }
  }

  const departureOk = departures.length === 0 || !!selectedDepartureId;
  const canSubmit   = !!customer && !!selectedPackage && departureOk && travelers.length > 0 && !seatsExceeded && !submitting;

  const dropdownItems = customerSearch.trim() ? customerResults : recentCustomers;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={upgradeReason || undefined}
      />

      <div className="max-w-3xl space-y-5 pb-10">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/bookings" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Bookings
            </Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">New Booking</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Section 1: Customer ─────────────────────────────────────── */}
          <Section step={1} title="Customer" subtitle="Who is making this booking?">
            {customer ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{customer.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {customer.phone}{customer.icNumber ? ` · ${customer.icNumber}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="text-xs text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <svg
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by name, phone, or IC number..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      onFocus={handleSearchFocus}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {customerSearching && (
                      <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                  </div>

                  {showDropdown && (
                    <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {dropdownItems.length > 0 ? (
                        <>
                          {!customerSearch.trim() && (
                            <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">
                              Recent customers
                            </p>
                          )}
                          {dropdownItems.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectCustomer(c)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900">{c.fullName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {c.phone}{c.icNumber ? ` · ${c.icNumber}` : ''}
                              </p>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-4 py-4 text-center">
                          <p className="text-sm text-gray-500 mb-2">No customers found for "{customerSearch}"</p>
                          <button
                            type="button"
                            onClick={() => { setShowDropdown(false); setShowNewCustomerModal(true); }}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            Create new customer →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(true)}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 border border-blue-200 border-dashed hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create new customer
                </button>
              </div>
            )}
          </Section>

          {/* ── Section 2: Package & Trip ───────────────────────────────── */}
          <Section step={2} title="Package & Trip" subtitle="Select the travel package and departure date">
            <select
              value={selectedPackage?.id ?? ''}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a package...</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.destination} ({TYPE_LABELS[p.type] ?? p.type})
                </option>
              ))}
            </select>

            {packages.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                No packages available.{' '}
                <Link href="/packages/create" className="text-blue-600 hover:underline">
                  Create a package →
                </Link>
              </p>
            )}

            {selectedPackage && (
              <div className="mt-3 flex flex-wrap items-center gap-5 px-1 text-xs text-gray-500">
                <span>Duration: <strong className="text-gray-700">{selectedPackage.days}D / {selectedPackage.nights}N</strong></span>
                <span>Adult: <strong className="text-blue-600 text-sm">{formatMYR(adultPrice)}</strong></span>
                <span>Child: <strong className="text-purple-600 text-sm">{formatMYR(childPrice)}</strong></span>
                {sstRate > 0 && <span>SST: <strong className="text-orange-500">{sstRate}%</strong></span>}
              </div>
            )}

            {selectedPackage && (
              <div className="mt-5">
                <label className="block text-xs font-semibold text-gray-500 mb-2">
                  Departure Date <span className="text-red-400">*</span>
                </label>
                {departuresLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Loading departures...
                  </div>
                ) : departures.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 italic">No departure dates configured for this package.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {departures.map((d) => {
                      const available = d.quota - d.bookedCount;
                      const isFull    = available <= 0;
                      const isSelected = selectedDepartureId === d.id;
                      const date = new Date(d.departureDate);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedDepartureId(d.id)}
                          className={[
                            'relative text-left px-3 py-2.5 rounded-xl border transition-all',
                            isFull
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',
                          ].join(' ')}
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className={`text-xs mt-0.5 ${isFull ? 'text-red-400' : 'text-gray-400'}`}>
                            {isFull ? 'Full' : `${available} seat${available !== 1 ? 's' : ''} left`}
                          </p>
                          {isSelected && !isFull && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                          {isFull && (
                            <span className="absolute top-2 right-2 text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                              FULL
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {seatsExceeded && (
              <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>
                  Only <strong>{availableSeats} seat{availableSeats !== 1 ? 's' : ''}</strong> left — you have <strong>{travelers.length} travelers</strong>. Reduce travelers or choose another date.
                </span>
              </div>
            )}

            {selectedPackage && (selectedPackage.inclusions ?? []).length > 0 && (() => {
              const included = (selectedPackage.inclusions ?? []).filter((i) => i.type !== 'Not Included');
              const excluded = (selectedPackage.inclusions ?? []).filter((i) => i.type === 'Not Included');
              if (included.length === 0 && excluded.length === 0) return null;
              return (
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inclusions</p>
                  {included.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {included.map((inc, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-medium text-emerald-600 mr-0.5">{inc.type}:</span>
                          {inc.value}
                        </span>
                      ))}
                    </div>
                  )}
                  {excluded.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {excluded.map((inc, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          {inc.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </Section>

          {/* ── Section 3: Travelers ────────────────────────────────────── */}
          <Section
            step={3}
            title="Travelers"
            subtitle={`${adultCount} adult${adultCount !== 1 ? 's' : ''}${childCount > 0 ? `, ${childCount} child${childCount !== 1 ? 'ren' : ''}` : ''}`}
          >
            <div className="space-y-3">
              {travelers.map((t, idx) => (
                <div
                  key={t.key}
                  className={`rounded-xl border p-4 ${
                    idx === 0
                      ? 'border-blue-200 bg-blue-50/30'
                      : t.travelerType === 'CHILD'
                      ? 'border-purple-100 bg-purple-50/20'
                      : 'border-gray-100 bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t.travelerType === 'CHILD' ? 'bg-purple-500' : 'bg-blue-600'}`}>
                      <span className="text-xs font-bold text-white">{idx + 1}</span>
                    </div>
                    {idx === 0 ? (
                      <span className="text-xs font-semibold text-blue-600">Main Traveler</span>
                    ) : (
                      <span className="text-xs text-gray-400">Traveler {idx + 1}</span>
                    )}
                    <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden ml-2">
                      <button
                        type="button"
                        onClick={() => updateTraveler(t.key, 'travelerType', 'ADULT')}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${t.travelerType === 'ADULT' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        Adult
                      </button>
                      <button
                        type="button"
                        onClick={() => updateTraveler(t.key, 'travelerType', 'CHILD')}
                        className={`px-2.5 py-1 text-xs font-medium transition-colors ${t.travelerType === 'CHILD' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        Child
                      </button>
                    </div>
                    {selectedPackage && (
                      <span className={`text-xs font-medium ml-1 ${t.travelerType === 'CHILD' ? 'text-purple-500' : 'text-blue-500'}`}>
                        {formatMYR(t.travelerType === 'CHILD' ? childPrice : adultPrice)}
                      </span>
                    )}
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeTraveler(t.key)}
                        className="ml-auto text-xs text-red-400 hover:text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-gray-500 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={t.fullName}
                        onChange={(e) => updateTraveler(t.key, 'fullName', e.target.value)}
                        placeholder="As per IC / passport"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">IC / Passport</label>
                      <input
                        type="text"
                        value={t.icNumber}
                        onChange={(e) => updateTraveler(t.key, 'icNumber', e.target.value)}
                        placeholder="970101-01-1234"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nationality</label>
                      <select
                        value={t.nationality}
                        onChange={(e) => updateTraveler(t.key, 'nationality', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select...</option>
                        {NATIONALITY_OPTIONS.map((n) => (
                          <option key={n.value} value={n.value}>{n.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => addTraveler('ADULT')}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-blue-600 border border-blue-200 border-dashed hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-colors font-medium"
              >
                + Add Adult
              </button>
              <button
                type="button"
                onClick={() => addTraveler('CHILD')}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-purple-600 border border-purple-200 border-dashed hover:bg-purple-50 px-4 py-2.5 rounded-xl transition-colors font-medium"
              >
                + Add Child
              </button>
            </div>
          </Section>

          {/* ── Section 4: Pricing ─────────────────────────────────────── */}
          <Section step={4} title="Pricing" subtitle="Auto-calculated from package and travelers">
            <div className="space-y-2">
              {!selectedPackage && (
                <p className="text-sm text-gray-400 py-2">Select a package to see pricing.</p>
              )}

              {adultCount > 0 && selectedPackage && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">
                    Adults <span className="text-gray-400">({adultCount} × {formatMYR(adultPrice)})</span>
                  </span>
                  <span className="text-sm font-medium text-gray-800">{formatMYR(adultSubtotal)}</span>
                </div>
              )}

              {childCount > 0 && selectedPackage && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">
                    Children <span className="text-gray-400">({childCount} × {formatMYR(childPrice)})</span>
                  </span>
                  <span className="text-sm font-medium text-gray-800">{formatMYR(childSubtotal)}</span>
                </div>
              )}

              {sstRate > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">SST <span className="text-gray-400">({sstRate}%)</span></span>
                  <span className="text-sm font-medium text-orange-600">+{formatMYR(sstAmount)}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mt-1">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Discount (MYR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {discountNum > 0 && <p className="text-xs text-green-600 mt-1">−{formatMYR(discountNum)}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Extra Charges (MYR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {extraNum > 0 && <p className="text-xs text-orange-500 mt-1">+{formatMYR(extraNum)}</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t-2 border-gray-200">
                  <div>
                    <p className="text-base font-semibold text-gray-900">Total Amount</p>
                    {travelers.length > 0 && selectedPackage && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {adultCount} adult{adultCount !== 1 ? 's' : ''}{childCount > 0 ? `, ${childCount} child${childCount !== 1 ? 'ren' : ''}` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedPackage ? formatMYR(totalAmount) : '—'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Special Requests <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Dietary requirements, accessibility needs, room preferences..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </Section>

          {/* ── Section 5: Initial Payment ──────────────────────────────── */}
          <Section step={5} title="Initial Payment" subtitle="Optionally record a deposit or payment now">
            <label className="flex items-center gap-3 cursor-pointer group">
              <button
                type="button"
                role="switch"
                aria-checked={recordPayment}
                onClick={() => setRecordPayment(!recordPayment)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  recordPayment ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    recordPayment ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                Record a payment now
              </span>
            </label>

            {recordPayment && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Amount Paid (MYR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Balance After Payment</label>
                    <div className="px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-gray-100 bg-gray-50 text-gray-600">
                      {selectedPackage ? formatMYR(balanceAfterPayment) : '—'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Type</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PAYMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Reference Number <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="IBG1234, REF-001..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </Section>

          {/* ── Booking status ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Booking Status</h2>
                <p className="text-xs text-gray-400 mt-0.5">Set the initial status of this booking</p>
              </div>
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
                className="px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Error ───────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/bookings"
              className="px-5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              {submitting && submitStep && (
                <span className="text-xs text-gray-400">{submitStep}</span>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Booking
                    {selectedPackage && (
                      <span className="text-blue-200 font-normal">· {formatMYR(totalAmount)}</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* New customer modal */}
      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onCreated={handleNewCustomerCreated}
        />
      )}
    </>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

export default function CreateBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    }>
      <CreateBookingForm />
    </Suspense>
  );
}
