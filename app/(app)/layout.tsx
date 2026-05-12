'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/queryClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TweaksProvider, useTweaks } from '@/components/TweaksContext';
import { BrandingProvider } from '@/components/BrandingContext';
import { ToastProvider } from '@/components/Toast';
import { OnboardingProvider } from '@/components/OnboardingContext';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import ProductTour from '@/components/onboarding/ProductTour';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { tweaks, setTweaks } = useTweaks();
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [initOnboarding, setInitOnboarding] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    console.log('[AppShell] mount — checking auth');

    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.log('[AppShell] no session → /login');
        router.push('/login');
        return;
      }

      // Verify the user has a backend profile with an agencyId
      try {
        console.log('[AppShell] calling /auth/me');
        const res = await api.get<{ hasProfile: boolean; agencyId?: string; onboardingProgress?: Record<string, unknown> }>('/auth/me');
        if (!res.data.hasProfile || !res.data.agencyId) {
          console.log('[AppShell] no profile → /register');
          router.push('/register');
          return;
        }
        setInitOnboarding(res.data.onboardingProgress ?? {});
      } catch {
        console.log('[AppShell] /auth/me failed → /login');
        router.push('/login');
        return;
      }

      setChecked(true);
    }

    checkAuth();

    // Only redirect on explicit sign-out; INITIAL_SESSION is handled by checkAuth above
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      console.log('[AppShell] auth state change:', event);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('tams-branding');
        router.push('/login');
      }
    });

    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) {
    return (
      <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{ width: 240, background: 'var(--sidebar-bg, #1a2332)', flexShrink: 0 }} />
        <div className="main" style={{ flex: 1, padding: '32px 24px' }}>
          <div className="skeleton" style={{ width: 200, height: 28, borderRadius: 6, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  const appClass = [
    'app',
    tweaks.sidebarCollapsed ? 'sb-collapsed' : '',
    tweaks.dark            ? 'is-dark'        : '',
    tweaks.density === 'comfy'   ? 'is-comfy'   : '',
    tweaks.density === 'compact' ? 'is-compact' : '',
    `cta-${tweaks.ctaTone}`,
  ].filter(Boolean).join(' ');

  const cssVars = {
    '--accent':      `oklch(0.56 0.16 ${tweaks.accentHue})`,
    '--accent-ink':  `oklch(0.42 0.14 ${tweaks.accentHue})`,
    '--accent-soft': `oklch(0.97 0.02 ${tweaks.accentHue})`,
  } as React.CSSProperties;

  return (
    <BrandingProvider>
      <OnboardingProvider initialData={initOnboarding}>
        <WelcomeModal />
        <ProductTour />
        <div className={appClass} style={cssVars}>
          {/* Backdrop — tapping it closes the mobile nav */}
          {mobileNavOpen && (
            <div
              className="mobile-nav-overlay"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          <Sidebar
            collapsed={tweaks.sidebarCollapsed}
            setCollapsed={(v) => setTweaks(t => ({ ...t, sidebarCollapsed: v }))}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
          />

          <div className="main">
            <Header onMenuOpen={() => setMobileNavOpen(true)} />
            <main className="page">
              {children}
            </main>
          </div>

          {/* Floating action button — New Booking, mobile only */}
          <a href="/bookings/create" className="btn-primary mobile-fab">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Booking
          </a>
        </div>
      </OnboardingProvider>
    </BrandingProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) clientRef.current = makeQueryClient();

  return (
    <QueryClientProvider client={clientRef.current}>
      <TweaksProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </TweaksProvider>
    </QueryClientProvider>
  );
}
