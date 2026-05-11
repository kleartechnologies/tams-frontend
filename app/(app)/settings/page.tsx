'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { qk, fetchSettings } from '@/lib/queries';
import { useBranding } from '@/components/BrandingContext';

type PdfTemplate = 'classic' | 'modern' | 'premium';

interface Settings {
  agencyName: string;
  agencyTag: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  primaryColor: string;
  motacLicenseNumber: string | null;
  motacExpiryDate: string | null;
  pdfTemplate: PdfTemplate;
  termsAndConditions: string | null;
  refundPolicy: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankNotes: string | null;
  sstEnabled: boolean;
  defaultSstRate: number;
}

const EMPTY: Settings = {
  agencyName: '',
  agencyTag: '',
  logoUrl: null,
  address: null,
  phone: null,
  email: null,
  primaryColor: '#1F4E4A',
  motacLicenseNumber: null,
  motacExpiryDate: null,
  pdfTemplate: 'modern' as PdfTemplate,
  termsAndConditions: null,
  refundPolicy: null,
  bankName: null,
  bankAccountNumber: null,
  bankAccountHolder: null,
  bankNotes: null,
  sstEnabled: false,
  defaultSstRate: 6,
};

const MAX_LOGO_BYTES = 512 * 1024;

const PRESET_COLORS = [
  '#1F4E4A', '#1E40AF', '#7C3AED', '#BE185D',
  '#B45309', '#065F46', '#1E293B', '#374151',
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
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

function Input({ value, onChange, placeholder, maxLength, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />
  );
}

function SaveRow({ saving, success, error, label = 'Save' }: {
  saving: boolean; success: boolean; error: string; label?: string;
}) {
  return (
    <div className="space-y-3 pt-1">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</div>
      )}
      {success && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          ✓ Saved successfully.
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : label}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { refresh } = useBranding();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settingsData, isLoading: loading } = useQuery({
    queryKey: qk.settings(),
    queryFn:  fetchSettings,
    staleTime: 5 * 60_000,
  });

  const [s, setS] = useState<Settings>(EMPTY);
  const [logoError, setLogoError] = useState('');

  // per-card save state
  const [savingBranding,     setSavingBranding]     = useState(false);
  const [savingContact,      setSavingContact]      = useState(false);
  const [savingAppearance,   setSavingAppearance]   = useState(false);
  const [savingTemplate,     setSavingTemplate]     = useState(false);
  const [savingMotac,        setSavingMotac]        = useState(false);
  const [savingPayInstr,     setSavingPayInstr]     = useState(false);
  const [savingNotes,        setSavingNotes]        = useState(false);
  const [savingSST,          setSavingSST]          = useState(false);

  const [successBranding,    setSuccessBranding]    = useState(false);
  const [successContact,     setSuccessContact]     = useState(false);
  const [successAppearance,  setSuccessAppearance]  = useState(false);
  const [successTemplate,    setSuccessTemplate]    = useState(false);
  const [successMotac,       setSuccessMotac]       = useState(false);
  const [successPayInstr,    setSuccessPayInstr]    = useState(false);
  const [successNotes,       setSuccessNotes]       = useState(false);
  const [successSST,         setSuccessSST]         = useState(false);

  const [errorBranding,      setErrorBranding]      = useState('');
  const [errorContact,       setErrorContact]       = useState('');
  const [errorAppearance,    setErrorAppearance]    = useState('');
  const [errorTemplate,      setErrorTemplate]      = useState('');
  const [errorMotac,         setErrorMotac]         = useState('');
  const [errorPayInstr,      setErrorPayInstr]      = useState('');
  const [errorNotes,         setErrorNotes]         = useState('');
  const [errorSST,           setErrorSST]           = useState('');

  // Sync form state from React Query cache when data arrives
  useEffect(() => {
    if (settingsData) setS({ ...EMPTY, ...settingsData });
  }, [settingsData]);

  function set(partial: Partial<Settings>) {
    setS((prev) => ({ ...prev, ...partial }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      setLogoError('Only PNG, JPG, SVG or WebP files are accepted.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`File too large (${(file.size / 1024).toFixed(0)} KB). Max 512 KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => set({ logoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function save(
    payload: Partial<Settings>,
    setSaving: (v: boolean) => void,
    setSuccess: (v: boolean) => void,
    setError: (v: string) => void,
    doRefresh?: boolean,
  ) {
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await api.put('/settings', payload);
      setSuccess(true);
      // Invalidate the shared settings cache so BrandingContext and sidebar update immediately
      queryClient.invalidateQueries({ queryKey: qk.settings() });
      if (doRefresh) refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-400">Loading settings…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Agency Branding ─────────────────────────────────────────────────── */}
      <Card
        title="Agency Branding"
        subtitle="Customize how your agency appears in the sidebar and throughout the system."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!s.agencyName.trim()) { setErrorBranding('Agency name is required.'); return; }
            save(
              { agencyName: s.agencyName.trim(), agencyTag: s.agencyTag.trim() || 'Travel Agency MS', logoUrl: s.logoUrl ?? undefined },
              setSavingBranding, setSuccessBranding, setErrorBranding, true,
            );
          }}
          className="space-y-5"
        >
          {/* Logo */}
          <Field label="Agency Logo">
            <div className="flex items-start gap-5">
              <div style={{
                width: 80, height: 80, borderRadius: 14, border: '1px solid #E5E7EB',
                background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {s.logoUrl ? (
                  <img src={s.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
                ) : (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12c2.5-5 6-8 9-8s6.5 3 9 8c-2.5 5-6 8-9 8s-6.5-3-9-8Z"/>
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" onChange={handleFileChange} className="hidden" id="logo-upload" />
                <div className="flex gap-2">
                  <label htmlFor="logo-upload" className="cursor-pointer px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    {s.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  {s.logoUrl && (
                    <button type="button" onClick={() => { set({ logoUrl: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="px-4 py-2 text-sm text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP. Max 512 KB.</p>
                {logoError && <p className="text-xs text-red-600">{logoError}</p>}
              </div>
            </div>
          </Field>

          <Field label="Agency Name *" hint="Shown in the sidebar header and page titles.">
            <Input value={s.agencyName} onChange={(v) => set({ agencyName: v })} placeholder="e.g. Wanderlust Travel" maxLength={120} />
          </Field>

          <Field label="Tagline / Subtitle" hint="Shown below the agency name in the sidebar.">
            <Input value={s.agencyTag} onChange={(v) => set({ agencyTag: v })} placeholder="e.g. Your trusted travel partner" maxLength={120} />
          </Field>

          {/* Sidebar preview */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Sidebar preview</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0b0d0f', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, overflow: 'hidden', background: '#1b1e23', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.logoUrl ? <img src={s.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} /> : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b93a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12c2.5-5 6-8 9-8s6.5 3 9 8c-2.5 5-6 8-9 8s-6.5-3-9-8Z"/>
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{s.agencyName || 'Agency Name'}</div>
                <div style={{ color: '#8b93a1', fontSize: 11, marginTop: 1 }}>{s.agencyTag || 'Tagline'}</div>
              </div>
            </div>
          </div>

          <SaveRow saving={savingBranding} success={successBranding} error={errorBranding} label="Save Branding" />
        </form>
      </Card>

      {/* ── Contact Information ──────────────────────────────────────────────── */}
      <Card
        title="Contact Information"
        subtitle="Shown on invoices and PDFs sent to customers."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(
              { address: s.address || undefined, phone: s.phone || undefined, email: s.email || undefined },
              setSavingContact, setSuccessContact, setErrorContact,
            );
          }}
          className="space-y-5"
        >
          <Field label="Address" hint="Full agency address, shown on invoice header.">
            <Textarea value={s.address ?? ''} onChange={(v) => set({ address: v || null })} placeholder="e.g. No. 12, Jalan Ampang, 50450 Kuala Lumpur" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={s.phone ?? ''} onChange={(v) => set({ phone: v || null })} placeholder="+60 3-1234 5678" maxLength={50} />
            </Field>
            <Field label="Email">
              <Input value={s.email ?? ''} onChange={(v) => set({ email: v || null })} placeholder="info@agency.com" maxLength={120} type="email" />
            </Field>
          </div>
          <SaveRow saving={savingContact} success={successContact} error={errorContact} label="Save Contact Info" />
        </form>
      </Card>

      {/* ── MOTAC License ───────────────────────────────────────────────────── */}
      <Card
        title="Legal &amp; License"
        subtitle="MOTAC license details for compliance and regulatory purposes."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(
              {
                motacLicenseNumber: s.motacLicenseNumber || undefined,
                motacExpiryDate: s.motacExpiryDate || undefined,
              },
              setSavingMotac, setSuccessMotac, setErrorMotac,
            );
          }}
          className="space-y-5"
        >
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
            <strong>Note:</strong> Your MOTAC license number will appear on all invoices and official documents issued to customers.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="MOTAC License Number" hint="e.g. KPK/LN/HD-5987 or similar">
              <Input
                value={s.motacLicenseNumber ?? ''}
                onChange={(v) => set({ motacLicenseNumber: v || null })}
                placeholder="KPK/LN/HD-XXXX"
                maxLength={50}
              />
            </Field>
            <Field label="License Expiry Date">
              <input
                type="date"
                value={s.motacExpiryDate ? s.motacExpiryDate.slice(0, 10) : ''}
                onChange={(e) => set({ motacExpiryDate: e.target.value || null })}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Field>
          </div>
          {s.motacExpiryDate && (() => {
            const exp  = new Date(s.motacExpiryDate);
            const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
            if (days < 0) return (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span>⚠</span> License expired {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago. Please renew to remain compliant.
              </div>
            );
            if (days <= 60) return (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span>⚠</span> License expires in {days} day{days !== 1 ? 's' : ''}. Consider renewing soon.
              </div>
            );
            return null;
          })()}
          <SaveRow saving={savingMotac} success={successMotac} error={errorMotac} label="Save License Info" />
        </form>
      </Card>

      {/* ── Invoice Appearance ───────────────────────────────────────────────── */}
      <Card
        title="Invoice Appearance"
        subtitle="Primary colour used in invoice headers and accents."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const hex = s.primaryColor.trim();
            if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
              setErrorAppearance('Enter a valid hex colour, e.g. #1F4E4A');
              return;
            }
            save({ primaryColor: hex }, setSavingAppearance, setSuccessAppearance, setErrorAppearance);
          }}
          className="space-y-5"
        >
          <Field label="Primary Color" hint="Used for invoice header background, accents, and buttons in PDFs.">
            <div className="space-y-3">
              {/* Preset swatches */}
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ primaryColor: c })}
                    style={{ background: c, width: 32, height: 32, borderRadius: 8, border: s.primaryColor === c ? '3px solid #3B82F6' : '2px solid transparent', outline: '2px solid #E5E7EB', outlineOffset: 1 }}
                  />
                ))}
              </div>
              {/* Custom hex input */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={s.primaryColor}
                  onChange={(e) => set({ primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={s.primaryColor}
                  onChange={(e) => set({ primaryColor: e.target.value })}
                  maxLength={7}
                  placeholder="#1F4E4A"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Live preview */}
                <div style={{ background: s.primaryColor, color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>
                  INVOICE
                </div>
              </div>
            </div>
          </Field>
          <SaveRow saving={savingAppearance} success={successAppearance} error={errorAppearance} label="Save Appearance" />
        </form>
      </Card>

      {/* ── PDF Template ─────────────────────────────────────────────────────── */}
      <Card
        title="PDF Template"
        subtitle="Choose the layout used for booking confirmations and invoices."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({ pdfTemplate: s.pdfTemplate }, setSavingTemplate, setSuccessTemplate, setErrorTemplate);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-3 gap-3">
            {([
              {
                id: 'classic' as PdfTemplate,
                label: 'Classic',
                desc: 'Formal, table-heavy layout. Ideal for government submissions and traditional clients.',
                icon: '📄',
                preview: ['■■■■■■■■■■■■■', '─────────────', '□ □ □ □ □ □ □', '─────────────', '│ table rows │', '─────────────'],
              },
              {
                id: 'modern' as PdfTemplate,
                label: 'Modern',
                desc: 'Clean, balanced design with subtle accents. The recommended default.',
                icon: '✦',
                preview: ['AGENCY NAME', '──────────────', 'Booking', 'Confirmation', '· · · · · · ·', '┌─────────────┐'],
              },
              {
                id: 'premium' as PdfTemplate,
                label: 'Premium',
                desc: 'Rich branded header with agency logo, color accents, and traveler cards.',
                icon: '◈',
                preview: ['█████████████', '  AGENCY NAME', '─────────────', '◎ Card layout', '◎ Color total', '█████████████'],
              },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ pdfTemplate: t.id })}
                className={[
                  'relative text-left rounded-xl border p-4 transition-all',
                  s.pdfTemplate === t.id
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40',
                ].join(' ')}
              >
                {s.pdfTemplate === t.id && (
                  <span className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {/* Mini preview */}
                <div className="mb-3 rounded-md bg-gray-100 border border-gray-200 p-2 font-mono text-[7px] leading-relaxed text-gray-400 overflow-hidden h-[64px]">
                  {t.preview.map((line, i) => <div key={i}>{line}</div>)}
                </div>
                <div className="text-xs font-semibold text-gray-800">{t.icon} {t.label}</div>
                <div className="text-[10.5px] text-gray-400 mt-1 leading-relaxed">{t.desc}</div>
              </button>
            ))}
          </div>
          <SaveRow saving={savingTemplate} success={successTemplate} error={errorTemplate} label="Save Template" />
        </form>
      </Card>

      {/* ── Payment Instructions ─────────────────────────────────────────────── */}
      <Card
        title="Payment Instructions"
        subtitle="Bank details and notes displayed on every invoice."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(
              {
                bankName: s.bankName || undefined,
                bankAccountNumber: s.bankAccountNumber || undefined,
                bankAccountHolder: s.bankAccountHolder || undefined,
                bankNotes: s.bankNotes || undefined,
              },
              setSavingPayInstr, setSuccessPayInstr, setErrorPayInstr,
            );
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bank Name">
              <Input value={s.bankName ?? ''} onChange={(v) => set({ bankName: v || null })} placeholder="e.g. Maybank" maxLength={120} />
            </Field>
            <Field label="Account Number">
              <Input value={s.bankAccountNumber ?? ''} onChange={(v) => set({ bankAccountNumber: v || null })} placeholder="e.g. 5671-2345-6789" maxLength={60} />
            </Field>
          </div>
          <Field label="Account Holder Name">
            <Input value={s.bankAccountHolder ?? ''} onChange={(v) => set({ bankAccountHolder: v || null })} placeholder="e.g. Wanderlust Travel Sdn Bhd" maxLength={120} />
          </Field>
          <Field label="Additional Notes" hint="e.g. DuitNow instructions, QR code info, or reference format.">
            <Textarea value={s.bankNotes ?? ''} onChange={(v) => set({ bankNotes: v || null })} placeholder="Please use booking number as payment reference." rows={3} />
          </Field>
          <SaveRow saving={savingPayInstr} success={successPayInstr} error={errorPayInstr} label="Save Payment Instructions" />
        </form>
      </Card>

      {/* ── Invoice Notes ────────────────────────────────────────────────────── */}
      <Card
        title="Invoice Notes"
        subtitle="Terms and refund policy printed at the bottom of every invoice."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(
              { termsAndConditions: s.termsAndConditions || undefined, refundPolicy: s.refundPolicy || undefined },
              setSavingNotes, setSuccessNotes, setErrorNotes,
            );
          }}
          className="space-y-5"
        >
          <Field label="Terms &amp; Conditions" hint="General terms shown on invoices.">
            <Textarea
              value={s.termsAndConditions ?? ''}
              onChange={(v) => set({ termsAndConditions: v || null })}
              placeholder="Payment is non-refundable unless otherwise stated. Package rates are subject to change without prior notice."
              rows={4}
            />
          </Field>
          <Field label="Refund Policy">
            <Textarea
              value={s.refundPolicy ?? ''}
              onChange={(v) => set({ refundPolicy: v || null })}
              placeholder="Cancellations 30+ days before departure: 90% refund. 15–29 days: 50% refund. Less than 14 days: no refund."
              rows={4}
            />
          </Field>
          <SaveRow saving={savingNotes} success={successNotes} error={errorNotes} label="Save Invoice Notes" />
        </form>
      </Card>

      {/* ── SST Settings ─────────────────────────────────────────────────────── */}
      <Card
        title="SST Settings"
        subtitle="Service and Sales Tax configuration for invoices."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(
              { sstEnabled: s.sstEnabled, defaultSstRate: s.defaultSstRate },
              setSavingSST, setSuccessSST, setErrorSST,
            );
          }}
          className="space-y-5"
        >
          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable SST</p>
              <p className="text-xs text-gray-400 mt-0.5">
                When enabled, SST is applied to packages marked as SST-applicable.
                SST is charged for domestic and inbound packages only.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set({ sstEnabled: !s.sstEnabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${s.sstEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${s.sstEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* SST rate */}
          <Field label="Default SST Rate (%)" hint="Applied to SST-applicable packages. Common rates: 6% (services), 8% (goods).">
            <div className="flex gap-3">
              {[6, 8].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => set({ defaultSstRate: rate })}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${s.defaultSstRate === rate ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {rate}%
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={s.defaultSstRate}
                  onChange={(e) => set({ defaultSstRate: Number(e.target.value) })}
                  className="w-20 px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </Field>

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
            <strong>Note:</strong> SST applies only when this setting is enabled AND the individual package is
            marked as &ldquo;SST Applicable&rdquo; in the package configuration. Per Malaysian tax regulations,
            SST is not charged on international outbound packages.
          </div>

          <SaveRow saving={savingSST} success={successSST} error={errorSST} label="Save SST Settings" />
        </form>
      </Card>

    </div>
  );
}
