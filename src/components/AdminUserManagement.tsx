import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
  Key,
  Link,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Lock,
  Sparkles,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { api } from '../lib/api';
import { User, SubscriptionPlan } from '../types';
import { AdminSmtpTester } from './AdminSmtpTester';

interface AdminUserManagementProps {
  currentUser?: User | null;
  onUserModified?: () => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  currentUser,
  onUserModified,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<{
    total: number;
    verified: number;
    unverified: number;
    admins: number;
    pro: number;
    institutional: number;
    free: number;
  }>({
    total: 0,
    verified: 0,
    unverified: 0,
    admins: 0,
    pro: 0,
    institutional: 0,
    free: 0,
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'INSTITUTIONAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'trialing' | 'canceled' | 'expired'>('ALL');
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'true' | 'false'>('ALL');

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);

  // Form states for Create User
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN',
    plan: 'FREE' as SubscriptionPlan,
    subscription_status: 'active',
    is_verified: true,
  });

  // Form states for Edit User
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'USER' as 'USER' | 'ADMIN',
    plan: 'FREE' as SubscriptionPlan,
    subscription_status: 'active',
    is_verified: true,
  });

  // Form state for Password Reset
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [generatedTempPass, setGeneratedTempPass] = useState<string | null>(null);

  // Copied state
  const [hasCopied, setHasCopied] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminUsers({
        search: searchQuery,
        role: roleFilter,
        plan: planFilter,
        status: statusFilter,
        verified: verifiedFilter,
      });
      setUsers(res.users);
      if (res.metrics) {
        setMetrics(res.metrics);
      } else {
        const total = res.users.length;
        const verified = res.users.filter(u => u.is_verified).length;
        const admins = res.users.filter(u => u.role === 'ADMIN').length;
        const pro = res.users.filter(u => u.plan === 'PRO').length;
        const institutional = res.users.filter(u => u.plan === 'INSTITUTIONAL').length;
        setMetrics({
          total,
          verified,
          unverified: total - verified,
          admins,
          pro,
          institutional,
          free: total - (pro + institutional),
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Could not load the user list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, planFilter, statusFilter, verifiedFilter]);

  // Open Edit Modal
  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email,
      role: u.role || 'USER',
      plan: u.plan || 'FREE',
      subscription_status: u.subscription_status || 'active',
      is_verified: Boolean(u.is_verified),
    });
  };

  // Submit Edit User
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setLoading(true);
      const res = await api.updateAdminUser(editingUser.id, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        plan: editForm.plan,
        subscription_status: editForm.subscription_status,
        is_verified: editForm.is_verified,
      });

      if (res.success) {
        showToast(`Access for ${res.user.email} updated.`);
        setEditingUser(null);
        loadUsers();
        onUserModified?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not update the user record.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email) return;
    try {
      setLoading(true);
      const res = await api.createAdminUser(createForm);
      if (res.success) {
        showToast(
          `User ${res.user.email} created.` +
          (res.initial_password ? ` Temporary password: ${res.initial_password}` : '')
        );
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'USER',
          plan: 'FREE',
          subscription_status: 'active',
          is_verified: true,
        });
        loadUsers();
        onUserModified?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not create the new user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setLoading(true);
      const res = await api.deleteAdminUser(deletingUser.id);
      if (res.success) {
        showToast(res.message || `User ${deletingUser.email} deleted.`);
        setDeletingUser(null);
        loadUsers();
        onUserModified?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not delete the user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Verification
  const handleToggleVerification = async (u: User) => {
    try {
      const res = await api.toggleAdminUserVerification(u.id);
      if (res.success) {
        showToast(res.message);
        loadUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not change the verification status.', 'error');
    }
  };

  // Reset Password Handler
  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    try {
      setLoading(true);
      const res = await api.resetAdminUserPassword(passwordResetUser.id, resetPasswordInput || undefined);
      if (res.success) {
        setGeneratedTempPass(res.temporary_password || resetPasswordInput);
        showToast(`Password for ${passwordResetUser.email} updated.`);
        loadUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Could not reset the password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Copy Helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(key);
    setTimeout(() => setHasCopied(null), 2500);
  };

  return (
    <div className="space-y-4 font-sans text-[var(--text-primary)]" id="admin-user-management-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-mono border transition-all ${
            toastMessage.type === 'error'
              ? 'bg-[var(--bearish-bg)] text-[var(--bearish)] border-[var(--bearish-border)]'
              : toastMessage.type === 'info'
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--bearish)]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--bullish)]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] ml-3 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Overview & Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-xs">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>TOTAL PENGGUNA</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Database</span>
          </div>
          <div className="text-xl font-bold text-[var(--text-primary)]">{metrics.total}</div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <span className="text-[var(--bullish)] font-semibold">{metrics.verified}</span>
            <span>aktif & terverifikasi</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--warning)]" />
              <span>ADMINISTRATOR</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]">
              Role
            </span>
          </div>
          <div className="text-xl font-bold text-[var(--warning)]">{metrics.admins}</div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            <span>Akses otorisasi sistem penuh</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-xs">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>PRO & INSTITUTIONAL</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-section-alt)] text-[var(--accent)] border border-[var(--border-subtle)]">
              Premium
            </span>
          </div>
          <div className="text-xl font-bold text-[var(--accent)]">
            {metrics.pro + metrics.institutional}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            <span>{metrics.institutional} Institutional • {metrics.pro} Pro</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--bullish)]" />
              <span>VERIFIKASI EMAIL</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {metrics.total > 0 ? Math.round((metrics.verified / metrics.total) * 100) : 0}%
            </span>
          </div>
          <div className="text-xl font-bold text-[var(--bullish)]">{metrics.verified}</div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <span className="text-[var(--warning)] font-semibold">{metrics.unverified}</span>
            <span>belum terverifikasi</span>
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar & Search Filters */}
      <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="ALL">All roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value as any)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="ALL">All tiers</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="INSTITUTIONAL">INSTITUTIONAL</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={e => setVerifiedFilter(e.target.value as any)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="ALL">All verification</option>
            <option value="true">Verified Saja</option>
            <option value="false">Unverified Saja</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={loadUsers}
            disabled={loading}
            title="Reload user data"
            className="p-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-strong)] transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>

          {/* Test SMTP Connection Button */}
          <button
            onClick={() => setShowSmtpModal(true)}
            className="px-2.5 py-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--accent)] border border-[var(--accent)] rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Test the email SMTP server connection"
            id="admin-test-smtp-button"
          >
            <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>SMTP test</span>
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add user</span>
          </button>
        </div>
      </div>

      {/* 3. Users Data Table */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="p-3 font-semibold">User & Identitas</th>
                <th className="p-3 font-semibold">Role Authority</th>
                <th className="p-3 font-semibold">Subscription Tier</th>
                <th className="p-3 font-semibold">Account status</th>
                <th className="p-3 font-semibold">Verification email</th>
                <th className="p-3 font-semibold text-right">Manage access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-[var(--accent)]">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading user data...</span>
                      </div>
                    ) : (
                      'No user accounts match the current filter.'
                    )}
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isCurrentAccount = currentUser?.id === u.id || currentUser?.email?.toLowerCase() === u.email.toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-[var(--bg-section-alt)] transition">
                      {/* User Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-section-alt)] border border-[var(--border-strong)] flex items-center justify-center text-xs font-bold text-[var(--accent)] shrink-0">
                            {(u.name || u.email).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[var(--text-primary)]">{u.name || 'Unnamed Trader'}</span>
                              {isCurrentAccount && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)] font-bold">
                                  AKUN ANDA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                              <span>{u.email}</span>
                            </div>
                            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-[var(--warning-bg)] text-[var(--warning-strong)] border-[var(--warning-border)]'
                              : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border-[var(--border-strong)]'
                          }`}
                        >
                          {u.role === 'ADMIN' ? (
                            <Shield className="w-2.5 h-2.5 text-[var(--warning)]" />
                          ) : (
                            <Users className="w-2.5 h-2.5 text-[var(--text-secondary)]" />
                          )}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      {/* Subscription Tier */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.plan === 'INSTITUTIONAL'
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent-strong)] border-[var(--accent-border)]'
                              : u.plan === 'PRO'
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent-strong)] border-[var(--accent-border)]'
                              : 'bg-[var(--bg-section-alt)] text-[var(--text-secondary)] border-[var(--border-strong)]'
                          }`}
                        >
                          {u.plan || 'FREE'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={`text-[11px] font-semibold ${
                            u.subscription_status === 'active'
                              ? 'text-[var(--bullish)]'
                              : u.subscription_status === 'trialing'
                              ? 'text-[var(--accent)]'
                              : 'text-[var(--bearish)]'
                          }`}
                        >
                          {u.subscription_status || 'active'}
                        </span>
                      </td>

                      {/* Email Verification */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {u.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--bullish)] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--bullish)]" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleVerification(u)}
                              title="Click to instantly verify this account"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)] text-[10px] hover:bg-[var(--warning-bg)] transition cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3 text-[var(--warning)]" />
                              <span>Verify now</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setPasswordResetUser(u);
                              setResetPasswordInput('');
                              setGeneratedTempPass(null);
                            }}
                            title="Reset Password User"
                            className="p-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--warning)] rounded border border-[var(--border-strong)] transition cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Change role & subscription plan"
                            className="p-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] rounded border border-[var(--border-strong)] transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrentAccount}
                            title={isCurrentAccount ? 'You cannot delete your own admin account' : 'Delete this user account'}
                            className={`p-1.5 rounded border transition ${
                              isCurrentAccount
                                ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] cursor-not-allowed opacity-40'
                                : 'bg-[var(--bearish-bg)] hover:bg-[var(--bearish-bg)] text-[var(--bearish)] border-[var(--bearish-border)] cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW USER                                                  */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade">
          <div className="w-full max-w-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-[var(--shadow-overlay)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  TAMBAH PENGGUNA BARU
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="e.g. Budi Trader"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Email <span className="text-[var(--bearish)]">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="trader@marketintel.pro"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">
                  Password (optional — generated when left blank)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="At least 6 characters"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: `Trader_${Math.random().toString(36).slice(-6)}!26` })}
                    className="px-2 py-1 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded text-[10px]"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Role Authority</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Subscription Tier</label>
                  <select
                    value={createForm.plan}
                    onChange={e => setCreateForm({ ...createForm, plan: e.target.value as any })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="INSTITUTIONAL">INSTITUTIONAL</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create-is-verified"
                  checked={createForm.is_verified}
                  onChange={e => setCreateForm({ ...createForm, is_verified: e.target.checked })}
                  className="rounded bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="create-is-verified" className="text-[var(--text-secondary)] cursor-pointer">
                  Verify this account email immediately (no confirmation needed)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded transition cursor-pointer"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-white font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Create account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER ACCESS & TIER                                          */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade">
          <div className="w-full max-w-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-[var(--shadow-overlay)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  KELOLA AKSES PENGGUNA
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Role Authority</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">Subscription Tier</label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({ ...editForm, plan: e.target.value as any })}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="INSTITUTIONAL">INSTITUTIONAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1">Status Langganan</label>
                <select
                  value={editForm.subscription_status}
                  onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="canceled">Canceled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-verified"
                  checked={editForm.is_verified}
                  onChange={e => setEditForm({ ...editForm, is_verified: e.target.checked })}
                  className="rounded bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--accent)] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="edit-is-verified" className="text-[var(--text-secondary)] cursor-pointer">
                  Status Terverifikasi (Email Verified)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded transition cursor-pointer"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] text-white font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Save changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade">
          <div className="w-full max-w-md bg-[var(--bg-canvas)] border border-[var(--bearish-border)] rounded-xl p-5 shadow-[var(--shadow-overlay)] space-y-4">
            <div className="flex items-center gap-3 text-[var(--bearish)]">
              <div className="p-2 rounded-full bg-[var(--bearish-bg)] border border-[var(--bearish-border)]">
                <Trash2 className="w-5 h-5 text-[var(--bearish)]" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  HAPUS AKUN USER
                </h3>
                <p className="text-[11px] font-mono text-[var(--bearish)]">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-[var(--bearish-bg)] border border-[var(--bearish-border)] rounded-lg p-3 font-mono text-xs space-y-2 text-[var(--text-secondary)]">
              <div>
                Delete the following account permanently?
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                <div className="text-[var(--text-primary)] font-bold">{deletingUser.name || 'Trader'}</div>
                <div className="text-[var(--accent)]">{deletingUser.email}</div>
                <div className="text-[10px] text-[var(--text-muted)]">ID: {deletingUser.id} • Role: {deletingUser.role}</div>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                All watchlist data, verification tokens, interface preferences, and login sessions for this user will be removed from the system.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded text-xs font-mono transition cursor-pointer"
              >Cancel</button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={loading}
                className="px-4 py-1.5 bg-[var(--bearish)] hover:bg-[var(--bearish)] text-white font-mono text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Delete permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESET PASSWORD                                                   */}
      {/* ========================================================================= */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade">
          <div className="w-full max-w-md bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-[var(--shadow-overlay)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--warning)]" />
                <h3 className="text-sm font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  RESET PASSWORD USER
                </h3>
              </div>
              <button
                onClick={() => {
                  setPasswordResetUser(null);
                  setGeneratedTempPass(null);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="font-mono text-xs space-y-3">
              <div className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)]">Target account: </span>
                <span className="text-[var(--text-primary)] font-bold">{passwordResetUser.email}</span>
              </div>

              {generatedTempPass ? (
                <div className="p-3.5 rounded-lg bg-[var(--bullish-bg)] border border-[var(--bullish-border)] space-y-2">
                  <div className="text-[var(--bullish)] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[var(--bullish)]" />
                    <span>New password saved:</span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bg-canvas)] p-2 rounded border border-[var(--bullish-border)]">
                    <span className="text-sm font-mono font-bold text-[var(--bullish)] select-all">
                      {generatedTempPass}
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedTempPass, 'temp_pass')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] text-[10px] cursor-pointer"
                    >
                      {hasCopied === 'temp_pass' ? <Check className="w-3 h-3 text-[var(--bullish)]" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopied === 'temp_pass' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    Give this password to the user so they can sign in to the terminal.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExecutePasswordReset} className="space-y-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      New password (leave blank to generate one automatically)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TraderNewPass#2026"
                      value={resetPasswordInput}
                      onChange={e => setResetPasswordInput(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--warning-border)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setPasswordResetUser(null)}
                      className="px-3 py-1.5 bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] rounded transition cursor-pointer"
                    >Cancel</button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-[var(--warning)] hover:bg-[var(--warning)] text-[var(--text-primary)] font-bold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>Reset Password Sekarang</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: SMTP SERVER CONNECTION TESTER                                    */}
      {/* ========================================================================= */}
      {showSmtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade">
          <div className="w-full max-w-3xl bg-[var(--bg-canvas)] border border-[var(--accent)] rounded-2xl p-6 shadow-[var(--shadow-overlay)] space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                  UJI KONEKSI SMTP SERVER
                </h3>
              </div>
              <button
                onClick={() => setShowSmtpModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-section-alt)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <AdminSmtpTester
              currentUserEmail={currentUser?.email}
              onStatusChange={onUserModified}
            />
          </div>
        </div>
      )}
    </div>
  );
};
