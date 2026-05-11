'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { type PlanUsage } from '@/lib/plans';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubscriptionInfo {
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
    features: ['3 bookings / month', '1 team member', 'Core dashboard', 'Customer management', 'PDF invoices'],
    color: '#374151',
    bg: '#f9fafb',
    border: '#e5e7eb',
    btnBg: '#f3f4f6',
    btnColor: '#374151',
  },
  {
    key: 'GROWTH',
    name: 'Growth',
    price: 99,
    features: ['300 bookings / month', '5 team members', 'Payment tracking & SST', 'Reports & analytics', 'Priority support'],
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#3b82f6',
    btnBg: '#2563eb',
    btnColor: '#ffffff',
    popular: true,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: 199,
    features: ['Unlimited bookings', '10 team members', 'Advanced reports', 'Dedicated onboarding', 'Everything in Growth'],
    color: '#0f172a',
    bg: 'linear-gradient(to bottom, #0f172a, #1e293b)',
    border: 'transparent',
    btnBg: '#ffffff',
    btnColor: '#0f172a',
    dark: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const successParam = searchParams.get('success');
  const planParam = searchParams.get('plan');

  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(successParam === 'true');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, subRes] = await Promise.all([
        api.get<PlanUsage>('/plans/usage'),
        api.get<SubscriptionInfo>('/stripe/subscription'),
      ]);
      setUsage(usageRes.data);
      setSub(subRes.data);
    } catch {
      setError('Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  }, []);

  // After returning from Stripe checkout: sync from Stripe then poll until plan changes.
  useEffect(() => {
    if (successParam !== 'true') {
      load();
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // 30 seconds

    async function syncAndPoll() {
      setSyncing(true);

      // Trigger an immediate server-side sync from Stripe
      try {
        await api.post('/stripe/sync');
      } catch {
        // Non-fatal — webhook may have already fired
      }

      const poll = async (): Promise<void> => {
        if (cancelled) return;

        try {
          const res = await api.get<PlanUsage>('/plans/usage');
          if (res.data.plan !== 'FREE' || attempts >= MAX_ATTEMPTS) {
            setSyncing(false);
            await load();
            return;
          }
        } catch {
          if (attempts >= MAX_ATTEMPTS) {
            setSyncing(false);
            await load();
            return;
          }
        }

        attempts++;
        pollRef.current = setTimeout(poll, 2000);
      };

      await poll();
    }

    syncAndPoll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear query params after showing success banner
  useEffect(() => {
    if (successParam === 'true') {
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('plan');
      router.replace(url.pathname);
    }
  }, [successParam, router]);

  const handleUpgrade = async (planKey: 'GROWTH' | 'PRO') => {
    setUpgrading(planKey);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/stripe/checkout', { planKey });
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to start checkout. Please try again.');
      setUpgrading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await api.post<{ url: string }>('/stripe/portal');
      window.location.href = res.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to open billing portal.');
      setPortalLoading(false);
    }
  };

  const currentPlanKey = usage?.plan ?? 'FREE';
  const isPaid = currentPlanKey !== 'FREE';

  const renewalDate = sub?.subscription?.currentPeriodEnd
    ? new Date(sub.subscription.currentPeriodEnd).toLocaleDateString('en-MY', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  if (loading || syncing) {
    return (
      <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <SpinnerIcon />
        {syncing && (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Activating your plan&hellip;
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Billing &amp; Plan</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          Manage your subscription and upgrade your plan.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>✓</span>
          <span style={{ fontSize: 14, color: '#15803d', fontWeight: 500 }}>
            Subscription activated! Your plan has been upgraded.
          </span>
          <button onClick={() => setSuccess(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 10,
          background: '#fef2f2', border: '1px solid #fecaca',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 14, color: '#dc2626' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Current plan summary */}
      <div style={{
        marginBottom: 36, padding: '20px 24px', borderRadius: 12,
        border: '1px solid #e5e7eb', background: '#ffffff',
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current plan</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
            {usage?.planName ?? '—'}
            {sub?.subscription?.cancelAtPeriodEnd && (
              <span style={{ fontSize: 12, fontWeight: 500, color: '#f59e0b', marginLeft: 8, background: '#fffbeb', padding: '2px 8px', borderRadius: 99 }}>
                Cancels {renewalDate}
              </span>
            )}
          </p>
        </div>

        {usage && (
          <>
            <Stat
              label="Bookings this month"
              value={`${usage.monthlyBookings}${usage.maxBookings ? `/${usage.maxBookings}` : ''}`}
              warn={usage.maxBookings !== null && usage.monthlyBookings >= usage.maxBookings * 0.8}
            />
            <Stat
              label="Team members"
              value={`${usage.totalUsers}/${usage.maxUsers}`}
              warn={usage.totalUsers >= usage.maxUsers}
            />
          </>
        )}

        {renewalDate && !sub?.subscription?.cancelAtPeriodEnd && (
          <Stat label="Renews on" value={renewalDate} />
        )}

        {isPaid && (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#ffffff', color: '#374151', fontSize: 13, fontWeight: 600,
              cursor: portalLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {portalLoading ? <SpinnerIcon /> : null}
            Manage Subscription
          </button>
        )}
      </div>

      {/* Plan cards */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 20 }}>
        {currentPlanKey === 'FREE' ? 'Choose a plan' : 'Available plans'}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlanKey;
          const isHighlighted = plan.key === planParam || (plan.popular && !planParam);

          return (
            <div
              key={plan.key}
              style={{
                position: 'relative', borderRadius: 16, padding: 24,
                background: plan.bg,
                border: `${isHighlighted ? '2px' : '1px'} solid ${plan.border}`,
                boxShadow: isHighlighted ? '0 8px 32px rgba(59,130,246,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {plan.popular && !isCurrent && (
                <span style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </span>
              )}

              {isCurrent && (
                <span style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap',
                }}>
                  CURRENT PLAN
                </span>
              )}

              {/* Plan name & price */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: plan.dark ? '#ffffff' : '#111827', margin: 0, marginBottom: 8 }}>
                  {plan.name}
                </h3>
                {plan.price === 0 ? (
                  <span style={{ fontSize: 32, fontWeight: 700, color: plan.dark ? '#ffffff' : '#111827' }}>Free</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 13, color: plan.dark ? '#94a3b8' : '#6b7280' }}>RM</span>
                    <span style={{ fontSize: 32, fontWeight: 700, color: plan.dark ? '#ffffff' : '#111827' }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: plan.dark ? '#94a3b8' : '#6b7280' }}>/ month</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: plan.dark ? '#1e3a5f' : '#f3f4f6', marginBottom: 16 }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{
                      flexShrink: 0, marginTop: 2, width: 18, height: 18, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: plan.dark ? 'rgba(52,211,153,0.15)' : '#dcfce7',
                      color: plan.dark ? '#34d399' : '#16a34a',
                    }}>
                      <CheckIcon />
                    </span>
                    <span style={{ fontSize: 13, color: plan.dark ? '#cbd5e1' : '#374151' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{ marginTop: 24 }}>
                {isCurrent ? (
                  <div style={{
                    padding: '10px 0', textAlign: 'center', borderRadius: 8,
                    background: plan.dark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                    color: plan.dark ? '#94a3b8' : '#6b7280', fontSize: 13, fontWeight: 600,
                  }}>
                    Current Plan
                  </div>
                ) : plan.key === 'FREE' ? (
                  <div style={{
                    padding: '10px 0', textAlign: 'center', borderRadius: 8,
                    background: '#f9fafb', color: '#9ca3af', fontSize: 13,
                  }}>
                    {currentPlanKey !== 'FREE' ? 'Contact support to downgrade' : 'Your current plan'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key as 'GROWTH' | 'PRO')}
                    disabled={!!upgrading}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                      background: upgrading === plan.key ? '#9ca3af' : plan.btnBg,
                      color: plan.btnColor, fontSize: 13, fontWeight: 600,
                      cursor: upgrading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {upgrading === plan.key ? <SpinnerIcon /> : null}
                    {currentPlanKey === 'FREE'
                      ? `Upgrade to ${plan.name}`
                      : plan.key === 'PRO' && currentPlanKey === 'GROWTH'
                        ? `Upgrade to Pro`
                        : `Switch to ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ note */}
      <p style={{ marginTop: 32, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
        Payments are processed securely by Stripe. Cancel anytime from Manage Subscription.
      </p>
    </div>
  );
}

// ── Stat helper ───────────────────────────────────────────────────────────────

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: '#6b7280', margin: 0, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color: warn ? '#dc2626' : '#111827', margin: 0 }}>{value}</p>
    </div>
  );
}

export default function BillingPageWrapper() {
  return (
    <Suspense>
      <BillingPage />
    </Suspense>
  );
}
