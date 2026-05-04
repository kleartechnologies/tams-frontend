'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

/**
 * Handles the redirect from Supabase OAuth (Google).
 * Supabase automatically detects the code/token in the URL and
 * establishes the session. We then check if the user has an agency
 * profile and route accordingly.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Give Supabase a moment to process the URL hash/params
      const { data: { session }, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !session) {
        setStatus('error');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // Mirror the same profile check as the password login flow
      try {
        const res = await api.get<{ hasProfile: boolean; agencyId?: string }>('/auth/me');
        if (!res.data.hasProfile || !res.data.agencyId) {
          router.push('/register');
        } else {
          router.push('/dashboard');
        }
      } catch {
        // If the profile check fails, send to dashboard and let it handle it
        router.push('/dashboard');
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'var(--bg)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {status === 'loading' ? (
        <>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent), oklch(0.42 0.18 255))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 17,
          }}>T</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 0.7s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Signing you in…
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : (
        <div style={{ color: 'var(--rose)', fontSize: 14 }}>
          Authentication failed. Redirecting to login…
        </div>
      )}
    </div>
  );
}
