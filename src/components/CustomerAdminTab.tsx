import React, { useState } from 'react';
import type { Customer } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { formatDateIndonesian } from '../lib/format';
import {
  Shield,
  Plus,
  Edit2,
  Copy,
  Check,
  Calendar,
  Heart,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CustomerAdminTabProps {
  customers: Customer[];
  onRefreshCustomers: () => void;
  currentUserId: string;
}

export const CustomerAdminTab: React.FC<CustomerAdminTabProps> = ({
  customers,
  onRefreshCustomers,
  currentUserId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSlug, setNewSlug] = useState<string>('');
  const [newCoupleNames, setNewCoupleNames] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCoupleNames, setEditCoupleNames] = useState<string>('');
  const [editEventDate, setEditEventDate] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCoupleNames(customer.couple_names);
    const d = customer.event_date ? customer.event_date.slice(0, 10) : '';
    setEditEventDate(d);
    setEditError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanSlug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanSlug) {
      setAddError('Slug tautan tidak boleh kosong.');
      return;
    }
    if (!newCoupleNames.trim()) {
      setAddError('Nama pasangan tidak boleh kosong.');
      return;
    }
    if (!newEventDate) {
      setAddError('Tanggal acara harus diisi.');
      return;
    }

    setAdding(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('customers').insert([
        {
          slug: cleanSlug,
          couple_names: newCoupleNames.trim(),
          event_date: newEventDate,
          owner_id: currentUserId,
        },
      ]);

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          setAddError('Slug tautan ini sudah digunakan oleh undangan lain. Silakan gunakan slug lain.');
        } else {
          setAddError('Gagal menambahkan undangan: ' + error.message);
        }
        return;
      }

      setNewSlug('');
      setNewCoupleNames('');
      setNewEventDate('');
      setShowAddModal(false);
      onRefreshCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);

    if (!editCoupleNames.trim()) {
      setEditError('Nama pasangan tidak boleh kosong.');
      return;
    }
    if (!editEventDate) {
      setEditError('Tanggal acara harus diisi.');
      return;
    }

    setUpdating(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('customers')
        .update({
          couple_names: editCoupleNames.trim(),
          event_date: editEventDate,
        })
        .eq('id', editingCustomer.id);

      if (error) {
        setEditError('Gagal memperbarui undangan: ' + error.message);
        return;
      }

      setEditingCustomer(null);
      onRefreshCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setEditError(msg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Hak Akses Khusus Administrator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3b47]">
            Kelola Daftar Undangan (Customers)
          </h1>
          <p className="text-xs text-[#5e7d87]">
            Lihat, tambah pelanggan baru, atau ubah nama pengantin dan tanggal acara
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] shadow-xs transition"
        >
          <Plus className="w-4 h-4 text-[#fffdf8]" />
          <span>Tambah Undangan Baru</span>
        </button>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {customers.map((c) => {
          const isCopied = copiedId === c.id;
          return (
            <div
              key={c.id}
              className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-5 space-y-4 shadow-xs hover:border-[#cbbea7] transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-[#0f3b47] flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-600 fill-pink-600/20" />
                    <span>{c.couple_names}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#0f3b47] font-mono font-bold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>/{c.slug}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(c)}
                  className="p-2 rounded-xl bg-[#f0ebd9] hover:bg-[#e6deca] text-[#0f3b47] border border-[#d8cdb8] transition"
                  title="Edit data pasangan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#faf6ee] rounded-xl border border-[#e3dac8] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#2c4e57]">
                  <span className="flex items-center gap-1.5 text-[#5e7d87] font-medium">
                    <Calendar className="w-3.5 h-3.5" /> Tanggal Acara:
                  </span>
                  <span className="font-bold text-[#0f3b47]">
                    {formatDateIndonesian(c.event_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#ede5d4]">
                  <span className="text-[#6d8a93] font-mono text-[11px]">ID Undangan:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-[#42646e] max-w-[150px] truncate">
                      {c.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(c.id, c.id)}
                      className={`p-1 rounded-md text-[10px] font-bold transition ${
                        isCopied
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#f0ebd9] text-[#0f3b47] hover:bg-[#e6dfcb]'
                      }`}
                      title="Salin ID Pelanggan"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <h3 className="text-base font-bold text-[#0f3b47]">Tambah Undangan Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#6d8a93] hover:text-[#0f3b47] text-xs px-2 py-1 font-bold"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#1f404b] font-bold mb-1.5">
                  Nama Pasangan (couple_names)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Romeo & Juliet"
                  value={newCoupleNames}
                  onChange={(e) => setNewCoupleNames(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
              </div>

              <div>
                <label className="block text-[#1f404b] font-bold mb-1.5">
                  Slug Tautan (slug)
                </label>
                <input
                  type="text"
                  required
                  placeholder="romeo-juliet"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
                <p className="text-[11px] text-[#6d8a93] mt-1">Hanya huruf kecil, angka, dan strip.</p>
              </div>

              <div>
                <label className="block text-[#1f404b] font-bold mb-1.5">
                  Tanggal Acara (event_date)
                </label>
                <input
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-[#3d5e68] hover:text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 rounded-xl font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{adding ? 'Menyimpan...' : 'Simpan Undangan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0f3b47]">Edit Undangan</h3>
                <p className="text-[11px] text-[#5e7d87] font-mono">/{editingCustomer.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-[#6d8a93] hover:text-[#0f3b47] text-xs px-2 py-1 font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#1f404b] font-bold mb-1.5">
                  Nama Pasangan (couple_names)
                </label>
                <input
                  type="text"
                  required
                  value={editCoupleNames}
                  onChange={(e) => setEditCoupleNames(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
              </div>

              <div>
                <label className="block text-[#1f404b] font-bold mb-1.5">
                  Tanggal Acara (event_date)
                </label>
                <input
                  type="date"
                  required
                  value={editEventDate}
                  onChange={(e) => setEditEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl text-[#3d5e68] hover:text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{updating ? 'Menyimpan...' : 'Perbarui'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
