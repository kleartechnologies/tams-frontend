'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { STATUS } from 'react-joyride';
import { useOnboarding } from '@/components/OnboardingContext';
import type { Step } from 'react-joyride';
import type { EventData } from 'react-joyride';

const Joyride = dynamic(() => import('react-joyride').then(m => m.Joyride), { ssr: false });

const BASE_STEPS: Step[] = [
  {
    target: '.kpi-row',
    title: 'Your agency at a glance',
    content: 'Live stats: total revenue, bookings, outstanding balance, and customer count — updated in real time.',
    placement: 'bottom',
  },
  {
    target: '#sb-nav-packages',
    title: 'Manage packages',
    content: 'Create and manage your travel packages — Umrah, Hajj, group tours, and private trips.',
    placement: 'right',
  },
  {
    target: '#sb-nav-bookings',
    title: 'Track every booking',
    content: 'Create bookings, track departure dates, add travelers, and manage payments all in one place.',
    placement: 'right',
  },
  {
    target: '#sb-nav-payments',
    title: 'Payment verification',
    content: 'Review pending payments from customers and verify them with one click.',
    placement: 'right',
  },
  {
    target: '.quick-actions',
    title: 'Quick actions',
    content: 'Jump straight to creating a booking, adding a customer, or listing a new package from here.',
    placement: 'top',
  },
  {
    target: '#sb-nav-team',
    title: 'Manage your team',
    content: 'Invite team members and assign roles — Admins have full access, Staff have limited access.',
    placement: 'right',
  },
];

const joyrideStyles = {
  options: {
    primaryColor: '#4f46e5',
    borderRadius: 12,
    zIndex: 10000,
    width: 320,
  },
  tooltip: {
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.15)',
    fontSize: 13,
    padding: '16px 18px',
  } as React.CSSProperties,
  tooltipTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  } as React.CSSProperties,
  tooltipContent: {
    padding: '4px 0 0',
    lineHeight: 1.5,
  } as React.CSSProperties,
  buttonNext: {
    borderRadius: 8,
    fontSize: 13,
    padding: '7px 14px',
  } as React.CSSProperties,
  buttonBack: {
    fontSize: 13,
    marginRight: 8,
  } as React.CSSProperties,
  buttonSkip: {
    fontSize: 12,
  } as React.CSSProperties,
};

export default function ProductTour() {
  const { isTourRunning, completeTour } = useOnboarding();
  const [domReady, setDomReady] = useState(false);

  useEffect(() => {
    if (!isTourRunning) {
      setDomReady(false);
      return;
    }
    const t = setTimeout(() => setDomReady(true), 400);
    return () => clearTimeout(t);
  }, [isTourRunning]);

  const steps = useMemo((): Step[] => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return BASE_STEPS;
    return BASE_STEPS.map(s => ({ ...s, placement: 'bottom' as const }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvent = useCallback((data: EventData) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTour();
    }
  }, [completeTour]);

  if (!isTourRunning || !domReady) return null;

  return (
    <Joyride
      steps={steps}
      run={true}
      continuous
      scrollToFirstStep
      styles={joyrideStyles}
      locale={{
        skip: 'Skip tour',
        last: 'Done',
        next: 'Next →',
        back: '← Back',
      }}
      options={{
        buttons: ['back', 'close', 'primary', 'skip'],
        skipBeacon: true,
        showProgress: true,
        overlayClickAction: 'close',
        primaryColor: '#4f46e5',
        zIndex: 10000,
      }}
      onEvent={handleEvent}
    />
  );
}
