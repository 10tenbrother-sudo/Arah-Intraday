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
      showToast(err.message || 'Gagal memuat daftar pengguna.', 'error');
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
        showToast(`Akses akun ${res.user.email} berhasil diperbarui.`);
        setEditingUser(null);
        loadUsers();
        onUserModified?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui data user.', 'error');
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
          `User ${res.user.email} berhasil didaftarkan.` +
          (res.initial_password ? ` Password sementara: ${res.initial_password}` : '')
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
      showToast(err.message || 'Gagal membuat pengguna baru.', 'error');
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
        showToast(res.message || `User ${deletingUser.email} berhasil dihapus.`);
        setDeletingUser(null);
        loadUsers();
        onUserModified?.();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus user.', 'error');
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
      showToast(err.message || 'Gagal mengubah status verifikasi.', 'error');
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
        showToast(`Password untuk ${passwordResetUser.email} berhasil diperbarui.`);
        loadUsers();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mereset password.', 'error');
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
    <div className="space-y-4 font-sans text-slate-100" id="admin-user-management-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-mono border transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-800/80'
              : toastMessage.type === 'info'
              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-800/80'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-200 ml-3 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Overview & Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>TOTAL PENGGUNA</span>
            </span>
            <span className="text-[10px] text-slate-500">Database</span>
          </div>
          <div className="text-xl font-bold text-slate-100">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{metrics.verified}</span>
            <span>aktif & terverifikasi</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>ADMINISTRATOR</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
              Role
            </span>
          </div>
          <div className="text-xl font-bold text-amber-300">{metrics.admins}</div>
          <div className="text-[11px] text-slate-400">
            <span>Akses otorisasi sistem penuh</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>PRO & INSTITUTIONAL</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
              Premium
            </span>
          </div>
          <div className="text-xl font-bold text-purple-300">
            {metrics.pro + metrics.institutional}
          </div>
          <div className="text-[11px] text-slate-400">
            <span>{metrics.institutional} Institutional • {metrics.pro} Pro</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>VERIFIKASI EMAIL</span>
            </span>
            <span className="text-[10px] text-slate-500">
              {metrics.total > 0 ? Math.round((metrics.verified / metrics.total) * 100) : 0}%
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{metrics.verified}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-amber-400 font-semibold">{metrics.unverified}</span>
            <span>belum terverifikasi</span>
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar & Search Filters */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari user berdasarkan nama, email, atau ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-600 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="ALL">Semua Role</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="ALL">Semua Tier</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="INSTITUTIONAL">INSTITUTIONAL</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verifiedFilter}
            onChange={e => setVerifiedFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-600"
          >
            <option value="ALL">Semua Verifikasi</option>
            <option value="true">Verified Saja</option>
            <option value="false">Unverified Saja</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={loadUsers}
            disabled={loading}
            title="Muat ulang data pengguna"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Test SMTP Connection Button */}
          <button
            onClick={() => setShowSmtpModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-800/60 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Uji coba koneksi SMTP server email"
            id="admin-test-smtp-button"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tes SMTP</span>
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah User</span>
          </button>
        </div>
      </div>

      {/* 3. Users Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-semibold">User & Identitas</th>
                <th className="p-3 font-semibold">Role Authority</th>
                <th className="p-3 font-semibold">Subscription Tier</th>
                <th className="p-3 font-semibold">Status Akun</th>
                <th className="p-3 font-semibold">Email Verifikasi</th>
                <th className="p-3 font-semibold text-right">Kelola Akses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-cyan-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memuat data pengguna...</span>
                      </div>
                    ) : (
                      'Tidak ada akun pengguna yang sesuai dengan filter.'
                    )}
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isCurrentAccount = currentUser?.id === u.id || currentUser?.email?.toLowerCase() === u.email.toLowerCase();
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      {/* User Info */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
                            {(u.name || u.email).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100">{u.name || 'Unnamed Trader'}</span>
                              {isCurrentAccount && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold">
                                  AKUN ANDA
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>{u.email}</span>
                            </div>
                            <div className="text-[9px] text-slate-600 mt-0.5">ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role === 'ADMIN' ? (
                            <Shield className="w-2.5 h-2.5 text-amber-400" />
                          ) : (
                            <Users className="w-2.5 h-2.5 text-slate-400" />
                          )}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      {/* Subscription Tier */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.plan === 'INSTITUTIONAL'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : u.plan === 'PRO'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
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
                              ? 'text-emerald-400'
                              : u.subscription_status === 'trialing'
                              ? 'text-cyan-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {u.subscription_status || 'active'}
                        </span>
                      </td>

                      {/* Email Verification */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {u.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleVerification(u)}
                              title="Klik untuk verifikasi instan akun ini"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] hover:bg-amber-900 transition cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Verifikasi Sekarang</span>
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
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded border border-slate-700 transition cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Ubah Role & Paket Langganan"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrentAccount}
                            title={isCurrentAccount ? 'Tidak dapat menghapus akun admin Anda sendiri' : 'Hapus akun user ini'}
                            className={`p-1.5 rounded border transition ${
                              isCurrentAccount
                                ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-40'
                                : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800/80 cursor-pointer'
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
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                  TAMBAH PENGGUNA BARU
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="e.g. Budi Trader"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="trader@marketintel.pro"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  Password (Opsional - otomatis dibuat bila kosong)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Minimal 6 karakter"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: `Trader_${Math.random().toString(36).slice(-6)}!26` })}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Role Authority</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Subscription Tier</label>
                  <select
                    value={createForm.plan}
                    onChange={e => setCreateForm({ ...createForm, plan: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-cyan-500"
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
                  className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="create-is-verified" className="text-slate-300 cursor-pointer">
                  Langsung verifikasi email akun ini (tidak perlu konfirmasi)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Buat Akun</span>
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
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                  KELOLA AKSES PENGGUNA
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Role Authority</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Subscription Tier</label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({ ...editForm, plan: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                    <option value="INSTITUTIONAL">INSTITUTIONAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Status Langganan</label>
                <select
                  value={editForm.subscription_status}
                  onChange={e => setEditForm({ ...editForm, subscription_status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-2 text-slate-200 outline-none focus:border-cyan-500"
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
                  className="rounded bg-slate-900 border-slate-800 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="edit-is-verified" className="text-slate-300 cursor-pointer">
                  Status Terverifikasi (Email Verified)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Simpan Perubahan</span>
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
          <div className="w-full max-w-md bg-slate-950 border border-rose-900/80 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-full bg-rose-950 border border-rose-800">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                  HAPUS AKUN USER
                </h3>
                <p className="text-[11px] font-mono text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3 font-mono text-xs space-y-2 text-slate-300">
              <div>
                Apakah Anda yakin ingin menghapus akun berikut secara permanen?
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="text-slate-100 font-bold">{deletingUser.name || 'Trader'}</div>
                <div className="text-cyan-400">{deletingUser.email}</div>
                <div className="text-[10px] text-slate-500">ID: {deletingUser.id} • Role: {deletingUser.role}</div>
              </div>
              <p className="text-[11px] text-slate-400">
                Seluruh data watchlist, token verifikasi, preferensi antarmuka, dan sesi login pengguna ini akan dihapus dari sistem.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={loading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {loading && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Hapus Permanen</span>
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
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider">
                  RESET PASSWORD USER
                </h3>
              </div>
              <button
                onClick={() => {
                  setPasswordResetUser(null);
                  setGeneratedTempPass(null);
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="font-mono text-xs space-y-3">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-400">Target Akun: </span>
                <span className="text-slate-200 font-bold">{passwordResetUser.email}</span>
              </div>

              {generatedTempPass ? (
                <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 space-y-2">
                  <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Password Baru Berhasil Disimpan:</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-emerald-800">
                    <span className="text-sm font-mono font-bold text-emerald-400 select-all">
                      {generatedTempPass}
                    </span>
                    <button
                      onClick={() => copyToClipboard(generatedTempPass, 'temp_pass')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
                    >
                      {hasCopied === 'temp_pass' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{hasCopied === 'temp_pass' ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Berikan kata sandi ini kepada pengguna untuk masuk ke terminal.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExecutePasswordReset} className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Password Baru (Kosongkan untuk membuat password otomatis)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TraderNewPass#2026"
                      value={resetPasswordInput}
                      onChange={e => setResetPasswordInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPasswordResetUser(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-3xl bg-slate-950 border border-cyan-800/80 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
                  UJI KONEKSI SMTP SERVER
                </h3>
              </div>
              <button
                onClick={() => setShowSmtpModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-800"
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
