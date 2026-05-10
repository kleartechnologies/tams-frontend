'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
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

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '—', color: '#E5E7EB' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#F59E0B' };
  if (score <= 3) return { score, label: 'Good', color: '#3B82F6' };
  return { score, label: 'Strong', color: '#10B981' };
}

// ── i18n ──────────────────────────────────────────────────────────────────────

const translations = {
  en: {
    title: 'Start your journey with TAMS',
    subtitle: 'Manage bookings, customers, and payments in one place.',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Aisha',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Rahman',
    companyLabel: 'Company / Agency name',
    companyPlaceholder: 'Pelangi Tours Sdn Bhd',
    emailLabel: 'Email',
    emailPlaceholder: 'you@agency.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    strengthHint: '8+ chars, mix letters & numbers',
    terms1: 'I agree to the ',
    termsLink: 'Terms of Service',
    terms2: ' and ',
    privacyLink: 'Privacy Policy',
    createAccount: 'Create account & start trial',
    creatingAccount: 'Creating account…',
    orSignUp: 'OR SIGN UP WITH',
    google: 'Continue with Google',
    alreadyHave: 'Already have an account?',
    signIn: 'Sign in',
    errorMatch: 'Passwords do not match.',
    errorShort: 'Password must be at least 8 characters.',
    errorAgency: 'Agency name is required.',
    errorGeneral: 'Something went wrong. Please try again.',
  },
  bm: {
    title: 'Mulakan perjalanan anda dengan TAMS',
    subtitle: 'Urus tempahan, pelanggan dan pembayaran dalam satu tempat.',
    firstNameLabel: 'Nama pertama',
    firstNamePlaceholder: 'Aisha',
    lastNameLabel: 'Nama keluarga',
    lastNamePlaceholder: 'Rahman',
    companyLabel: 'Nama syarikat / agensi',
    companyPlaceholder: 'Pelangi Tours Sdn Bhd',
    emailLabel: 'Emel',
    emailPlaceholder: 'anda@agensi.com',
    passwordLabel: 'Kata laluan',
    passwordPlaceholder: 'Sekurang-kurangnya 8 aksara',
    strengthHint: '8+ aksara, campuran huruf & nombor',
    terms1: 'Saya bersetuju dengan ',
    termsLink: 'Terma Perkhidmatan',
    terms2: ' dan ',
    privacyLink: 'Dasar Privasi',
    createAccount: 'Cipta akaun & mulakan percubaan',
    creatingAccount: 'Mencipta akaun…',
    orSignUp: 'ATAU DAFTAR DENGAN',
    google: 'Teruskan dengan Google',
    alreadyHave: 'Sudah ada akaun?',
    signIn: 'Log Masuk',
    errorMatch: 'Kata laluan tidak sepadan.',
    errorShort: 'Kata laluan mestilah sekurang-kurangnya 8 aksara.',
    errorAgency: 'Nama agensi diperlukan.',
    errorGeneral: 'Sesuatu yang tidak kena berlaku. Sila cuba lagi.',
  },
} as const;

type Lang = keyof typeof translations;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  const strength = getStrength(password);

  useEffect(() => {
    const saved = localStorage.getItem('tams-lang') as Lang | null;
    if (saved && saved in translations) setLang(saved);
    return () => { if (failsafeRef.current) clearTimeout(failsafeRef.current); };
  }, []);

  function switchLang(l: Lang) {
    setLang(l);
    localStorage.setItem('tams-lang', l);
  }

  const t = translations[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!agencyName.trim()) { setError(t.errorAgency); return; }
    if (password.length < 8) { setError(t.errorShort); return; }

    setError('');
    setLoading(true);
    failsafeRef.current = setTimeout(() => {
      setLoading(false);
      setError(t.errorGeneral);
    }, 15_000);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
        },
      });

      if (signUpError) {
        clearTimeout(failsafeRef.current!);
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!signUpData.session) {
        clearTimeout(failsafeRef.current!);
        setError('Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      try {
        await api.post('/auth/register', { agencyName });
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 409) {
          clearTimeout(failsafeRef.current!);
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(msg ?? t.errorGeneral);
          setLoading(false);
          return;
        }
      }

      router.push(planParam ? `/billing?plan=${planParam}` : '/dashboard');
    } catch {
      clearTimeout(failsafeRef.current!);
      setError(t.errorGeneral);
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setGoogleLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <LeftPanel
        badge="Start your 7-day free trial"
        headline="Run your travel agency without the spreadsheets."
        subtext="Bookings, customers, payments, and SST-ready invoices — all in one calm, organised place."
        features={[
          'Free for 7 days, no credit card required',
          'Set up your agency in under 5 minutes',
          'Cancel anytime — no contracts, no surprises',
        ]}
        card1={{
          icon: <CheckCircleIcon />,
          label: 'Saved per week',
          value: '12 hrs',
          iconBg: 'bg-green-500/20',
        }}
        card2={{
          icon: <ClockIcon />,
          label: 'Setup time',
          value: '~5 min',
          iconBg: 'bg-blue-500/20',
        }}
        bottomStat="Loved by 200+ Malaysian agencies"
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

          {/* Sign in link */}
          <p className="text-[13.5px] text-gray-500">
            {t.alreadyHave}{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition">
              {t.signIn}
            </Link>
          </p>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-8 py-6">
          <div className="w-full max-w-[440px]">

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
                {t.title}
              </h2>
              <p className="mt-1.5 text-[14px] text-gray-500">{t.subtitle}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* First + Last name row */}
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label={t.firstNameLabel}
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t.firstNamePlaceholder}
                />
                <InputField
                  label={t.lastNameLabel}
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t.lastNamePlaceholder}
                />
              </div>

              {/* Company / Agency name */}
              <InputField
                label={t.companyLabel}
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder={t.companyPlaceholder}
                leftIcon={<BuildingIcon />}
              />

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

              {/* Password with strength */}
              <div className="flex flex-col gap-1.5">
                <InputField
                  label={t.passwordLabel}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                {/* Strength bar */}
                <div>
                  <div className="h-1 rounded-full overflow-hidden bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: password ? `${(strength.score / 5) * 100}%` : '0%',
                        background: strength.color,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11.5px] text-gray-400">
                      Strength:{' '}
                      <span style={{ color: password ? strength.color : undefined }}>
                        {strength.label}
                      </span>
                    </span>
                    <span className="text-[11.5px] text-gray-400">{t.strengthHint}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <span className="text-[13.5px] text-gray-600 leading-snug">
                  {t.terms1}
                  <button type="button" className="font-medium text-blue-600 hover:underline">{t.termsLink}</button>
                  {t.terms2}
                  <button type="button" className="font-medium text-blue-600 hover:underline">{t.privacyLink}</button>
                  .
                </span>
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

              {/* Create account button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}
              >
                {loading && <SpinnerIcon />}
                {loading ? t.creatingAccount : t.createAccount}
              </button>

            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] font-semibold tracking-widest text-gray-400">{t.orSignUp}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google button */}
            <SocialButton onClick={handleGoogle} loading={googleLoading} disabled={loading}>
              {t.google}
            </SocialButton>

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
