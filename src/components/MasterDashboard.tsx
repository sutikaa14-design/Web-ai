import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Plus,
  Search,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  LogOut,
  Radio,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Lock,
  Mail,
  User,
  X,
  Check,
} from 'lucide-react';
import { authService, MASTER_EMAIL } from '../services/authService';
import { AuthSession, UserAccount, UserStatus } from '../types';

interface MasterDashboardProps {
  currentSession: AuthSession;
  onLogout: () => void;
  onOpenLiveMate: () => void;
}

export const MasterDashboard: React.FC<MasterDashboardProps> = ({
  currentSession,
  onLogout,
  onOpenLiveMate,
}) => {
  const [owners, setOwners] = useState<UserAccount[]>(() => authService.getOwners());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<UserAccount | null>(null);
  const [deleteConfirmOwner, setDeleteConfirmOwner] = useState<UserAccount | null>(null);

  // Form States for Add/Edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formStatus, setFormStatus] = useState<UserStatus>('active');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reloadOwners = () => {
    setOwners(authService.getOwners());
  };

  useEffect(() => {
    reloadOwners();
  }, []);

  const handleOpenAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormStatus('active');
    setFormNotes('');
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (owner: UserAccount) => {
    setEditingOwner(owner);
    setFormName(owner.name);
    setFormEmail(owner.email);
    setFormPassword(''); // blank means keep current
    setFormStatus(owner.status);
    setFormNotes(owner.notes || '');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleToggleStatus = (owner: UserAccount) => {
    try {
      authService.toggleOwnerStatus(owner.id);
      reloadOwners();
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status Owner');
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await authService.createOwner({
        name: formName,
        email: formEmail,
        password: formPassword,
        status: formStatus,
        notes: formNotes,
      });
      reloadOwners();
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menambahkan Owner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOwner) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      await authService.updateOwner(editingOwner.id, {
        name: formName,
        email: formEmail,
        password: formPassword.trim() ? formPassword : undefined,
        status: formStatus,
        notes: formNotes,
      });
      reloadOwners();
      setEditingOwner(null);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal memperbarui data Owner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmOwner) return;
    try {
      authService.deleteOwner(deleteConfirmOwner.id);
      reloadOwners();
      setDeleteConfirmOwner(null);
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus Owner');
    }
  };

  // Filter and search
  const filteredOwners = owners.filter((owner) => {
    const matchesSearch =
      owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (owner.notes && owner.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : owner.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalActive = owners.filter((o) => o.status === 'active').length;
  const totalInactive = owners.filter((o) => o.status === 'inactive').length;

  return (
    <div
      id="view-master-dashboard"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col"
    >
      {/* 1. Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3.5 backdrop-blur-md sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
            LM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight font-serif">
                Master Portal <span className="text-indigo-400">LiveMate AI</span>
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Superadmin</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pengelolaan Akses Akun Owner & Kendali Sistem
            </p>
          </div>
        </div>

        {/* Master Identity Pill & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-slate-400">Master:</span>
            <span className="font-semibold text-slate-200">{MASTER_EMAIL}</span>
          </div>

          <button
            id="btn-master-open-livemate"
            type="button"
            onClick={onOpenLiveMate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer border border-indigo-400/30"
            title="Buka Dasbor Siaran LiveMate AI sebagai Host"
          >
            <Radio className="w-3.5 h-3.5 text-rose-300" />
            <span>Buka LiveMate AI</span>
          </button>

          <button
            id="btn-master-logout"
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/70 hover:border-rose-500/30 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Keluar dari akun Master"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* System Rules Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-200 text-sm">
                Aturan Otoritas Master (Tunggal)
              </h2>
              <p className="text-slate-400 mt-0.5">
                Hanya 1 akun Master ({MASTER_EMAIL}). Tidak diperkenankan membuat Master kedua. Hanya akun Owner berstatus <span className="text-emerald-400 font-semibold">ACTIVE</span> yang dapat mengoperasikan LiveMate AI.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Proteksi Role Aktif</span>
            </span>
          </div>
        </div>

        {/* 3. Metric Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Owners */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Total Owner</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{owners.length}</div>
            <p className="text-[11px] text-slate-500 mt-1">Akun yang didaftarkan Master</p>
          </div>

          {/* Card 2: Active Owners */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">Owner ACTIVE</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-300 font-mono">{totalActive}</div>
            <p className="text-[11px] text-slate-500 mt-1">Dapat menggunakan LiveMate AI</p>
          </div>

          {/* Card 3: Inactive Owners */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-400">Owner INACTIVE</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-300 font-mono">{totalInactive}</div>
            <p className="text-[11px] text-slate-500 mt-1">Akses siaran ditangguhkan</p>
          </div>

          {/* Card 4: Master Account Identity */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-400">Akun Master</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm font-bold text-white truncate">{MASTER_EMAIL}</div>
            <p className="text-[11px] text-purple-400/80 mt-1">1 Akun Master Terproteksi</p>
          </div>
        </div>

        {/* 4. Owner Management Table & Action Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Daftar Akun Owner</span>
                <span className="text-xs font-normal text-slate-400">
                  ({filteredOwners.length} dari {owners.length})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Kelola hak akses dan status aktif untuk setiap streamer/host
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="input-search-owner"
                  type="text"
                  placeholder="Cari nama / email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Inactive
                </button>
              </div>

              {/* Add Owner Button */}
              <button
                id="btn-open-add-owner"
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Owner</span>
              </button>
            </div>
          </div>

          {/* Owner List / Table */}
          {filteredOwners.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800/60">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2.5" />
              <div className="text-sm font-semibold text-slate-300">Tidak ada akun Owner ditemukan</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tidak ada akun yang cocok dengan kata kunci pencarian.'
                  : 'Belum ada akun Owner yang dibuat. Klik "Tambah Owner" untuk membuat akun baru.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Owner Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Owner / Host</th>
                    <th className="py-3 px-3">Email Akun</th>
                    <th className="py-3 px-3 text-center">Status Akses</th>
                    <th className="py-3 px-3 hidden md:table-cell">Waktu Dibuat</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOwners.map((owner) => (
                    <tr
                      key={owner.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Notes */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              owner.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {owner.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{owner.name}</span>
                              {owner.status === 'active' ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Aktif" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Dinonaktifkan" />
                              )}
                            </div>
                            {owner.notes && (
                              <div className="text-[11px] text-slate-400 line-clamp-1">{owner.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {owner.email}
                      </td>

                      {/* Status Toggle & Badge */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(owner)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            owner.status === 'active'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-emerald-500/15 hover:border-emerald-500/40 hover:text-emerald-300'
                          }`}
                          title={`Klik untuk ${
                            owner.status === 'active' ? 'nonaktifkan' : 'aktifkan'
                          } akses Owner`}
                        >
                          {owner.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>INACTIVE</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Date Created */}
                      <td className="py-3 px-3 hidden md:table-cell text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>
                            {new Date(owner.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(owner)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                            title="Edit data Owner"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmOwner(owner)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/60 transition-colors cursor-pointer"
                            title="Hapus akun Owner"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 5. Modal: Tambah Owner Baru */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Tambah Akun Owner Baru</h4>
                  <p className="text-xs text-slate-400">Akun khusus host / streamer live siaran</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Host / Owner *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kak Sarah Streamer"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Login *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="Contoh: sarah@livemate.ai"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Catatan: Tidak dapat menggunakan {MASTER_EMAIL} (khusus Master tunggal).
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password Login *</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Minimal 4 karakter"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Password akan otomatis di-hash menggunakan SHA-256 secara aman.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Awal</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="active">Active (Bisa Langsung LIVE)</option>
                    <option value="inactive">Inactive (Akses Ditangguhkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sesi Malam / Skincare"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Owner */}
      {editingOwner && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Edit Data Owner</h4>
                  <p className="text-xs text-slate-400">ID: {editingOwner.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingOwner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Host / Owner *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Login *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Reset Password (Kosongkan jika tidak ingin diubah)
                </label>
                <input
                  type="password"
                  placeholder="Masukkan password baru (opsional)"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status Akun</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="active">Active (Dapat Masuk LiveMate)</option>
                    <option value="inactive">Inactive (Dilarang Masuk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Catatan</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Konfirmasi Hapus Owner */}
      {deleteConfirmOwner && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-white text-base">Hapus Akun Owner?</h4>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus akun <strong className="text-slate-200">{deleteConfirmOwner.name}</strong> ({deleteConfirmOwner.email})? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOwner(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Ya, Hapus Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
