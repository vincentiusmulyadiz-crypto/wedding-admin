import React, { useEffect, useState, useCallback } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { formatDateTimeIndonesian, getDetailedAttendanceInfo } from '../lib/format';
import { DEMO_ROMEO_JULIET_RSVPS } from '../data/demoData';
import { exportToCsv } from '../lib/csv';
import { TableSkeleton } from './Skeleton';
import { showToast } from '../lib/toast';
import {
  Search,
  SlidersHorizontal,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCw,
  X,
  MessageSquare,
  Clock,
  LinkIcon,
  ChevronDown,
} from 'lucide-react';

interface GuestsTabProps {
  customer: Customer;
}

const PAGE_SIZE = 25;

export type StatusFilterType = 'all' | 'hadir' | 'tidak_hadir' | 'belum_pasti';
export type EventFilterType =
  | 'all'
  | 'resepsi_saja'
  | 'akad_saja'
  | 'adat_saja'
  | 'resepsi_adat'
  | 'resepsi_akad'
  | 'semuanya';

export const getEventFilterLabel = (val: string): string => {
  switch (val) {
    case 'resepsi_saja':
    case 'hadir_resepsi':
      return 'Resepsi Saja';
    case 'akad_saja':
    case 'hadir_pemberkatan':
      return 'Akad Saja';
    case 'adat_saja':
    case 'hadir_adat':
      return 'Adat Saja';
    case 'resepsi_adat':
      return 'Resepsi & Adat';
    case 'resepsi_akad':
    case 'hadir_keduanya':
      return 'Resepsi & Akad';
    case 'semuanya':
    case 'hadir_semua':
      return 'Hadir Semua Acara';
    default:
      return 'Semua Acara';
  }
};

