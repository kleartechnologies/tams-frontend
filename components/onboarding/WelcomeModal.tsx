'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/components/OnboardingContext';

const STEPS = [
  'Create your first travel package',
  'Create your first booking',
  'Record a customer payment',
  'Generate a professional invoice',
  'Invite your team members',
];

export default function WelcomeModal() {
  const { progress, completeOnboarding, startTour } = useOnboarding();

  const show = progress !== null && !progress.onboardingCompleted;

  function handleStartTour() {
    completeOnboarding();
    startTour();
  }

  function handleSkip() {
    completeOnboarding();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            background: 'rgba(0,0,0,0.45)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <motion.div
            key="welcome-card"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              background: 'var(--canvas)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              width: '100%',
              maxWidth: 440,
              padding: '32px 28px 28px',
            }}
          >
            {/* Logo mark */}
            <div style={{
              width: 44, height: 44,
              borderRadius: 12,
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.2 }}>
              Welcome to TAMS 👋
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-4)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Set up your travel agency in minutes.
            </p>

            {/* Steps preview */}
            <div style={{
              background: 'var(--bg)',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9,
                    border: '1.5px solid var(--line)',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>{step}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartTour}
                style={{ flex: 1, minWidth: 140, padding: '10px 16px', fontSize: 14, fontWeight: 600 }}
              >
                Start Tour
              </button>
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  flex: 1, minWidth: 120,
                  padding: '10px 16px', fontSize: 14,
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--ink-4)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                I&apos;ll explore myself
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
