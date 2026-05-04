'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToast } from '@/components/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  adultPrice: string | number;
  childPrice: string | number;
  isSSTApplicable: boolean;
  sstRate: number;
  description: string | null;
  inclusions: InclusionItem[] | null;
  departures: Departure[];
}

interface PackagesResponse {
  data: Package[];
  total: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PACKAGE_TYPES = ['GROUP_TOUR', 'PRIVATE_TOUR', 'UMRAH', 'HAJJ'];

const TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: 'Group Tour',
  PRIVATE_TOUR: 'Private Tour',
  UMRAH: 'Umrah',
  HAJJ: 'Hajj',
};

const TYPE_COLORS: Record<string, string> = {
  GROUP_TOUR: 'bg-blue-100 text-blue-700',
  PRIVATE_TOUR: 'bg-purple-100 text-purple-700',
  UMRAH: 'bg-emerald-100 text-emerald-700',
  HAJJ: 'bg-amber-100 text-amber-700',
};

function formatMYR(value: number) {
  return new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Draft row types ───────────────────────────────────────────────────────────

type DraftDeparture  = { _key: string; id?: string; departureDate: string; quota: string };
type DraftInclusion  = { _key: string; type: string; value: string };

const INCLUSION_TYPES = [
  'Accommodation',
  'Meals',
  'Transport',
  'Guide',
  'Entrance Fees',
  'Not Included',
] as const;

let _keySeq = 0;
function newKey() { return String(++_keySeq); }

const EMPTY_FORM = {
  name: '',
  type: '',
  destination: '',
  days: '',
  nights: '',
  adultPrice: '',
  childPrice: '',
  isSSTApplicable: false,
  sstRate: '6',
  description: '',
};

// ── Page ──────────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center px-2 py-2">
          <div className="skeleton h-4 rounded flex-1" style={{ maxWidth: `${140 + (i * 13) % 60}px` }} />
          <div className="skeleton h-6 rounded-full w-20" />
          <div className="skeleton h-4 rounded w-28" />
          <div className="skeleton h-4 rounded w-16" />
          <div className="skeleton h-4 rounded w-24" />
          <div className="skeleton h-4 rounded w-28" />
          <div className="skeleton h-7 rounded-lg w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export default function PackagesPage() {
  const router = useRouter();
  const toast = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const userRole = 'ADMIN';

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Package | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [departures, setDepartures] = useState<DraftDeparture[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [inclusions, setInclusions] = useState<DraftInclusion[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function fetchPackages() {
    return api
      .get<PackagesResponse>('/packages?limit=100')
      .then((res) => setPackages(res.data.data))
      .catch(() => setError('Failed to load packages.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPackages();
  }, [router]);

  // Escape key to close any open modal
  useEffect(() => {
    if (!showModal && !deleteTarget) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal, deleteTarget]);

  function addInclusion() {
    setInclusions((prev) => [...prev, { _key: newKey(), type: '', value: '' }]);
  }

  function updateInclusion(key: string, field: 'type' | 'value', value: string) {
    setInclusions((prev) => prev.map((i) => (i._key === key ? { ...i, [field]: value } : i)));
  }

  function removeInclusion(key: string) {
    setInclusions((prev) => prev.filter((i) => i._key !== key));
  }

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDepartures([]);
    setRemovedIds([]);
    setInclusions([]);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(pkg: Package) {
    setEditTarget(pkg);
    setForm({
      name: pkg.name,
      type: pkg.type,
      destination: pkg.destination,
      days: String(pkg.days),
      nights: String(pkg.nights),
      adultPrice: String(pkg.adultPrice),
      childPrice: String(pkg.childPrice),
      isSSTApplicable: pkg.isSSTApplicable,
      sstRate: String(pkg.sstRate || 6),
      description: pkg.description ?? '',
    });
    setDepartures(
      (pkg.departures ?? []).map((d) => ({
        _key: newKey(),
        id: d.id,
        departureDate: d.departureDate.slice(0, 10),
        quota: String(d.quota),
      })),
    );
    setInclusions(
      (pkg.inclusions ?? []).map((inc) => ({ _key: newKey(), type: inc.type, value: inc.value })),
    );
    setRemovedIds([]);
    setFormError('');
    setShowModal(true);
  }

  function addDeparture() {
    setDepartures((prev) => [...prev, { _key: newKey(), departureDate: '', quota: '' }]);
  }

  function updateDeparture(key: string, field: 'departureDate' | 'quota', value: string) {
    setDepartures((prev) =>
      prev.map((d) => (d._key === key ? { ...d, [field]: value } : d)),
    );
  }

  function removeDeparture(key: string) {
    const dep = departures.find((d) => d._key === key);
    if (dep?.id) setRemovedIds((prev) => [...prev, dep.id!]);
    setDepartures((prev) => prev.filter((d) => d._key !== key));
  }

  function validate() {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.type) return 'Please select a type.';
    if (!form.destination.trim()) return 'Destination is required.';
    if (!form.days || Number(form.days) < 1) return 'Days must be at least 1.';
    if (form.nights === '' || Number(form.nights) < 0) return 'Nights cannot be negative.';
    if (!form.adultPrice || Number(form.adultPrice) < 0) return 'Adult price is required.';
    if (!form.childPrice || Number(form.childPrice) < 0) return 'Child price is required.';
    for (const d of departures) {
      if (!d.departureDate) return 'All departure rows need a date.';
      if (!d.quota || Number(d.quota) < 1) return 'All departure rows need a quota ≥ 1.';
    }
    for (const inc of inclusions) {
      if (!inc.type) return 'All inclusion rows need a type.';
      if (!inc.value.trim()) return 'All inclusion rows need a description.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError('');

    const payload = {
      name: form.name.trim(),
      type: form.type,
      destination: form.destination.trim(),
      days: Number(form.days),
      nights: Number(form.nights),
      adultPrice: Number(form.adultPrice),
      childPrice: Number(form.childPrice),
      isSSTApplicable: form.isSSTApplicable,
      sstRate: form.isSSTApplicable ? Number(form.sstRate) : 0,
      description: form.description.trim() || undefined,
      inclusions: inclusions.length > 0
        ? inclusions.map(({ type, value }) => ({ type, value: value.trim() }))
        : undefined,
    };

    setSubmitting(true);
    try {
      let pkgId: string;

      if (editTarget) {
        await api.patch(`/packages/${editTarget.id}`, payload);
        pkgId = editTarget.id;

        // delete removed departures
        await Promise.all(removedIds.map((id) => api.delete(`/packages/${pkgId}/departures/${id}`)));
      } else {
        const res = await api.post<Package>('/packages', payload);
        pkgId = res.data.id;
      }

      // create new departures (those without an id)
      const newDeps = departures.filter((d) => !d.id);
      await Promise.all(
        newDeps.map((d) =>
          api.post(`/packages/${pkgId}/departures`, {
            departureDate: d.departureDate,
            quota: Number(d.quota),
          }),
        ),
      );

      setShowModal(false);
      toast.success(editTarget ? 'Package updated.' : 'Package created.');
      setLoading(true);
      fetchPackages();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to save package.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await api.delete(`/packages/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast.success('Package deleted.');
      setLoading(true);
      fetchPackages();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Failed to delete package.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const filtered = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.destination.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 flex-shrink-0">Packages</h1>
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              placeholder="Search by name or destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={openCreate}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              + Add Package
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
            <div className="p-10 text-center text-sm text-gray-400">No packages found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Type</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Destination</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Duration</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Next Departure</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Adult / Child</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => {
                  const nextDep = (pkg.departures ?? []).find(
                    (d) => new Date(d.departureDate) >= new Date(),
                  );
                  return (
                    <tr
                      key={pkg.id}
                      onClick={() => router.push(`/packages/${pkg.id}`)}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{pkg.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${TYPE_COLORS[pkg.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[pkg.type] ?? pkg.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{pkg.destination}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        {pkg.days}D / {pkg.nights}N
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {nextDep ? (
                          <span className="text-blue-700 font-medium">{fmtDate(nextDep.departureDate)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                        <span className="text-gray-800 font-medium">{formatMYR(Number(pkg.adultPrice))}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">{formatMYR(Number(pkg.childPrice))}</span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(pkg)}
                            className="text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          {userRole === 'ADMIN' && (
                            <button
                              onClick={() => { setDeleteTarget(pkg); setDeleteError(''); }}
                              className="text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && (
          <p className="text-xs text-gray-400 text-right">{filtered.length} of {packages.length} packages</p>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'Edit Package' : 'Add Package'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editTarget ? 'Update package details.' : 'Fill in the package details below.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Name" required value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Umrah Package Premium"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select type...</option>
                  {PACKAGE_TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <Field
                label="Destination" required value={form.destination}
                onChange={(v) => setForm({ ...form, destination: v })}
                placeholder="Makkah, Saudi Arabia"
              />

              {/* Days + Nights */}
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Days" required type="number" value={form.days}
                  onChange={(v) => setForm({ ...form, days: v })}
                  placeholder="14"
                />
                <Field
                  label="Nights" required type="number" value={form.nights}
                  onChange={(v) => setForm({ ...form, nights: v })}
                  placeholder="13"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Adult Price (MYR)" required type="number" value={form.adultPrice}
                  onChange={(v) => setForm({ ...form, adultPrice: v })}
                  placeholder="6500"
                />
                <Field
                  label="Child Price (MYR)" required type="number" value={form.childPrice}
                  onChange={(v) => setForm({ ...form, childPrice: v })}
                  placeholder="4500"
                />
              </div>

              {/* SST */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isSSTApplicable}
                    onChange={(e) => setForm({ ...form, isSSTApplicable: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Apply SST (Service Tax)</span>
                </label>
                {form.isSSTApplicable && (
                  <div className="flex items-center gap-3 pl-6">
                    <label className="text-sm text-gray-600 whitespace-nowrap">SST Rate (%)</label>
                    <div className="flex gap-2">
                      {['6', '8'].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setForm({ ...form, sstRate: rate })}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                            form.sstRate === rate
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Package overview and highlights..."
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Inclusions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Inclusions</label>
                    <p className="text-xs text-gray-400 mt-0.5">What's included (and not included) in this package</p>
                  </div>
                  <button
                    type="button"
                    onClick={addInclusion}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                {inclusions.length === 0 ? (
                  <button
                    type="button"
                    onClick={addInclusion}
                    className="w-full py-3 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    No inclusions yet — click to add
                  </button>
                ) : (
                  <div className="space-y-2">
                    {inclusions.map((inc) => (
                      <div key={inc._key} className="flex items-center gap-2">
                        <select
                          value={inc.type}
                          onChange={(e) => updateInclusion(inc._key, 'type', e.target.value)}
                          className="w-40 shrink-0 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Type...</option>
                          {INCLUSION_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={inc.value}
                          onChange={(e) => updateInclusion(inc._key, 'value', e.target.value)}
                          placeholder="e.g. 4-star hotel (double room)"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeInclusion(inc._key)}
                          className="shrink-0 text-gray-300 hover:text-red-400 transition-colors px-1 text-lg leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Departure Dates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Departure Dates</label>
                  <button
                    type="button"
                    onClick={addDeparture}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    + Add Departure
                  </button>
                </div>

                {departures.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No departure dates added.</p>
                ) : (
                  <div className="space-y-2">
                    {departures.map((dep) => (
                      <div key={dep._key} className="flex items-center gap-2">
                        <input
                          type="date"
                          value={dep.departureDate}
                          onChange={(e) => updateDeparture(dep._key, 'departureDate', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min={1}
                          value={dep.quota}
                          onChange={(e) => updateDeparture(dep._key, 'quota', e.target.value)}
                          placeholder="Quota"
                          className="w-24 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeDeparture(dep._key)}
                          className="text-gray-400 hover:text-red-500 transition-colors px-1"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && <FormError message={formError} />}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="modal-content bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Package</h2>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to delete <span className="font-medium text-gray-900">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-gray-400 mb-5">This cannot be undone. Packages with existing bookings cannot be deleted.</p>
            {deleteError && <FormError message={deleteError} />}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete} disabled={deleteSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
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
