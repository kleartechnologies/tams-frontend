'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface ItineraryItem {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
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

interface PackageDetail {
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
  description: string | null;
  inclusions: InclusionItem[] | null;
  departures: Departure[];
}

const INCLUSION_TYPE_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  'Accommodation': { dot: 'bg-blue-400',    text: 'text-blue-700',    bg: 'bg-blue-50'    },
  'Meals':         { dot: 'bg-orange-400',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
  'Transport':     { dot: 'bg-purple-400',  text: 'text-purple-700',  bg: 'bg-purple-50'  },
  'Guide':         { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Entrance Fees': { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  'Not Included':  { dot: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50'     },
};

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

const EMPTY_FORM = { dayNumber: '', title: '', description: '' };

export default function PackageDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [pkg, setPkg] = useState<PackageDetail | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ItineraryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ItineraryItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  function fetchItinerary() {
    return api
      .get<ItineraryItem[]>(`/packages/${id}/itinerary`)
      .then((res) => setItinerary(res.data));
  }

  useEffect(() => {

    Promise.all([
      api.get<PackageDetail>(`/packages/${id}`).then((res) => setPkg(res.data)),
      api.get<ItineraryItem[]>(`/packages/${id}/itinerary`).then((res) => setItinerary(res.data)),
    ])
      .catch(() => setError('Failed to load package.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(item: ItineraryItem) {
    setEditTarget(item);
    setForm({
      dayNumber: String(item.dayNumber),
      title: item.title,
      description: item.description,
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.dayNumber || Number(form.dayNumber) < 1)
      return setFormError('Day number must be at least 1.');
    if (!form.title.trim()) return setFormError('Title is required.');
    if (!form.description.trim()) return setFormError('Description is required.');

    const payload = {
      dayNumber: Number(form.dayNumber),
      title: form.title.trim(),
      description: form.description.trim(),
    };

    setSubmitting(true);
    try {
      if (editTarget) {
        await api.patch(`/packages/${id}/itinerary/${editTarget.id}`, payload);
      } else {
        await api.post(`/packages/${id}/itinerary`, payload);
      }
      setShowModal(false);
      fetchItinerary();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Failed to save itinerary item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/packages/${id}/itinerary/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchItinerary();
    } finally {
      setDeleteSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );

  if (error || !pkg) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-red-500">{error || 'Package not found.'}</p>
    </div>
  );

  const sortedItinerary = [...itinerary].sort((a, b) => a.dayNumber - b.dayNumber);
  const usedDays = new Set(itinerary.map((i) => i.dayNumber));

  return (
    <>
      <div className="max-w-3xl space-y-6">

        <Link href="/packages" className="text-sm text-blue-600 hover:underline">
          ← Back to Packages
        </Link>

        {/* Package Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
              {pkg.description && (
                <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
              )}
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[pkg.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {TYPE_LABELS[pkg.type] ?? pkg.type}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoRow label="Destination" value={pkg.destination} />
            <InfoRow label="Duration" value={`${pkg.days}D / ${pkg.nights}N`} />
            <InfoRow label="Adult Price" value={formatMYR(Number(pkg.adultPrice))} />
            <InfoRow label="Child Price" value={formatMYR(Number(pkg.childPrice))} />
          </div>
        </div>

        {/* Departures */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Departure Dates</h2>
            <p className="text-xs text-gray-400 mt-0.5">{pkg.departures.length} departure{pkg.departures.length !== 1 ? 's' : ''} configured</p>
          </div>
          {pkg.departures.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">No departure dates. Edit this package to add some.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Quota</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Booked</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Available</th>
                </tr>
              </thead>
              <tbody>
                {[...pkg.departures].sort((a, b) => a.departureDate.localeCompare(b.departureDate)).map((dep) => {
                  const available = dep.quota - dep.bookedCount;
                  const past = new Date(dep.departureDate) < new Date();
                  return (
                    <tr key={dep.id} className={`border-b border-gray-50 ${past ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {new Date(dep.departureDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {past && <span className="ml-2 text-xs text-gray-400">(past)</span>}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-600">{dep.quota}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{dep.bookedCount}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`font-semibold ${available > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {available > 0 ? available : 'Full'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Inclusions */}
        {(pkg.inclusions ?? []).length > 0 && (() => {
          const groups = (pkg.inclusions ?? []).reduce<Record<string, string[]>>((acc, item) => {
            if (!acc[item.type]) acc[item.type] = [];
            acc[item.type].push(item.value);
            return acc;
          }, {});
          const orderedTypes = [
            'Accommodation', 'Meals', 'Transport', 'Guide', 'Entrance Fees', 'Not Included',
          ].filter((t) => groups[t]);
          const extraTypes = Object.keys(groups).filter((t) => !orderedTypes.includes(t));
          const allTypes = [...orderedTypes, ...extraTypes];

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Inclusions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allTypes.map((type) => {
                  const style = INCLUSION_TYPE_STYLES[type] ?? {
                    dot: 'bg-gray-400', text: 'text-gray-700', bg: 'bg-gray-50',
                  };
                  return (
                    <div key={type} className={`rounded-xl px-4 py-3 ${style.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>{type}</p>
                      </div>
                      <ul className="space-y-1">
                        {(groups[type] ?? []).map((val, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${style.dot}`} />
                            {val}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Itinerary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Itinerary</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {sortedItinerary.length} of {pkg.days} days filled
              </p>
            </div>
            <button onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + Add Day
            </button>
          </div>

          {sortedItinerary.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400">
              No itinerary yet. Add the first day.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sortedItinerary.map((item) => (
                <div key={item.id} className="px-6 py-5 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{item.dayNumber}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)}
                        className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-100 px-2.5 py-1 rounded-lg transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(item)}
                        className="text-xs text-red-500 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                {editTarget ? 'Edit Day' : 'Add Day'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{pkg.name}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day Number <span className="text-red-500">*</span>
                </label>
                <input type="number" min="1" max={pkg.days} value={form.dayNumber}
                  onChange={(e) => setForm({ ...form, dayNumber: e.target.value })}
                  placeholder={`1–${pkg.days}`}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {usedDays.size > 0 && !editTarget && (
                  <p className="text-xs text-gray-400 mt-1">
                    Used: {[...usedDays].sort((a, b) => a - b).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Arrival & City Tour"
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea rows={4} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe activities and highlights for this day..."
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                  {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Day'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Day</h2>
            <p className="text-sm text-gray-600 mb-5">
              Delete <span className="font-medium">Day {deleteTarget.dayNumber} — {deleteTarget.title}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteSubmitting}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
