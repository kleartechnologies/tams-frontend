'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useOnboarding } from '@/components/OnboardingContext';

interface ChecklistItem {
  key: 'hasCreatedPackage' | 'hasCreatedBooking' | 'hasAddedPayment' | 'hasGeneratedInvoice' | 'hasInvitedTeamMember';
  label: string;
  cta: string;
  href: string;
}

const ITEMS: ChecklistItem[] = [
  { key: 'hasCreatedPackage',    label: 'Create your first package',     cta: 'Create Package', href: '/packages' },
  { key: 'hasCreatedBooking',    label: 'Create your first booking',     cta: 'New Booking',    href: '/bookings/create' },
  { key: 'hasAddedPayment',      label: 'Record a payment',              cta: 'View Bookings',  href: '/bookings' },
  { key: 'hasGeneratedInvoice',  label: 'Generate an invoice',           cta: 'Go to Bookings', href: '/bookings' },
  { key: 'hasInvitedTeamMember', label: 'Invite a team member',          cta: 'Invite Team',    href: '/settings/team' },
];

export default function OnboardingChecklist() {
  const { progress, dismissChecklist } = useOnboarding();

  if (!progress || progress.checklistDismissed) return null;

  const completed = ITEMS.filter(item => progress[item.key]).length;
  const allDone = completed === ITEMS.length;
  const pct = (completed / ITEMS.length) * 100;

  return (
    <div style={{
      background: 'var(--canvas)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: '18px 20px',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Get Started</span>
        <button
          type="button"
          onClick={dismissChecklist}
          aria-label="Dismiss checklist"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--ink-5)', fontSize: 18, lineHeight: 1,
            padding: '0 2px', display: 'flex', alignItems: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{
          height: 3, borderRadius: 2,
          background: 'var(--line)',
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ height: '100%', background: 'var(--accent)', borderRadius: 2 }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '6px 0 0' }}>
          {completed} of {ITEMS.length} completed
        </p>
      </div>

      {/* All done state */}
      {allDone ? (
        <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
            🎉 All set! Your agency is ready.
          </p>
          <button
            type="button"
            onClick={dismissChecklist}
            className="btn-primary"
            style={{ fontSize: 13, padding: '8px 20px' }}
          >
            Close
          </button>
        </div>
      ) : (
        /* Checklist items */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 }}>
          {ITEMS.map(item => {
            const done = progress[item.key];
            return (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                {/* Circle check */}
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  border: done ? 'none' : '1.5px solid var(--line)',
                  background: done ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Label */}
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  color: done ? 'var(--ink-5)' : 'var(--ink)',
                  textDecoration: done ? 'line-through' : 'none',
                }}>
                  {item.label}
                </span>

                {/* CTA — only when incomplete */}
                {!done && (
                  <Link
                    href={item.href}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--accent)',
                      padding: '3px 8px',
                      border: '1px solid var(--accent)',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                    }}
                  >
                    {item.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
