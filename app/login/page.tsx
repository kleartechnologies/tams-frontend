'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { LeftPanel } from '@/components/auth/LeftPanel';
import { InputField } from '@/components/auth/InputField';
import { SocialButton } from '@/components/auth/SocialButton';

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Left panel card icons ─────────────────────────────────────────────────────

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const translations = {
  en: {
    welcome: 'Welcome back',
    subtitle: 'Sign in to manage your travel agency.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@agency.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    orContinue: 'OR CONTINUE WITH',
    google: 'Continue with Google',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    newToTams: 'New to TAMS?',
    createAccount: 'Create an account',
    errorInvalid: 'Invalid email or password. Please try again.',
    errorProfile: 'Could not reach the server. Please check your connection.',
  },
  bm: {
    welcome: 'Selamat kembali',
    subtitle: 'Log masuk untuk mengurus agensi pelancongan anda.',
    emailLabel: 'Emel',
    emailPlaceholder: 'anda@agensi.com',
    passwordLabel: 'Kata laluan',
    passwordPlaceholder: '••••••••',
    rememberMe: 'Ingat saya',
    forgotPassword: 'Lupa kata laluan?',
    signIn: 'Log Masuk',
    signingIn: 'Sedang log masuk…',
    orContinue: 'ATAU TERUSKAN DENGAN',
    google: 'Teruskan dengan Google',
    noAccount: 'Belum ada akaun?',
    signUp: 'Daftar',
    newToTams: 'Baru di TAMS?',
    createAccount: 'Cipta akaun',
    errorInvalid: 'Emel atau kata laluan tidak sah.',
    errorProfile: 'Tidak dapat menghubungi pelayan.',
  },
} as const;

type Lang = keyof typeof translations;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[TAMS] Missing Supabase environment variables — Google login will not work');
  }

  useEffect(() => {
    const saved = localStorage.getItem('tams-lang') as Lang | null;
    if (saved && saved in translations) setLang(saved);
  }, []);

  function switchLang(l: Lang) {
    setLang(l);
    localStorage.setItem('tams-lang', l);
  }

  const t = translations[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const failsafe = setTimeout(() => setLoading(false), 10_000);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(t.errorInvalid);
        clearTimeout(failsafe);
        setLoading(false);
        return;
      }

      const res = await api.get<{ hasProfile: boolean; agencyId?: string }>('/auth/me');
      if (!res.data.hasProfile || !res.data.agencyId) {
        router.push('/register');
        return;
      }
      router.push('/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'unknown';
      setError(`[${status ?? 'network'}] ${msg}`);
      clearTimeout(failsafe);
      setLoading(false);
    }
  }

  async function handleGoogle() {
    console.log('[TAMS] Google login clicked');
    setError('');
    setGoogleLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback`;
    console.log('[TAMS] OAuth redirectTo:', redirectTo);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (oauthError) {
      console.error('[TAMS] Google OAuth error:', oauthError.message);
      setError(`Google sign-in failed: ${oauthError.message}`);
      setGoogleLoading(false);
    } else {
      console.log('[TAMS] Redirecting to Google…');
      // Browser will navigate away — no need to setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <LeftPanel
        badge="Trusted by travel agencies in Malaysia"
        headline={<>Welcome<br />back to TAMS. ✈️</>}
        subtext="Sign in to manage your bookings, customers, and payments — all in one calm, organised place."
        features={[
          'Manage bookings easily',
          'Track payments in real time',
          'Generate SST-ready invoices instantly',
        ]}
        card1={{
          icon: <CheckCircleIcon />,
          label: 'Invoice paid',
          value: 'RM 4,820',
          iconBg: 'bg-green-500/20',
        }}
        card2={{
          icon: <BriefcaseIcon />,
          label: 'New booking',
          value: 'Umrah · 12D',
          iconBg: 'bg-blue-500/20',
        }}
        bottomStat="4.9 from 200+ Malaysian agencies"
        bottomRight="SST ready · Cancel anytime"
      />

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col bg-white min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          {/* Language toggle */}
          <div
            className="flex rounded-lg p-0.5 gap-0.5"
            style={{ background: '#F1F3F6' }}
          >
            {(['en', 'bm'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={[
                  'px-3 py-1.5 rounded-md text-[12px] font-semibold transition',
                  lang === l
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sign up link */}
          <p className="text-[13.5px] text-gray-500">
            {t.noAccount}{' '}
            <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition">
              {t.signUp}
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-8 py-6">
          <div className="w-full max-w-[400px]">

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
                {t.welcome}
              </h2>
              <p className="mt-1.5 text-[14px] text-gray-500">{t.subtitle}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Email */}
              <InputField
                label={t.emailLabel}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                leftIcon={<EnvelopeIcon />}
              />

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[13.5px] font-semibold text-gray-700">
                    {t.passwordLabel}
                  </label>
                  <button
                    type="button"
                    className="text-[13px] font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <InputField
                  label=""
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  leftIcon={<LockIcon />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      <EyeIcon off={showPassword} />
                    </button>
                  }
                  style={{ paddingRight: '2.75rem' }}
                />
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[13.5px] text-gray-600">{t.rememberMe}</span>
              </label>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13.5px] text-red-600"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}
              >
                {loading && <SpinnerIcon />}
                {loading ? t.signingIn : t.signIn}
              </button>

            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] font-semibold tracking-widest text-gray-400">{t.orContinue}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google button */}
            <SocialButton onClick={handleGoogle} loading={googleLoading} disabled={loading}>
              {t.google}
            </SocialButton>

            {/* Bottom link */}
            <p className="mt-6 text-center text-[13.5px] text-gray-500">
              {t.newToTams}{' '}
              <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700 transition">
                {t.createAccount}
              </Link>
            </p>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4">
          <span className="text-[12px] text-gray-400">© 2026 TAMS Sdn Bhd</span>
          <div className="flex items-center gap-3 text-[12px] text-gray-400">
            <button className="hover:text-gray-600 transition">Privacy</button>
            <span>·</span>
            <button className="hover:text-gray-600 transition">Terms</button>
            <span>·</span>
            <button className="hover:text-gray-600 transition">Help</button>
          </div>
        </div>

      </div>
    </div>
  );
}
