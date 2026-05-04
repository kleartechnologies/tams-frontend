'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { TweaksProvider, useTweaks } from '@/components/TweaksContext';
import { BrandingProvider } from '@/components/BrandingContext';
import { ToastProvider } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { tweaks, setTweaks } = useTweaks();
  const [checked, setChecked] = useState(false);

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
        const res = await api.get<{ hasProfile: boolean; agencyId?: string }>('/auth/me');
        if (!res.data.hasProfile || !res.data.agencyId) {
          console.log('[AppShell] no profile → /register');
          router.push('/register');
          return;
        }
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
      if (event === 'SIGNED_OUT') router.push('/login');
    });

    return () => listener.subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) return null;

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
      <div className={appClass} style={cssVars}>
        <Sidebar
          collapsed={tweaks.sidebarCollapsed}
          setCollapsed={(v) => setTweaks(t => ({ ...t, sidebarCollapsed: v }))}
        />
        <div className="main">
          <Header />
          <main className="page">
            {children}
          </main>
        </div>
      </div>
    </BrandingProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TweaksProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </TweaksProvider>
  );
}
