'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { qk, fetchOnboarding } from '@/lib/queries';

export interface OnboardingProgress {
  onboardingCompleted: boolean;
  tourCompleted: boolean;
  checklistDismissed: boolean;
  hasCreatedPackage: boolean;
  hasCreatedBooking: boolean;
  hasAddedPayment: boolean;
  hasGeneratedInvoice: boolean;
  hasInvitedTeamMember: boolean;
}

type ChecklistKey = 'hasCreatedPackage' | 'hasCreatedBooking' | 'hasAddedPayment' | 'hasGeneratedInvoice' | 'hasInvitedTeamMember';

const DEFAULTS: OnboardingProgress = {
  onboardingCompleted: false,
  tourCompleted: false,
  checklistDismissed: false,
  hasCreatedPackage: false,
  hasCreatedBooking: false,
  hasAddedPayment: false,
  hasGeneratedInvoice: false,
  hasInvitedTeamMember: false,
};

interface OnboardingContextValue {
  progress: OnboardingProgress | null;
  isTourRunning: boolean;
  markComplete: (key: ChecklistKey) => void;
  completeOnboarding: () => void;
  startTour: () => void;
  completeTour: () => void;
  dismissChecklist: () => void;
  showChecklist: () => void;
  resetProgress: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

interface OnboardingProviderProps {
  children: React.ReactNode;
  initialData?: Record<string, unknown> | null;
}

export function OnboardingProvider({ children, initialData }: OnboardingProviderProps) {
  const queryClient = useQueryClient();
  const [isTourRunning, setIsTourRunning] = useState(false);
  const patchInFlight = useRef(false);

  const seedData = initialData ? { ...DEFAULTS, ...initialData } as OnboardingProgress : undefined;

  const { data: progress } = useQuery({
    queryKey: qk.onboarding(),
    queryFn: fetchOnboarding,
    initialData: seedData,
    staleTime: Infinity,
    select: (d) => ({ ...DEFAULTS, ...(d as Record<string, unknown>) }) as OnboardingProgress,
  });

  const patch = useCallback((update: Partial<OnboardingProgress>) => {
    queryClient.setQueryData(qk.onboarding(), (old: OnboardingProgress | undefined) => ({
      ...DEFAULTS,
      ...(old ?? {}),
      ...update,
    }));
    if (patchInFlight.current) return;
    patchInFlight.current = true;
    api.patch('/onboarding', update).finally(() => { patchInFlight.current = false; });
  }, [queryClient]);

  const markComplete = useCallback((key: ChecklistKey) => {
    const current = queryClient.getQueryData<OnboardingProgress>(qk.onboarding());
    if (current?.[key]) return;
    patch({ [key]: true });
  }, [patch, queryClient]);

  const completeOnboarding = useCallback(() => {
    patch({ onboardingCompleted: true });
  }, [patch]);

  const startTour = useCallback(() => {
    setIsTourRunning(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsTourRunning(false);
    patch({ tourCompleted: true });
  }, [patch]);

  const dismissChecklist = useCallback(() => {
    patch({ checklistDismissed: true });
  }, [patch]);

  const showChecklist = useCallback(() => {
    patch({ checklistDismissed: false });
  }, [patch]);

  const resetProgress = useCallback(async () => {
    await api.post('/onboarding/reset');
    await queryClient.invalidateQueries({ queryKey: qk.onboarding() });
    setIsTourRunning(false);
  }, [queryClient]);

  return (
    <OnboardingContext.Provider value={{
      progress: progress ?? null,
      isTourRunning,
      markComplete,
      completeOnboarding,
      startTour,
      completeTour,
      dismissChecklist,
      showChecklist,
      resetProgress,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}