export const GuestsTab: React.FC<GuestsTabProps> = ({ customer }) => {
  const [allRsvps, setAllRsvps] = useState<Rsvp[]>([]);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [primaryStatusFilter, setPrimaryStatusFilter] = useState<StatusFilterType>('all');
  const [eventFilter, setEventFilter] = useState<EventFilterType>('all');

  // Filter popover state & draft filters
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [draftSortBy, setDraftSortBy] = useState<string>('created_at-desc');
  const [draftEventFilter, setDraftEventFilter] = useState<EventFilterType>('all');

  // Sync draft states when opening filter modal
  const handleOpenFilter = () => {
    setDraftSortBy(sortBy);
    setDraftEventFilter(eventFilter);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setSortBy(draftSortBy);
    setEventFilter(draftEventFilter);
    setPage(1);
    setShowFilterModal(false);
  };
  const [sortBy, setSortBy] = useState<string>('created_at-desc');

  // Detail panel state (Side drawer / Bottom sheet)
  const [selectedGuest, setSelectedGuest] = useState<Rsvp | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<Rsvp | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    setFetchError(null);

    try {
      const supabase = getSupabase();

      // Fetch all RSVPs for this customer from Supabase
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      // Fallback for Romeo & Juliet demo data
      if ((error || !data || data.length === 0) && (customer.id.includes('demo') || customer.slug === 'romeo-juliet')) {
        setAllRsvps(DEMO_ROMEO_JULIET_RSVPS);
        setFetchError(null);
        return;
      }

      if (error) {
        console.error('Error fetching guests:', error.message);
        setFetchError(error.message);
        return;
      }

      setAllRsvps((data as Rsvp[]) || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setFetchError(String(err));
    } finally {
      setLoading(false);
    }
  }, [customer?.id, customer?.slug]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  // Client-side filtering & sorting
  const filteredAndSortedRsvps = React.useMemo(() => {
    return allRsvps.filter((r) => {
      const { badge, eventCategory } = getDetailedAttendanceInfo(r.attendance, r.message);

      // 1. Status Filter: 'all' | 'hadir' | 'tidak_hadir' | 'belum_pasti'
      if (primaryStatusFilter !== 'all') {
        if (badge.group !== primaryStatusFilter) {
          return false;
        }
      }

      // 2. Jenis Kehadiran Filter: 'all' | 'resepsi_saja' | 'akad_saja' | 'adat_saja' | 'resepsi_adat' | 'resepsi_akad' | 'semuanya'
      if (eventFilter !== 'all') {
        // If an event filter is chosen, the guest must match that event category
        if (eventCategory !== eventFilter) {
          return false;
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (r.name || '').toLowerCase().includes(q);
        const matchParam = (r.guest_param || '').toLowerCase().includes(q);
        const matchMsg = (r.message || '').toLowerCase().includes(q);
        if (!matchName && !matchParam && !matchMsg) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const { badge: badgeA, eventCategory: catA } = getDetailedAttendanceInfo(a.attendance, a.message);
      const { badge: badgeB, eventCategory: catB } = getDetailedAttendanceInfo(b.attendance, b.message);

      switch (sortBy) {
        case 'created_at-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'created_at-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '', 'id');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '', 'id');
        case 'guests-desc':
          return (b.guests || 1) - (a.guests || 1);
        case 'guests-asc':
          return (a.guests || 1) - (b.guests || 1);

        // Sorting Status Kehadiran
        case 'status-hadir-first': {
          const rank = { hadir: 1, belum_pasti: 2, tidak_hadir: 3 };
          return (rank[badgeA.group] || 9) - (rank[badgeB.group] || 9);
        }
        case 'status-tidak-first': {
          const rank = { tidak_hadir: 1, belum_pasti: 2, hadir: 3 };
          return (rank[badgeA.group] || 9) - (rank[badgeB.group] || 9);
        }
        case 'status-belum-first': {
          const rank = { belum_pasti: 1, hadir: 2, tidak_hadir: 3 };
          return (rank[badgeA.group] || 9) - (rank[badgeB.group] || 9);
        }

        // Sorting Jenis Kehadiran
        case 'event-resepsi-first': {
          const isA = catA === 'resepsi_saja' ? 0 : 1;
          const isB = catB === 'resepsi_saja' ? 0 : 1;
          return isA - isB;
        }
        case 'event-akad-first': {
          const isA = catA === 'akad_saja' ? 0 : 1;
          const isB = catB === 'akad_saja' ? 0 : 1;
          return isA - isB;
        }
        case 'event-adat-first': {
          const isA = catA === 'adat_saja' ? 0 : 1;
          const isB = catB === 'adat_saja' ? 0 : 1;
          return isA - isB;
        }
        case 'event-resepsi_adat-first': {
          const isA = catA === 'resepsi_adat' ? 0 : 1;
          const isB = catB === 'resepsi_adat' ? 0 : 1;
          return isA - isB;
        }
        case 'event-resepsi_akad-first': {
          const isA = catA === 'resepsi_akad' ? 0 : 1;
          const isB = catB === 'resepsi_akad' ? 0 : 1;
          return isA - isB;
        }
        case 'event-semuanya-first': {
          const isA = catA === 'semuanya' ? 0 : 1;
          const isB = catB === 'semuanya' ? 0 : 1;
          return isA - isB;
        }

        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [allRsvps, primaryStatusFilter, eventFilter, searchQuery, sortBy]);

  const totalCount = filteredAndSortedRsvps.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedRsvps = React.useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    return filteredAndSortedRsvps.slice(from, from + PAGE_SIZE);
  }, [filteredAndSortedRsvps, page]);

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
        showToast('Gagal menghapus data: ' + error.message, 'error');
      } else {
        showToast(`Data konfirmasi "${itemToDelete.name}" berhasil dihapus`, 'success');
        setItemToDelete(null);
        if (selectedGuest?.id === itemToDelete.id) {
          setSelectedGuest(null);
        }
        if (paginatedRsvps.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchGuests();
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Terjadi kesalahan saat menghapus data', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const exportItems = filteredAndSortedRsvps;

      const rowsData = exportItems.map((item) => {
        const { badge, eventDetail } = getDetailedAttendanceInfo(item.attendance, item.message);
        const statusLabel = eventDetail ? `${badge.label} (${eventDetail})` : badge.label;
        return [
          item.created_at,
          item.name,
          statusLabel,
          item.guests,
          item.message || '',
          item.guest_param || '',
        ];
      });

      const headers = [
        'Waktu (Created At)',
        'Nama Tamu',
        'Status Kehadiran',
        'Jumlah Tamu',
        'Ucapan & Doa',
        'Nama di Link (guest_param)',
      ];

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `konfirmasi-tamu-${customer.slug}-${dateStr}.csv`;
      exportToCsv(filename, headers, rowsData);
      showToast('File CSV berhasil diunduh!', 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      showToast('Terjadi kesalahan saat export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-6">
      {/* 1. Header Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0e2c34] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0f3b47]" />
            <span>Daftar Konfirmasi Tamu</span>
          </h1>
          <p className="text-xs text-[#52717b] mt-0.5">
            Total {totalCount} respons kehadiran untuk undangan{' '}
            <span className="font-semibold text-[#0e2c34]">{customer.couple_names}</span>
          </p>
        </div>

        {/* Tombol Ekspor CSV & Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto sm:relative">
          <button
            type="button"
            onClick={fetchGuests}
            className="p-2 rounded-xl bg-[#fffdfa] border border-[#ded4be] text-[#3d5e68] hover:text-[#0e2c34] hover:bg-[#f0ebd9] transition shadow-xs"
            title="Segarkan data"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Tombol Ekspor CSV Mandiri */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || totalCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#fffdfa] text-[#0e2c34] border border-[#ded4be] hover:bg-[#f0ebd9] disabled:opacity-40 transition shadow-xs"
            title="Ekspor seluruh data konfirmasi ke file CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#0f3b47]" />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor CSV'}</span>
          </button>

          {/* Tombol Filter */}
          <button
            type="button"
            onClick={handleOpenFilter}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
              showFilterModal || eventFilter !== 'all' || sortBy !== 'created_at-desc'
                ? 'bg-[#0f3b47] text-white border-[#0f3b47]'
                : 'bg-[#fffdfa] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterModal ? 'rotate-180' : ''}`} />
          </button>

          {/* Modal / Popover Filter */}
          {showFilterModal && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none"
                onClick={() => setShowFilterModal(false)}
              />
              <div className="fixed inset-x-4 top-20 sm:top-11 sm:absolute sm:inset-x-auto sm:right-0 sm:mt-1 max-w-sm sm:w-80 bg-[#fffdfa] border border-[#d8cdb8] rounded-2xl shadow-2xl sm:shadow-xl p-4.5 z-50 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-[#eee5d4] pb-2.5">
                  <span className="font-bold text-[#0e2c34] text-sm sm:text-xs">Pengaturan Filter & Urutan</span>
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(false)}
                    className="p-1 rounded-lg text-[#6d8a93] hover:text-[#0e2c34] hover:bg-[#f0ebd9] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sorting */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0e2c34] block">Urutan Tampilan:</label>
                  <select
                    value={draftSortBy}
                    onChange={(e) => setDraftSortBy(e.target.value)}
                    className="w-full py-2 sm:py-1.5 px-3 sm:px-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] focus:outline-none focus:ring-1 focus:ring-[#0f3b47]"
                  >
                    <optgroup label="Berdasarkan Waktu & Nama">
                      <option value="created_at-desc">Waktu Terbaru</option>
                      <option value="created_at-asc">Waktu Terlama</option>
                      <option value="name-asc">Nama Tamu (A - Z)</option>
                      <option value="name-desc">Nama Tamu (Z - A)</option>
                      <option value="guests-desc">Jumlah Tamu Terbanyak</option>
                      <option value="guests-asc">Jumlah Tamu Tersedikit</option>
                    </optgroup>
                    <optgroup label="Prioritas Status Kehadiran">
                      <option value="status-hadir-first">Hadir Dulu</option>
                      <option value="status-tidak-first">Tidak Hadir Dulu</option>
                      <option value="status-belum-first">Belum Pasti Dulu</option>
                    </optgroup>
                    <optgroup label="Prioritas Jenis Kehadiran">
                      <option value="event-resepsi-first">Resepsi Saja Dulu</option>
                      <option value="event-akad-first">Akad Saja Dulu</option>
                      <option value="event-adat-first">Adat Saja Dulu</option>
                      <option value="event-resepsi_adat-first">Resepsi & Adat Dulu</option>
                      <option value="event-resepsi_akad-first">Resepsi & Akad Dulu</option>
                      <option value="event-semuanya-first">Hadir Semua Acara Dulu</option>
                    </optgroup>
                  </select>
                </div>

                {/* Filter Jenis Kehadiran */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0e2c34] block">Filter Jenis Kehadiran:</label>
                  <select
                    value={draftEventFilter}
                    onChange={(e) => setDraftEventFilter(e.target.value as EventFilterType)}
                    className="w-full py-2 sm:py-1.5 px-3 sm:px-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] focus:outline-none focus:ring-1 focus:ring-[#0f3b47]"
                  >
                    <option value="all">Semua Jenis Kehadiran</option>
                    <option value="resepsi_saja">Resepsi Saja (Termasuk Reservation)</option>
                    <option value="akad_saja">Akad Saja</option>
                    <option value="adat_saja">Adat Saja</option>
                    <option value="resepsi_adat">Resepsi & Adat</option>
                    <option value="resepsi_akad">Resepsi & Akad</option>
                    <option value="semuanya">Hadir Semua Acara</option>
                  </select>
                </div>

                {/* Tombol Terapkan Filter & Reset */}
                <div className="pt-2 border-t border-[#eee5d4] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftSortBy('created_at-desc');
                      setDraftEventFilter('all');
                      setSortBy('created_at-desc');
                      setEventFilter('all');
                      setPage(1);
                      setShowFilterModal(false);
                    }}
                    className="py-2.5 sm:py-2 px-3 rounded-xl bg-[#faf6ee] hover:bg-[#f0ebd9] text-[#52717b] hover:text-[#0e2c34] border border-[#ded4be] text-xs font-semibold transition"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilter}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 sm:py-2 px-3 rounded-xl bg-[#0f3b47] hover:bg-[#154e5e] text-white text-xs font-bold transition shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Terapkan Filter</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-900">Gagal Memuat Data Supabase:</p>
            <p className="font-mono text-[11px]">{fetchError}</p>
          </div>
        </div>
      )}

      {/* 2. Tampilan Awal: Kolom Pencarian & Filter Status Utama */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-3 sm:p-4 shadow-xs space-y-3 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Kolom Pencarian */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-[#75949e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau ucapan tamu..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] placeholder-[#819ea7] text-xs focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
          </form>

          {/* Satu Filter Status Utama: Hadir / Tidak Hadir / Belum Pasti */}
          <div className="inline-flex rounded-xl border border-[#ded4be] p-1 bg-[#faf6ee] text-xs overflow-x-auto max-w-full shrink-0">
            <button
              type="button"
              onClick={() => {
                setPrimaryStatusFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap shrink-0 ${
                primaryStatusFilter === 'all'
                  ? 'bg-[#0f3b47] text-white shadow-xs'
                  : 'text-[#52717b] hover:text-[#0e2c34]'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => {
                setPrimaryStatusFilter('hadir');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                primaryStatusFilter === 'hadir'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-[#52717b] hover:text-teal-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hadir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPrimaryStatusFilter('tidak_hadir');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                primaryStatusFilter === 'tidak_hadir'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-[#52717b] hover:text-rose-800'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Tidak Hadir</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPrimaryStatusFilter('belum_pasti');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                primaryStatusFilter === 'belum_pasti'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#52717b] hover:text-amber-800'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Belum Pasti</span>
            </button>
          </div>
        </div>

        {/* Filter Cepat Jenis Kehadiran (Resepsi Saja, Akad Saja, Adat Saja, Resepsi dan Adat, Resepsi dan Akad, Hadir Semua Acara) */}
        <div className="pt-2 border-t border-[#eee5d4] flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-[#52717b] mr-1">Jenis Kehadiran:</span>
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'resepsi_saja', label: 'Resepsi Saja' },
              { key: 'akad_saja', label: 'Akad Saja' },
              { key: 'adat_saja', label: 'Adat Saja' },
              { key: 'resepsi_adat', label: 'Resepsi & Adat' },
              { key: 'resepsi_akad', label: 'Resepsi & Akad' },
              { key: 'semuanya', label: 'Hadir Semua Acara' },
            ] as { key: EventFilterType; label: string }[]
          ).map((item) => {
            const isActive = eventFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setEventFilter(item.key);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                  isActive
                    ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-xs'
                    : 'bg-[#faf6ee] text-[#52717b] border-[#ded4be] hover:border-[#0f3b47] hover:text-[#0e2c34]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Daftar Ringkas (Tabel / Card) */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : paginatedRsvps.length === 0 ? (
        <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-12 text-center space-y-3 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
          <div className="w-12 h-12 rounded-full bg-[#f0ebd9] border border-[#ded4be] flex items-center justify-center mx-auto text-[#0f3b47]">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#0e2c34]">Tidak ada data tamu ditemukan</h2>
          <p className="text-xs text-[#52717b] max-w-sm mx-auto">
            {searchQuery || primaryStatusFilter !== 'all' || eventFilter !== 'all'
              ? 'Coba ubah kata kunci pencarian atau reset filter status.'
              : 'Belum ada tamu yang mengisi konfirmasi kehadiran.'}
          </p>
          {(searchQuery || primaryStatusFilter !== 'all' || eventFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPrimaryStatusFilter('all');
                setEventFilter('all');
                setPage(1);
              }}
              className="text-xs text-[#0f3b47] hover:underline font-bold pt-2 inline-block"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-[#6d8a93] italic px-1">
            💡 Tips: Klik pada baris atau kartu tamu untuk melihat ucapan lengkap dan detail lainnya.
          </p>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#fffdfa] border border-[#e5dcce] rounded-2xl overflow-hidden shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5eedf] text-[#345761] font-bold border-b border-[#e5dcce]">
                <tr>
                  <th className="py-3.5 px-4">Nama Tamu</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Tamu</th>
                  <th className="py-3.5 px-4">Status Kehadiran</th>
                  <th className="py-3.5 px-4">Ucapan & Doa</th>
                  <th className="py-3.5 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d4]">
                {paginatedRsvps.map((item) => {
                  const { badge, eventDetail } = getDetailedAttendanceInfo(item.attendance, item.message);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedGuest(item)}
                      className="hover:bg-[#f5eedf]/60 cursor-pointer transition select-none"
                      title="Klik untuk membuka detail tamu"
                    >
                      {/* 1. Nama */}
                      <td className="py-3.5 px-4 font-bold text-[#0e2c34] max-w-[190px] truncate">
                        {item.name}
                      </td>

                      {/* 2. Jumlah Tamu */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0e2c34] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#ded4be]">
                          <Users className="w-3 h-3 text-[#0f3b47]" />
                          <span>{item.guests}</span>
                        </span>
                      </td>

                      {/* 3. Satu Badge Status dengan Ikon + Warna + Keterangan Acara Kecil */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.colorClass}`}
                          >
                            {badge.group === 'hadir' && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                            {badge.group === 'tidak_hadir' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            {badge.group === 'belum_pasti' && <HelpCircle className="w-3.5 h-3.5 text-amber-600" />}
                            <span>{badge.label}</span>
                          </span>

                          {eventDetail && (
                            <span className="text-[10px] text-[#52717b] font-medium pl-1">
                              Acara: {eventDetail}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Ucapan Cuplikan Singkat */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#2b4c56] italic">
                        {item.message ? `"${item.message}"` : <span className="text-[#96adb5] not-italic">-</span>}
                      </td>

                      {/* 5. Waktu */}
                      <td className="py-3.5 px-4 text-right text-[#698892] whitespace-nowrap font-mono text-[11px]">
                        {formatDateTimeIndonesian(item.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="md:hidden space-y-3">
            {paginatedRsvps.map((item) => {
              const { badge, eventDetail } = getDetailedAttendanceInfo(item.attendance, item.message);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedGuest(item)}
                  className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 space-y-2.5 shadow-xs transition-all duration-200 hover:border-[#cdbe9f] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="font-bold text-[#0e2c34] text-sm block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badge.colorClass}`}
                        >
                          {badge.group === 'hadir' && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                          {badge.group === 'tidak_hadir' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {badge.group === 'belum_pasti' && <HelpCircle className="w-3 h-3 text-amber-600" />}
                          <span>{badge.label}</span>
                        </span>
                        {eventDetail && (
                          <span className="text-[10px] text-[#52717b] font-medium">
                            ({eventDetail})
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#0e2c34] bg-[#f0ebd9] px-2.5 py-1 rounded-full border border-[#ded4be] shrink-0">
                      <Users className="w-3 h-3 text-[#0f3b47]" />
                      <span>{item.guests} tamu</span>
                    </span>
                  </div>

                  {item.message && (
                    <p className="text-xs text-[#2b4c56] italic line-clamp-2 bg-[#faf6ee] p-2 rounded-xl border border-[#ded4be]">
                      "{item.message}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-[#698892] pt-1">
                    <span>{formatDateTimeIndonesian(item.created_at)}</span>
                    <span className="font-semibold text-[#0f3b47]">Sentuh untuk detail →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#52717b]">
            <div>
              Menampilkan <span className="font-bold text-[#0e2c34]">{startItem}</span> -{' '}
              <span className="font-bold text-[#0e2c34]">{endItem}</span> dari{' '}
              <span className="font-bold text-[#0e2c34]">{totalCount}</span> tamu
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdfa] border border-[#ded4be] text-[#2c4e57] hover:bg-[#f0ebd9] disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <span className="px-2 font-mono font-bold text-[#0e2c34]">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#fffdfa] border border-[#ded4be] text-[#2c4e57] hover:bg-[#f0ebd9] disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Panel Detail: Side Drawer (Desktop) & Bottom Sheet (Mobile) */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedGuest(null)}
          />

          {/* Panel Container (Slide in drawer desktop, Bottom sheet mobile) */}
          <div className="relative z-50 w-full sm:max-w-md bg-[#fffdfa] border-t sm:border-t-0 sm:border-l border-[#ded4be] rounded-t-3xl sm:rounded-none shadow-2xl p-6 flex flex-col justify-between max-h-[88vh] sm:max-h-full overflow-y-auto animate-in fade-in duration-200">
            {/* Top Drag Pill on Mobile */}
            <div className="sm:hidden w-12 h-1.5 bg-[#ded4be] rounded-full mx-auto mb-4" />

            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#eee5d4] pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#75949e] block">
                    Detail Konfirmasi Tamu
                  </span>
                  <h3 className="text-xl font-bold text-[#0e2c34] mt-0.5">
                    {selectedGuest.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuest(null)}
                  className="p-1.5 rounded-xl text-[#75949e] hover:text-[#0e2c34] hover:bg-[#f0ebd9]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge & Acara */}
              {(() => {
                const { badge, eventDetail } = getDetailedAttendanceInfo(
                  selectedGuest.attendance,
                  selectedGuest.message
                );
                return (
                  <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#52717b]">Status Kehadiran:</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.colorClass}`}
                      >
                        {badge.group === 'hadir' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                        {badge.group === 'tidak_hadir' && <XCircle className="w-4 h-4 text-rose-600" />}
                        {badge.group === 'belum_pasti' && <HelpCircle className="w-4 h-4 text-amber-600" />}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {eventDetail && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#eee5d4]">
                        <span className="text-[#52717b] font-medium">Rangkaian Acara:</span>
                        <span className="font-bold text-[#0e2c34]">{eventDetail}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#eee5d4]">
                      <span className="text-[#52717b] font-medium">Jumlah Tamu Hadir:</span>
                      <span className="font-bold text-[#0e2c34]">{selectedGuest.guests} Orang</span>
                    </div>
                  </div>
                );
              })()}

              {/* Info Tambahan: Parameter & Waktu */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf6ee] border border-[#ded4be]">
                  <div className="flex items-center gap-2 text-[#52717b]">
                    <Clock className="w-3.5 h-3.5 text-[#0f3b47]" />
                    <span>Waktu Konfirmasi:</span>
                  </div>
                  <span className="font-mono text-[#0e2c34] font-medium">
                    {formatDateTimeIndonesian(selectedGuest.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf6ee] border border-[#ded4be]">
                  <div className="flex items-center gap-2 text-[#52717b]">
                    <LinkIcon className="w-3.5 h-3.5 text-[#0f3b47]" />
                    <span>Tautan Parameter:</span>
                  </div>
                  <span className="font-mono text-[#0e2c34] font-medium">
                    {selectedGuest.guest_param || '(tanpa parameter)'}
                  </span>
                </div>
              </div>

              {/* Ucapan Lengkap */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#0e2c34] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#0f3b47]" />
                  <span>Ucapan & Doa Restu Lengkap:</span>
                </span>
                <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] text-sm text-[#0e2c34] leading-relaxed whitespace-pre-wrap italic">
                  {selectedGuest.message ? `"${selectedGuest.message}"` : <span className="text-[#88a4ad] not-italic">(Tamu tidak meninggalkan pesan tertulis)</span>}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Tombol Hapus */}
            <div className="pt-6 border-t border-[#eee5d4] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(selectedGuest)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Konfirmasi Ini</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0e2c34] bg-[#f0ebd9] hover:bg-[#e6deca] transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0e2c34]">Konfirmasi Penghapusan</h3>
                <p className="text-xs text-[#52717b]">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-[#2b4c56] leading-relaxed">
              Apakah Anda yakin ingin menghapus data konfirmasi kehadiran dari{' '}
              <strong className="text-[#0e2c34]">"{itemToDelete.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52717b] hover:text-[#0e2c34] bg-[#f0ebd9] hover:bg-[#e7e0cc] transition"
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
    </div>
  );
};
