'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function StatusBanner({ type, message }: { type: 'success' | 'error'; message: string }) {
  const cls = type === 'success'
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : 'text-red-600 bg-red-50 border-red-200';
  return (
    <div className={`text-sm border rounded-lg px-4 py-2.5 ${cls}`}>{message}</div>
  );
}

function SaveBtn({ saving, label }: { saving: boolean; label: string }) {
  return (
    <div className="flex justify-end">
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);

  // Identity
  const [email, setEmail]         = useState('');
  const [fullName, setFullName]   = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [role, setRole]           = useState('');

  // Password change
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd,     setNewPwd]       = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');

  // Save states
  const [savingName,  setSavingName]  = useState(false);
  const [successName, setSuccessName] = useState(false);
  const [errorName,   setErrorName]   = useState('');

  const [savingPwd,   setSavingPwd]   = useState(false);
  const [successPwd,  setSuccessPwd]  = useState(false);
  const [errorPwd,    setErrorPwd]    = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      setEmail(session.user.email ?? '');
      setFullName(session.user.user_metadata?.full_name ?? '');

      try {
        const res = await api.get<{ role?: string; agency?: { name: string } }>('/auth/me');
        if (res.data.agency?.name) setAgencyName(res.data.agency.name);
        if (res.data.role)         setRole(res.data.role);
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorName('');
    setSuccessName(false);
    if (!fullName.trim()) { setErrorName('Name cannot be empty.'); return; }
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      if (error) throw error;
      setSuccessName(true);
      setTimeout(() => setSuccessName(false), 3000);
    } catch (err: any) {
      setErrorName(err.message ?? 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorPwd('');
    setSuccessPwd(false);

    if (newPwd.length < 8) { setErrorPwd('Password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { setErrorPwd('Passwords do not match.'); return; }

    setSavingPwd(true);
    try {
      // Re-authenticate first so we can be sure it's the current user
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (signInErr) { setErrorPwd('Current password is incorrect.'); setSavingPwd(false); return; }

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;

      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setSuccessPwd(true);
      setTimeout(() => setSuccessPwd(false), 4000);
    } catch (err: any) {
      setErrorPwd(err.message ?? 'Failed to update password.');
    } finally {
      setSavingPwd(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading profile…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Identity banner ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">
            {(fullName || email).slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{fullName || email}</p>
          <p className="text-sm text-gray-500 mt-0.5">{email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {agencyName && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{agencyName}</span>
            )}
            {role && (
              <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{role}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile Information ───────────────────────────────────────────────── */}
      <Card title="Profile Information" subtitle="Your name as it appears in the system.">
        <form onSubmit={handleNameSave} className="space-y-5">
          <Field label="Full Name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              maxLength={120}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Email Address" hint="Contact your administrator to change your email address.">
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </Field>
          {errorName   && <StatusBanner type="error"   message={errorName} />}
          {successName && <StatusBanner type="success" message="Name updated successfully." />}
          <SaveBtn saving={savingName} label="Save Name" />
        </form>
      </Card>

      {/* ── Change Password ───────────────────────────────────────────────────── */}
      <Card title="Change Password" subtitle="Choose a strong password with at least 8 characters.">
        <form onSubmit={handlePasswordSave} className="space-y-5">
          <Field label="Current Password">
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="New Password">
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>
          {/* Live match indicator */}
          {newPwd && confirmPwd && (
            <p className={`text-xs ${newPwd === confirmPwd ? 'text-emerald-600' : 'text-red-500'}`}>
              {newPwd === confirmPwd ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
          {errorPwd   && <StatusBanner type="error"   message={errorPwd} />}
          {successPwd && <StatusBanner type="success" message="Password changed successfully. Please use the new password on your next login." />}
          <SaveBtn saving={savingPwd} label="Change Password" />
        </form>
      </Card>

    </div>
  );
}
