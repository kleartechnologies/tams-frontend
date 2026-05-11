import api from './api';

// ── Query key factories ──────────────────────────────────────────────────────
// Centralised so cache invalidation is consistent across all components.

export const qk = {
  dashboard:  (from: string, to: string) => ['dashboard', from, to]  as const,
  settings:   ()                         => ['settings']              as const,
  planUsage:  ()                         => ['planUsage']             as const,
  customers:  (params: object)           => ['customers', params]     as const,
  packages:   (params: object)           => ['packages',  params]     as const,
  bookings:   (params: object)           => ['bookings',  params]     as const,
  booking:    (id: string)               => ['booking',   id]         as const,
  payments:   (params: object)           => ['payments',  params]     as const,
  reports:    (from: string, to: string) => ['reports',   from, to]  as const,
  pendingPayments: ()                    => ['pendingPayments']       as const,
};

// ── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchDashboard(from: string, to: string) {
  // Combined endpoint handles summary, upcoming, outstanding, topPackages in parallel server-side.
  // Recent bookings is separate (different service / pagination).
  const [dash, recent] = await Promise.all([
    api.get(`/reports/dashboard?from=${from}&to=${to}`).then((r) => r.data),
    api.get('/bookings?page=1&limit=8').then((r) => r.data),
  ]);
  return { ...dash, recentBookings: recent.data ?? [] };
}

// Revenue trend uses a fixed 6-month window independent of the range selector
export const fetchRevenueTrend = (from: string) =>
  api.get(`/reports/revenue-trend?from=${from}`).then((r) => r.data);

export const fetchSettings  = () => api.get('/settings').then((r) => r.data);
export const fetchPlanUsage = () => api.get('/plans/usage').then((r) => r.data);
export const fetchCustomers = (params: object) =>
  api.get('/customers', { params }).then((r) => r.data);
export const fetchPackages  = (params: object) =>
  api.get('/packages', { params }).then((r) => r.data);
