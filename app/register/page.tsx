'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

// ── Icons ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Input helpers ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid var(--line)',
  borderRadius: 8, fontSize: 14, color: 'var(--ink)', background: 'var(--canvas)',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
};

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--accent)';
  e.target.style.boxShadow = '0 0 0 3px oklch(0.56 0.16 250 / 0.12)';
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--line)';
  e.target.style.boxShadow = 'none';
}

// ── Page ──────────────────────────────────────────────────────────────────

const FEATURES = [
  'Bookings, payments & invoices in one place',
  'SST-compliant invoice generation',
  'Real-time reports & analytics',
  'Multi-user & multi-agency support',
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');

  // When the user already has a Supabase session (e.g. Google OAuth), we skip
  // the email/password fields and only ask for the agency name.
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[RegisterPage] mount');
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email) {
        setExistingEmail(data.session.user.email);
      }
      setSessionChecked(true);
    });
    return () => { if (failsafeRef.current) clearTimeout(failsafeRef.current); };
  }, []);

  // ── Agency-only flow (user already authenticated via Google etc.) ─────────

  async function handleAgencyOnly(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || !agencyName.trim()) return;
    setError('');
    setLoading(true);
    failsafeRef.current = setTimeout(() => { setLoading(false); setError('Request timed out. Please try again.'); }, 15_000);

    try {
      console.log('[RegisterPage] creating agency for existing user');
      await api.post('/auth/register', { agencyName });
      clearTimeout(failsafeRef.current!);
      router.push(planParam ? `/billing?plan=${planParam}` : '/dashboard');
    } catch (err: unknown) {
      clearTimeout(failsafeRef.current!);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) { router.push(planParam ? `/billing?plan=${planParam}` : '/dashboard'); return; }
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create agency. Please try again.');
      setLoading(false);
    }
  }

  // ── Full signup flow ───────────────────────────────────────────────────────

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (!agencyName.trim()) { setError('Agency name is required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setError('');
    setInfo('');
    setLoading(true);
    failsafeRef.current = setTimeout(() => { setLoading(false); setError('Sign-up timed out. Please try again.'); }, 15_000);

    try {
      console.log('[RegisterPage] signing up');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) {
        clearTimeout(failsafeRef.current!);
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (!signUpData.session) {
        clearTimeout(failsafeRef.current!);
        setInfo('Check your email to confirm your account, then sign in.');
        setLoading(false);
        return;
      }

      console.log('[RegisterPage] creating agency');
      try {
        await api.post('/auth/register', { agencyName });
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 409) {
          clearTimeout(failsafeRef.current!);
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setError(msg ?? 'Failed to create agency. Please try again.');
          setLoading(false);
          return;
        }
      }

      console.log('[RegisterPage] success → billing or dashboard');
      router.push(planParam ? `/billing?plan=${planParam}` : '/dashboard');
    } catch {
      clearTimeout(failsafeRef.current!);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isAgencyOnlyMode = sessionChecked && existingEmail !== null;
  const submitHandler = isAgencyOnlyMode ? handleAgencyOnly : handleSignup;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        minHeight: '100vh', display: 'flex',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        background: 'var(--bg)',
      }}>

        {/* ── Left panel ── */}
        <div style={{
          display: 'none',
          width: '44%', flexShrink: 0,
          background: 'linear-gradient(160deg, oklch(0.22 0.08 260) 0%, oklch(0.13 0.05 260) 100%)',
          padding: '48px 52px', flexDirection: 'column', position: 'relative', overflow: 'hidden',
        }} className="register-left">
          <style>{`@media (min-width: 960px) { .register-left { display: flex !important; } }`}</style>

          {/* Background blobs */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: 320, height: 320, borderRadius: '50%', background: 'oklch(0.55 0.18 260 / 0.12)' }} />
            <div style={{ position: 'absolute', bottom: '80px', left: '-60px', width: 240, height: 240, borderRadius: '50%', background: 'oklch(0.55 0.18 260 / 0.08)' }} />
          </div>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg, oklch(0.65 0.18 250), oklch(0.5 0.2 255))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16,
            }}>T</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>TAMS</div>
              <div style={{ color: 'oklch(0.75 0.05 260)', fontSize: 11, fontWeight: 500 }}>Travel Agency Management System</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginTop: 56, position: 'relative', zIndex: 1 }}>
            <h1 style={{
              color: '#fff', fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 800,
              lineHeight: 1.2, letterSpacing: '-0.5px', margin: '0 0 14px',
            }}>
              Everything your agency needs, in one place
            </h1>
            <p style={{ color: 'oklch(0.72 0.04 260)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
              Join hundreds of Malaysian travel agencies running smoother operations. Get started free — no credit card required.
            </p>
          </div>

          {/* Features */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
            {FEATURES.map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: 'oklch(0.65 0.18 155 / 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'oklch(0.8 0.14 155)', marginTop: 1,
                }}>
                  <CheckIcon />
                </div>
                <span style={{ color: 'oklch(0.88 0.03 260)', fontSize: 13.5, lineHeight: 1.5 }}>{feat}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{
            marginTop: 'auto', position: 'relative', zIndex: 1,
            background: 'oklch(1 0 0 / 0.06)', border: '1px solid oklch(1 0 0 / 0.1)',
            borderRadius: 14, padding: '20px 22px',
          }}>
            <div style={{ fontSize: 28, lineHeight: 1, color: 'oklch(0.65 0.18 250)', marginBottom: 10, fontFamily: 'Georgia, serif' }}>&ldquo;</div>
            <p style={{ color: 'oklch(0.88 0.03 260)', fontSize: 13.5, lineHeight: 1.65, margin: '0 0 16px', fontStyle: 'italic' }}>
              We used to lose two days a month reconciling bookings. With TAMS, it&apos;s done in one afternoon.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'oklch(0.65 0.16 155 / 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'oklch(0.85 0.14 155)', fontWeight: 700, fontSize: 12,
              }}>AR</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Aisha Rahman</div>
                <div style={{ color: 'oklch(0.65 0.04 260)', fontSize: 11.5 }}>Owner · Pelangi Tours, Shah Alam</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--canvas)', minHeight: '100vh' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="reg-mobile-logo">
              <style>{`@media (min-width: 960px) { .reg-mobile-logo { display: none !important; } }`}</style>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, var(--accent), oklch(0.42 0.18 255))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 13,
              }}>T</div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>TAMS</span>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 13.5, color: 'var(--ink-4)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </div>
          </div>

          {/* Form area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px 48px' }}>
            <div style={{ width: '100%', maxWidth: 400 }}>

              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.4px', margin: '0 0 8px' }}>
                  {isAgencyOnlyMode ? 'Set up your agency' : 'Start your free trial'}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ink-4)', margin: 0 }}>
                  {isAgencyOnlyMode
                    ? <>Creating agency for <strong style={{ color: 'var(--ink-3)' }}>{existingEmail}</strong></>
                    : 'No credit card required · Cancel anytime'}
                </p>
              </div>

              <form onSubmit={submitHandler} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Agency name */}
                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 7 }}>
                    Agency name
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Ahmad Travels Sdn Bhd"
                    style={inputStyle}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>

                {/* Email + Password shown only when not in agency-only mode */}
                {!isAgencyOnlyMode && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 7 }}>
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@agency.com"
                        style={inputStyle}
                        onFocus={focusIn}
                        onBlur={focusOut}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 7 }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          style={{ ...inputStyle, padding: '10px 42px 10px 14px' }}
                          onFocus={focusIn}
                          onBlur={focusOut}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2,
                          display: 'flex', alignItems: 'center',
                        }}>
                          <EyeIcon off={showPassword} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 7 }}>
                        Confirm password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          style={{ ...inputStyle, padding: '10px 42px 10px 14px' }}
                          onFocus={focusIn}
                          onBlur={focusOut}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 2,
                          display: 'flex', alignItems: 'center',
                        }}>
                          <EyeIcon off={showConfirm} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px', background: '#fff1f2', border: '1px solid #fecdd3',
                    borderRadius: 8, fontSize: 13.5, color: '#be123c', lineHeight: 1.5,
                  }} role="alert">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Info (email confirmation) */}
                {info && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, fontSize: 13.5, color: '#15803d', lineHeight: 1.5,
                  }} role="status">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10" /><polyline points="9 11 12 14 22 4" />
                    </svg>
                    {info}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '11px 20px',
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: loading ? 0.55 : 1, transition: 'opacity 0.15s, transform 0.1s',
                  }}
                >
                  {loading && <SpinnerIcon />}
                  {loading
                    ? (isAgencyOnlyMode ? 'Creating agency…' : 'Creating account…')
                    : (isAgencyOnlyMode ? 'Continue to dashboard' : 'Start free trial')}
                </button>

                {!isAgencyOnlyMode && (
                  <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'var(--ink-5)', lineHeight: 1.5 }}>
                    By signing up you agree to our{' '}
                    <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--ink-4)' }}>Terms of Service</span>
                    {' '}and{' '}
                    <span style={{ textDecoration: 'underline', cursor: 'pointer', color: 'var(--ink-4)' }}>Privacy Policy</span>.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
