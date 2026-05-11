'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { type PlanUsage } from '@/lib/plans';
import UpgradeModal from '@/components/UpgradeModal';
import { useToast } from '@/components/Toast';
import { useOnboarding } from '@/components/OnboardingContext';

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  createdAt: string;
}

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  STAFF: 'Staff',
};

const ROLE_COLORS: Record<TeamMember['role'], { bg: string; text: string }> = {
  OWNER: { bg: '#eff6ff', text: '#1d4ed8' },
  ADMIN: { bg: '#f0fdf4', text: '#15803d' },
  STAFF: { bg: '#f9fafb', text: '#6b7280' },
};

function getInitials(fullName: string | null, email: string) {
  const source = fullName?.trim() || email;
  const parts = source.split(/[\s@]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : source.slice(0, 2).toUpperCase();
}

export default function TeamPage() {
  const toast = useToast();
  const { markComplete } = useOnboarding();

  const [members, setMembers]         = useState<TeamMember[]>([]);
  const [usage, setUsage]             = useState<PlanUsage | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form state
  const [inviting, setInviting]       = useState(false);
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [role, setRole]               = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErr, setFieldErr]       = useState('');

  const [removing, setRemoving]       = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [membersRes, usageRes] = await Promise.all([
        api.get<TeamMember[]>('/team'),
        api.get<PlanUsage>('/plans/usage'),
      ]);
      setMembers(membersRes.data);
      setUsage(usageRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const atUserLimit = usage ? usage.totalUsers >= usage.maxUsers : false;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFieldErr('');

    if (atUserLimit) {
      setShowUpgrade(true);
      return;
    }

    if (!fullName.trim()) { setFieldErr('Full name is required.'); return; }
    if (!email.trim())    { setFieldErr('Email address is required.'); return; }
    if (password.length < 6) { setFieldErr('Password must be at least 6 characters.'); return; }

    setInviting(true);
    try {
      await api.post('/team', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        password,
      });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('STAFF');
      toast.success('Team member created successfully.');
      markComplete('hasInvitedTeamMember');
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (typeof msg === 'string' && msg.toLowerCase().includes('limit')) {
        setShowUpgrade(true);
      } else {
        toast.error(msg ?? 'Failed to create team member.');
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this team member? They will lose access immediately.')) return;
    setRemoving(id);
    try {
      await api.delete(`/team/${id}`);
      toast.info('Team member removed.');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to remove user.');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <style>{`
        .team-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 600px) {
          .team-form-grid {
            grid-template-columns: 1fr;
          }
          .team-submit-row {
            justify-content: stretch !important;
          }
          .team-submit-btn {
            width: 100%;
            justify-content: center !important;
          }
        }
      `}</style>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="You've reached your team member limit. Upgrade to add more users."
      />

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4, margin: 0 }}>
            Team Management
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
            Manage who has access to your agency dashboard.
          </p>
        </div>

        {/* Seat usage */}
        {usage && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12,
            border: `1px solid ${atUserLimit ? '#fecaca' : '#e5e7eb'}`,
            background: atUserLimit ? '#fef2f2' : '#f9fafb',
            fontSize: 13,
          }}>
            <span style={{ color: '#374151' }}>
              <strong>{usage.totalUsers}</strong> of <strong>{usage.maxUsers}</strong> seats used
              &nbsp;·&nbsp;
              <span style={{ color: '#6b7280' }}>{usage.planName} Plan</span>
            </span>
            {atUserLimit && (
              <button
                onClick={() => setShowUpgrade(true)}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#2563eb',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  marginLeft: 12, whiteSpace: 'nowrap',
                }}
              >
                Upgrade plan →
              </button>
            )}
          </div>
        )}

        {/* Member list */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Team Members</span>
          </div>

          {loading ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Loading…
            </div>
          ) : members.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No team members yet.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {members.map((m, i) => {
                const roleColor = ROLE_COLORS[m.role];
                const initials = getInitials(m.fullName, m.email);
                return (
                  <li
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 20px',
                      borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: roleColor.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 12, fontWeight: 700, color: roleColor.text,
                      letterSpacing: '0.02em',
                    }}>
                      {initials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: '#111827',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.fullName ?? m.email}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 500, padding: '2px 7px',
                          borderRadius: 20, background: roleColor.bg, color: roleColor.text,
                          flexShrink: 0,
                        }}>
                          {ROLE_LABELS[m.role]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {m.fullName ? m.email + ' · ' : ''}
                        Joined {new Date(m.createdAt).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        title="Remove member"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 6, borderRadius: 8, color: '#d1d5db',
                          opacity: removing === m.id ? 0.5 : 1,
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Create member form */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #f3f4f6',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <UserPlus size={15} color="#374151" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Add Team Member</span>
          </div>

          <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {atUserLimit && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#b91c1c',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  You've reached your {usage?.planName} plan limit ({usage?.maxUsers} seat{usage?.maxUsers !== 1 ? 's' : ''}).
                </span>
                <button
                  type="button"
                  onClick={() => setShowUpgrade(true)}
                  style={{
                    marginLeft: 'auto', fontWeight: 600, color: '#2563eb',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, fontSize: 13, whiteSpace: 'nowrap',
                  }}
                >
                  Upgrade →
                </button>
              </div>
            )}

            {/* Full name + Email */}
            <div className="team-form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Sarah Abdullah"
                  disabled={atUserLimit || inviting}
                  style={inputStyle(atUserLimit || inviting)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="sarah@agency.com"
                  disabled={atUserLimit || inviting}
                  style={inputStyle(atUserLimit || inviting)}
                />
              </div>
            </div>

            {/* Role + Password */}
            <div className="team-form-grid">
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                  Role *
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'ADMIN' | 'STAFF')}
                  disabled={atUserLimit || inviting}
                  style={{ ...inputStyle(atUserLimit || inviting), cursor: 'pointer' }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    disabled={atUserLimit || inviting}
                    style={{ ...inputStyle(atUserLimit || inviting), paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {fieldErr && (
              <div style={{
                fontSize: 12, color: '#dc2626', padding: '8px 12px',
                background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca',
              }}>
                {fieldErr}
              </div>
            )}

            <div className="team-submit-row" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={inviting || atUserLimit}
                className="team-submit-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', fontSize: 13, fontWeight: 600,
                  background: atUserLimit ? '#e5e7eb' : '#2563eb',
                  color: atUserLimit ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 10,
                  cursor: atUserLimit || inviting ? 'not-allowed' : 'pointer',
                  opacity: inviting ? 0.75 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {inviting ? (
                  <>
                    <span style={{
                      width: 13, height: 13, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Creating…
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    Create Team Member
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
    background: disabled ? '#f9fafb' : '#fff',
    color: disabled ? '#9ca3af' : '#111827',
    transition: 'border-color 0.15s',
  };
}
