'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Check for error params Supabase sends back on failure
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get('error');
      const errorDescription = params.get('error_description');

      if (oauthError) {
        console.error('[TAMS] OAuth callback error:', oauthError, errorDescription);
        if (!cancelled) {
          setErrorMessage(errorDescription?.replace(/\+/g, ' ') ?? oauthError);
          setStatus('error');
          setTimeout(() => router.push('/login'), 4000);
        }
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !session) {
        console.error('[TAMS] No session after OAuth:', error?.message);
        setErrorMessage(error?.message ?? 'No session returned');
        setStatus('error');
        setTimeout(() => router.push('/login'), 4000);
        return;
      }

      console.log('[TAMS] Session established, checking profile…');

      try {
        const res = await api.get<{ hasProfile: boolean; agencyId?: string }>('/auth/me');
        if (!res.data.hasProfile || !res.data.agencyId) {
          router.push('/register');
        } else {
          router.push('/dashboard');
        }
      } catch {
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
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ color: 'var(--rose, #e11d48)', fontSize: 14, marginBottom: 8 }}>
            Authentication failed. Redirecting to login…
          </div>
          {errorMessage && (
            <div style={{
              fontSize: 12,
              color: '#888',
              background: '#111',
              border: '1px solid #333',
              borderRadius: 8,
              padding: '8px 12px',
              marginTop: 8,
              wordBreak: 'break-word',
            }}>
              {errorMessage}
            </div>
          )}
          <button
            onClick={() => router.push('/login')}
            style={{
              marginTop: 16,
              fontSize: 13,
              color: '#60a5fa',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Go back to login
          </button>
        </div>
      )}
    </div>
  );
}
