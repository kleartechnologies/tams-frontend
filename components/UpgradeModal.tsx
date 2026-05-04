'use client';

import { useEffect, useState } from 'react';
import { X, Zap, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { PLANS, type PlanUsage } from '@/lib/plans';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional override message shown at the top of the modal */
  reason?: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  FREE:   ['1 team member', '3 bookings/month', 'Core dashboard', 'PDF invoices'],
  GROWTH: ['5 team members', '300 bookings/month', 'Everything in Free', 'Priority support'],
  PRO:    ['10 team members', 'Unlimited bookings', 'Everything in Growth', 'Dedicated onboarding'],
};

export default function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  useEffect(() => {
    if (!open) return;
    api.get<PlanUsage>('/plans/usage')
      .then((r) => setUsage(r.data))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const currentPlan = usage?.plan ?? 'FREE';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540,
        boxShadow: '0 24px 64px rgba(15,23,42,0.18)', overflow: 'hidden',
        animation: 'slideUp 0.22s cubic-bezier(0,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap size={18} color="#2563eb" />
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Upgrade your plan</span>
            </div>
            {reason ? (
              <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 500, margin: 0 }}>{reason}</p>
            ) : (
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                You're on the <strong>{usage?.planName ?? 'Free'}</strong> plan.
                {usage && !usage.maxBookings && (
                  <> Using <strong>{usage.monthlyBookings}</strong> of{' '}
                  <strong>{usage.maxBookings}</strong> bookings this month.</>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: '#9ca3af' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Usage snapshot */}
        {usage && (
          <div style={{ margin: '16px 24px 0', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Bookings this month</span>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginTop: 2 }}>
                  {usage.monthlyBookings}
                  {usage.maxBookings !== null ? `/${usage.maxBookings}` : ' (unlimited)'}
                </div>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Team members</span>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginTop: 2 }}>
                  {usage.totalUsers}/{usage.maxUsers}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '20px 24px 24px' }}>
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]][]).map(([key, plan]) => {
            const isCurrent = key === currentPlan;
            const isDowngrade = ['FREE', 'GROWTH', 'PRO'].indexOf(key) < ['FREE', 'GROWTH', 'PRO'].indexOf(currentPlan);

            return (
              <div
                key={key}
                style={{
                  borderRadius: 14,
                  border: `2px solid ${isCurrent ? '#2563eb' : '#e5e7eb'}`,
                  background: isCurrent ? '#eff6ff' : '#fafafa',
                  padding: '16px 14px',
                  position: 'relative',
                  opacity: isDowngrade && !isCurrent ? 0.55 : 1,
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: 'absolute', top: -1, right: 10,
                    background: '#2563eb', color: '#fff',
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                    padding: '2px 7px', borderRadius: '0 0 6px 6px',
                  }}>
                    CURRENT
                  </span>
                )}
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 2 }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                  {key === 'FREE' ? 'Free forever' : key === 'GROWTH' ? 'Best for growing agencies' : 'For power users'}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(PLAN_FEATURES[key] ?? []).map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5, color: '#374151' }}>
                      <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && !isDowngrade && (
                  <button
                    onClick={() => {
                      // Stripe integration goes here — for now just close + show intent
                      alert(`Upgrade to ${plan.name} — Stripe integration coming soon.`);
                    }}
                    style={{
                      width: '100%', padding: '7px 0', borderRadius: 8,
                      background: '#2563eb', color: '#fff', border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Upgrade to {plan.name}
                  </button>
                )}
                {isCurrent && (
                  <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>Active</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
