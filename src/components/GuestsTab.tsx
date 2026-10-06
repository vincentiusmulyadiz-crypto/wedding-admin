import React, { useEffect, useState, useCallback } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { formatDateTimeIndonesian, getAttendanceBadge } from '../lib/format';
import { exportToCsv } from '../lib/csv';
import { TableSkeleton } from './Skeleton';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  MessageSquare,
  LinkIcon,
  AlertTriangle,
  Clock,
  RotateCw,
} from 'lucide-react';

interface GuestsTabProps {
  customer: Customer;
}

const PAGE_SIZE = 25;

export const GuestsTab: React.FC<GuestsTabProps> = ({ customer }) => {
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<Rsvp | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const [viewMessage, setViewMessage] = useState<Rsvp | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    setFetchError(null);

    try {
      const supabase = getSupabase();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('rsvps')
        .select('*', { count: 'exact' })
        .eq('customer_id', customer.id);

      if (filterAttendance !== 'all') {
        query = query.eq('attendance', filterAttendance);
      }

      if (searchQuery.trim()) {
        const term = `%${searchQuery.trim()}%`;
        query = query.or(`name.ilike.${term},guest_param.ilike.${term},message.ilike.${term}`);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Error fetching guests:', error.message);
        setFetchError(error.message);
        return;
      }

      setRsvps((data as Rsvp[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [customer?.id, page, filterAttendance, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGuests();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('rsvps')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) {
        alert('Gagal menghapus data: ' + error.message);
      } else {
        setItemToDelete(null);
        if (rsvps.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchGuests();
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const supabase = getSupabase();

      let query = supabase
        .from('rsvps')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (filterAttendance !== 'all') {
        query = query.eq('attendance', filterAttendance);
      }

      const { data, error } = await query;
      if (error) {
        alert('Gagal mengekspor data: ' + error.message);
        return;
      }

      const rowsData = ((data as Rsvp[]) || []).map((item) => {
        const attendanceLabel =
          item.attendance === 'hadir'
            ? 'Hadir'
            : item.attendance === 'tidak_hadir'
            ? 'Tidak Hadir'
            : 'Belum Pasti';

        return [
          item.created_at,
          item.name,
          attendanceLabel,
          item.guests,
          item.message || '',
          item.guest_param || '',
        ];
      });

      const headers = [
        'Waktu (Created At)',
        'Nama Tamu',
        'Kehadiran',
        'Jumlah Tamu',
        'Ucapan & Doa',
        'Nama di Link (guest_param)',
      ];

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `rsvp-${customer.slug}-${dateStr}.csv`;
      exportToCsv(filename, headers, rowsData);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3b47] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0f3b47]" />
            <span>Daftar Konfirmasi Tamu (RSVP)</span>
          </h1>
          <p className="text-xs text-[#5e7d87]">
            Total {totalCount} respons masuk untuk undangan {customer.couple_names}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchGuests}
            className="p-2 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-[#3d5e68] hover:text-[#0f3b47] hover:bg-[#f3eedf] transition shadow-xs"
            title="Segarkan data"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || totalCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#fffdf8]" />
            <span>{exporting ? 'Mengekspor...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-900">Gagal Memuat Data Supabase:</p>
            <p className="font-mono text-[11px]">{fetchError}</p>
            <p className="text-rose-700">Pastikan tabel 'rsvps' dan RLS policy di Supabase sudah dibuat dan akun Anda memiliki izin baca.</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (Cream surface) */}
      <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#75949e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, ucapan, atau nama di link..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
          </form>

          {/* Filter Attendance */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#75949e] shrink-0" />
            <select
              value={filterAttendance}
              onChange={(e) => {
                setFilterAttendance(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            >
              <option value="all">Semua Kehadiran</option>
              <option value="hadir">Hadir Saja</option>
              <option value="tidak_hadir">Tidak Hadir Saja</option>
              <option value="belum_pasti">Belum Pasti Saja</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#75949e] shrink-0" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            >
              <option value="created_at-desc">Waktu Terbaru</option>
              <option value="created_at-asc">Waktu Terlama</option>
              <option value="name-asc">Nama (A - Z)</option>
              <option value="name-desc">Nama (Z - A)</option>
              <option value="guests-desc">Jumlah Tamu Terbanyak</option>
              <option value="guests-asc">Jumlah Tamu Tersedikit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Table on Desktop, Stacked Cards on Mobile */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : rsvps.length === 0 ? (
        <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#f4ede0] border border-[#ded3bc] flex items-center justify-center mx-auto text-[#0f3b47]">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#0f3b47]">Tidak ada data RSVP ditemukan</h2>
          <p className="text-xs text-[#5e7d87] max-w-sm mx-auto">
            {searchQuery || filterAttendance !== 'all'
              ? 'Coba ubah kata kunci pencarian atau reset filter kehadiran.'
              : 'Belum ada tamu yang mengisi konfirmasi kehadiran.'}
          </p>
          {(searchQuery || filterAttendance !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterAttendance('all');
                setPage(1);
              }}
              className="text-xs text-[#0f3b47] hover:underline font-bold pt-2 inline-block"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#fffdf9] border border-[#e3dac8] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5eedf] text-[#345761] font-bold border-b border-[#e3dac8]">
                <tr>
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Nama</th>
                  <th className="py-3.5 px-4">Kehadiran</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Tamu</th>
                  <th className="py-3.5 px-4">Ucapan</th>
                  <th className="py-3.5 px-4">Nama di Link</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d4]">
                {rsvps.map((item) => {
                  const badge = getAttendanceBadge(item.attendance);
                  return (
                    <tr key={item.id} className="hover:bg-[#f8f3e9] transition">
                      <td className="py-3.5 px-4 text-[#597983] whitespace-nowrap font-mono text-[11px]">
                        {formatDateTimeIndonesian(item.created_at)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0f3b47] max-w-[180px] truncate">
                        {item.name}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.colorClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.bgClass}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold font-mono text-[#0f3b47]">
                        {item.guests}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        {item.message ? (
                          <button
                            type="button"
                            onClick={() => setViewMessage(item)}
                            className="text-left text-[#1c3d47] hover:text-[#0f3b47] hover:underline truncate block max-w-[240px] italic"
                            title="Klik untuk membaca selengkapnya"
                          >
                            "{item.message}"
                          </button>
                        ) : (
                          <span className="text-[#96adb5]">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#597983] font-mono text-[11px] max-w-[140px] truncate">
                        {item.guest_param || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-100 rounded-lg transition"
                          title="Hapus RSVP"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {rsvps.map((item) => {
              const badge = getAttendanceBadge(item.attendance);
              return (
                <div
                  key={item.id}
                  className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0f3b47] text-sm">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#698892] font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{formatDateTimeIndonesian(item.created_at)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-2 text-rose-700 hover:bg-rose-100 rounded-xl"
                      title="Hapus RSVP"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#eee5d4] bg-[#faf6ee] rounded-xl px-3">
                    <div className="flex items-center gap-2 text-[#0f3b47] font-semibold">
                      <Users className="w-3.5 h-3.5 text-[#0f3b47]" />
                      <span>{item.guests} Orang</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#5e7d87] truncate">
                      <LinkIcon className="w-3.5 h-3.5 text-[#7c9aa3] shrink-0" />
                      <span className="truncate font-mono text-[11px]">{item.guest_param || '(tanpa parameter)'}</span>
                    </div>
                  </div>

                  {item.message ? (
                    <div className="text-xs text-[#1e424c] italic bg-[#faf6ee] p-2.5 rounded-xl border border-[#e5dcce]">
                      "{item.message}"
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#93abb3] italic">Tidak ada pesan ucapan</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#5e7d87]">
            <div>
              Menampilkan <span className="font-bold text-[#0f3b47]">{startItem}</span> -{' '}
              <span className="font-bold text-[#0f3b47]">{endItem}</span> dari{' '}
              <span className="font-bold text-[#0f3b47]">{totalCount}</span> tamu
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-[#2c4e57] hover:bg-[#f3eedf] disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-2 font-mono font-bold text-[#0f3b47]">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-[#2c4e57] hover:bg-[#f3eedf] disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0f3b47]">Konfirmasi Penghapusan</h3>
                <p className="text-xs text-[#5e7d87]">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-[#2b4c56] leading-relaxed">
              Apakah Anda yakin ingin menghapus data RSVP dari{' '}
              <strong className="text-[#0f3b47]">"{itemToDelete.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#3d5e68] hover:text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 transition shadow-xs"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Message Modal */}
      {viewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0f3b47]">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-sm font-bold text-[#0f3b47]">Ucapan dari {viewMessage.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewMessage(null)}
                className="text-[#6d8b94] hover:text-[#0f3b47] text-xs px-2 py-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#faf6ee] p-4 rounded-2xl border border-[#e3dac8] text-sm text-[#0f3b47] leading-relaxed whitespace-pre-wrap">
              {viewMessage.message}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewMessage(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
