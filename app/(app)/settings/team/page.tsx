'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Crown, User, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { type PlanUsage } from '@/lib/plans';
import UpgradeModal from '@/components/UpgradeModal';

interface TeamMember {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF';
  createdAt: string;
}

export default function TeamPage() {
  const [members, setMembers]     = useState<TeamMember[]>([]);
  const [usage, setUsage]         = useState<PlanUsage | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Invite form state
  const [inviting, setInviting]   = useState(false);
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [supId, setSupId]         = useState('');
  const [inviteErr, setInviteErr] = useState('');
  const [inviteOk, setInviteOk]   = useState(false);

  // Remove state
  const [removing, setRemoving]   = useState<string | null>(null);

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

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteErr('');
    setInviteOk(false);

    if (atUserLimit) {
      setShowUpgrade(true);
      return;
    }

    if (!email.trim() || !supId.trim()) {
      setInviteErr('Email and Supabase User ID are required.');
      return;
    }

    setInviting(true);
    try {
      await api.post('/team', { email: email.trim(), role, supabaseUserId: supId.trim() });
      setEmail('');
      setSupId('');
      setInviteOk(true);
      setTimeout(() => setInviteOk(false), 3000);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (typeof msg === 'string' && msg.toLowerCase().includes('limit')) {
        setShowUpgrade(true);
      } else {
        setInviteErr(msg ?? 'Failed to add user.');
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this team member?')) return;
    setRemoving(id);
    try {
      await api.delete(`/team/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to remove user.');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="You've reached your team member limit. Upgrade to add more users." />

      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Team Management</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Manage who has access to your agency dashboard.
          </p>
        </div>

        {/* Usage bar */}
        {usage && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12,
            border: `1px solid ${atUserLimit ? '#fecaca' : '#e5e7eb'}`,
            background: atUserLimit ? '#fef2f2' : '#f9fafb',
            fontSize: 13,
          }}>
            <span style={{ color: '#374151' }}>
              <strong>{usage.totalUsers}</strong> of <strong>{usage.maxUsers}</strong> seats used &nbsp;·&nbsp; {usage.planName} Plan
            </span>
            {atUserLimit && (
              <button
                onClick={() => setShowUpgrade(true)}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#2563eb',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Upgrade plan
              </button>
            )}
          </div>
        )}

        {/* Member list */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Team Members</span>
          </div>

          {loading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
          ) : members.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No team members yet.</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {members.map((m, i) => (
                <li
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid #f3f4f6',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: m.role === 'ADMIN' ? '#eff6ff' : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.role === 'ADMIN'
                      ? <Crown size={15} color="#2563eb" />
                      : <User size={15} color="#6b7280" />
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      {m.role === 'ADMIN' ? 'Admin' : 'Staff'} · Joined {new Date(m.createdAt).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={removing === m.id}
                    title="Remove user"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 6, borderRadius: 8, color: '#9ca3af',
                      opacity: removing === m.id ? 0.5 : 1,
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Invite form */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={15} color="#374151" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Add Team Member</span>
          </div>

          <form onSubmit={handleInvite} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {atUserLimit && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#b91c1c',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                You've reached your {usage?.planName} plan limit ({usage?.maxUsers} user{usage?.maxUsers !== 1 ? 's' : ''}).
                <button
                  type="button"
                  onClick={() => setShowUpgrade(true)}
                  style={{ marginLeft: 'auto', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  Upgrade
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Email address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@agency.com"
                  disabled={atUserLimit}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: 13,
                    border: '1px solid #d1d5db', borderRadius: 8,
                    outline: 'none', boxSizing: 'border-box',
                    background: atUserLimit ? '#f9fafb' : '#fff',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'STAFF')}
                  disabled={atUserLimit}
                  style={{
                    width: '100%', padding: '9px 12px', fontSize: 13,
                    border: '1px solid #d1d5db', borderRadius: 8,
                    outline: 'none', background: atUserLimit ? '#f9fafb' : '#fff',
                  }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                Supabase User ID *
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 5 }}>(from Supabase Auth dashboard)</span>
              </label>
              <input
                type="text"
                value={supId}
                onChange={(e) => setSupId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={atUserLimit}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: 13,
                  border: '1px solid #d1d5db', borderRadius: 8,
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'monospace',
                  background: atUserLimit ? '#f9fafb' : '#fff',
                }}
              />
            </div>

            {inviteErr && (
              <div style={{ fontSize: 12, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                {inviteErr}
              </div>
            )}
            {inviteOk && (
              <div style={{ fontSize: 12, color: '#16a34a', padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                Team member added successfully.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={inviting || atUserLimit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', fontSize: 13, fontWeight: 600,
                  background: atUserLimit ? '#e5e7eb' : '#2563eb',
                  color: atUserLimit ? '#9ca3af' : '#fff',
                  border: 'none', borderRadius: 9, cursor: atUserLimit ? 'not-allowed' : 'pointer',
                  opacity: inviting ? 0.7 : 1,
                }}
              >
                <UserPlus size={14} />
                {inviting ? 'Adding…' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
