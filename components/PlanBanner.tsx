'use client';

import { useQuery } from '@tanstack/react-query';
import { qk, fetchPlanUsage } from '@/lib/queries';
import { type PlanUsage } from '@/lib/plans';

interface PlanBannerProps {
  onUpgradeClick?: () => void;
  collapsed?: boolean;
}

export default function PlanBanner({ onUpgradeClick, collapsed }: PlanBannerProps) {
  const { data: usage } = useQuery<PlanUsage>({
    queryKey: qk.planUsage(),
    queryFn:  fetchPlanUsage,
    staleTime: 2 * 60_000,
  });

  if (!usage) return null;

  const isUnlimited = usage.maxBookings === null;
  const pct = isUnlimited ? 0 : Math.min((usage.monthlyBookings / usage.maxBookings!) * 100, 100);
  const nearLimit = !isUnlimited && usage.monthlyBookings >= usage.maxBookings! * 0.8;
  const atLimit   = !isUnlimited && usage.monthlyBookings >= usage.maxBookings!;

  if (collapsed) {
    return (
      <button
        onClick={onUpgradeClick}
        title={`${usage.planName} Plan — ${usage.monthlyBookings}${isUnlimited ? '' : `/${usage.maxBookings}`} bookings`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: atLimit ? '#fef2f2' : nearLimit ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${atLimit ? '#fecaca' : nearLimit ? '#fde68a' : '#bbf7d0'}`,
          cursor: onUpgradeClick ? 'pointer' : 'default',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: atLimit ? '#dc2626' : nearLimit ? '#d97706' : '#16a34a' }}>
          {usage.planName[0]}
        </span>
      </button>
    );
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${atLimit ? '#fecaca' : nearLimit ? '#fde68a' : '#e5e7eb'}`,
      background: atLimit ? '#fef2f2' : nearLimit ? '#fffbeb' : '#f9fafb',
      padding: '10px 12px',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>
          {usage.planName} Plan
        </span>
        {onUpgradeClick && usage.plan !== 'PRO' && (
          <button
            onClick={onUpgradeClick}
            style={{
              fontSize: 10, fontWeight: 600, color: '#2563eb',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Upgrade
          </button>
        )}
      </div>

      {/* Booking usage */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: 3 }}>
          <span>Bookings this month</span>
          <span style={{ fontWeight: 600, color: atLimit ? '#dc2626' : '#374151' }}>
            {usage.monthlyBookings}{isUnlimited ? '' : `/${usage.maxBookings}`}
          </span>
        </div>
        {!isUnlimited && (
          <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${pct}%`,
              background: atLimit ? '#dc2626' : nearLimit ? '#f59e0b' : '#16a34a',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>

      {/* User usage */}
      <div style={{ color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
        <span>Team members</span>
        <span style={{ fontWeight: 600, color: '#374151' }}>
          {usage.totalUsers}/{usage.maxUsers}
        </span>
      </div>

      {atLimit && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', fontWeight: 500 }}>
          Monthly limit reached. Upgrade to create more bookings.
        </div>
      )}
    </div>
  );
}
