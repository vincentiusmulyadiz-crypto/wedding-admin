import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import {
  formatDateIndonesian,
  formatDateTimeIndonesian,
  formatTimeOnly,
  calculateCountdown,
  getDetailedAttendanceInfo,
} from '../lib/format';
import { StatCardsSkeleton } from './Skeleton';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  RotateCw,
  Calendar,
  MessageSquare,
  Wifi,
} from 'lucide-react';
import { DEMO_ROMEO_JULIET_RSVPS } from '../data/demoData';

interface OverviewTabProps {
  customer: Customer;
  onSelectTab?: (tab: 'overview' | 'guests' | 'links' | 'customers') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ customer, onSelectTab }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRsvp: 0,
    hadirCount: 0,
    tidakHadirCount: 0,
    belumPastiCount: 0,
    totalGuestsAttending: 0,
  });
  const [latestWishes, setLatestWishes] = useState<Rsvp[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [realtimeActive, setRealtimeActive] = useState<boolean>(false);
  const [hasNewInsert, setHasNewInsert] = useState<boolean>(false);
  const pollTimerRef = useRef<number | null>(null);

  const fetchOverviewData = useCallback(async (isSilent = false) => {
    if (!customer?.id) return;

    if (!isSilent) setRefreshing(true);
    try {
      const supabase = getSupabase();

      const { data: rsvps, error } = await supabase
        .from('rsvps')
        .select('id, attendance, guests, message, name, guest_param, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Gagal mengambil data konfirmasi:', error.message);
        return;
      }

      let rows: Rsvp[] = (rsvps as Rsvp[]) || [];

      // Fallback untuk demo customer jika belum ada baris di DB
      if (rows.length === 0 && (customer.id.includes('demo') || customer.slug === 'romeo-juliet')) {
        rows = DEMO_ROMEO_JULIET_RSVPS;
      }

      let hadir = 0;
      let tidakHadir = 0;
      let belumPasti = 0;
      let totalPaxHadir = 0;

      let countAttendAll = 0;
      let countResepsi = 0;
      let countAdat = 0;
      let countAkad = 0;
      let countResepsiAdat = 0;
      let countResepsiAkad = 0;
      let countHadirUmum = 0;

      rows.forEach((r) => {
        const { badge, eventCategory } = getDetailedAttendanceInfo(r.attendance, r.message);
        const guestCount = typeof r.guests === 'number' ? r.guests : parseInt(String(r.guests || 1), 10) || 1;

        if (badge.group === 'hadir') {
          hadir++;
          totalPaxHadir += guestCount;

          if (eventCategory === 'semuanya') {
            countAttendAll++;
          } else if (eventCategory === 'resepsi_saja') {
            countResepsi++;
          } else if (eventCategory === 'akad_saja') {
            countAkad++;
          } else if (eventCategory === 'adat_saja') {
            countAdat++;
          } else if (eventCategory === 'resepsi_adat') {
            countResepsiAdat++;
          } else if (eventCategory === 'resepsi_akad') {
            countResepsiAkad++;
          } else {
            countHadirUmum++;
          }
        } else if (badge.group === 'tidak_hadir') {
          tidakHadir++;
        } else {
          belumPasti++;
        }
      });

      setStats({
        totalRsvp: rows.length,
        hadirCount: hadir,
        tidakHadirCount: tidakHadir,
        belumPastiCount: belumPasti,
        totalGuestsAttending: totalPaxHadir,
      });

      // Ambil ucapan terbaru
      const wishesWithText = rows.filter((r) => r.message && r.message.trim().length > 0).slice(0, 3);
      if (wishesWithText.length < 3) {
        const remaining = rows.filter((r) => !wishesWithText.some((w) => w.id === r.id)).slice(0, 3 - wishesWithText.length);
        setLatestWishes([...wishesWithText, ...remaining]);
      } else {
        setLatestWishes(wishesWithText);
      }

      setLastUpdated(formatTimeOnly(new Date()));
    } catch (err) {
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchOverviewData();

    const supabase = getSupabase();
    const channelName = `realtime-rsvps-${customer.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rsvps',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          setHasNewInsert(true);
          fetchOverviewData(true);
          setTimeout(() => setHasNewInsert(false), 4000);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeActive(false);
        }
      });

    pollTimerRef.current = window.setInterval(() => {
      fetchOverviewData(true);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [customer?.id, fetchOverviewData]);

  const countdown = calculateCountdown(customer.event_date);
  const total = stats.totalRsvp;
  const hadirPct = total > 0 ? (stats.hadirCount / total) * 100 : 0;
  const tidakHadirPct = total > 0 ? (stats.tidakHadirCount / total) * 100 : 0;
  const belumPastiPct = total > 0 ? (stats.belumPastiCount / total) * 100 : 0;

  // Single-line countdown header text
  const countdownText =
    countdown.label === 'Hari H'
      ? '🎉 Hari H Pernikahan Hari Ini'
      : countdown.isPast
      ? `Acara telah selesai (${countdown.label})`
      : `${countdown.label} (${countdown.days} hari lagi)`;

  return (
    <div className="space-y-6">
      {/* 1. Header dengan Hitung Mundur Satu Baris */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0e2c34]">
              {customer.couple_names}
            </h1>
            {/* Single line date and countdown badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#52717b]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#0d6274]" />
                {formatDateIndonesian(customer.event_date)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#0d6274] bg-[#edf6f8] px-2.5 py-0.5 rounded-full border border-[#c4e3ea]">
                {countdownText}
              </span>
            </div>
          </div>

          {/* Refresh button & live sync status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[#456470]">
              {realtimeActive ? (
                <span className="inline-flex items-center gap-1.5 text-teal-800 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>Realtime aktif</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#456470] bg-[#f0ebd9] px-2.5 py-1 rounded-full border border-[#ded4be]">
                  <Wifi className="w-3 h-3 text-[#456470]" />
                  <span>Update otomatis (60d)</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchOverviewData()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0E435A] hover:bg-[#154e66] active:scale-[0.98] text-[#FAF6EC] text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {hasNewInsert && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-teal-900 text-xs font-semibold animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Ada konfirmasi kehadiran baru yang baru saja masuk!</span>
            </div>
            <button
              type="button"
              onClick={() => setHasNewInsert(false)}
              className="text-teal-700 hover:text-teal-900 text-xs font-bold p-1"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* 2. Hero Big Number Focus & 3 Kartu Pendukung */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Satu Angka Besar Sebagai Fokus: "X tamu akan hadir" */}
          <div className="bg-gradient-to-br from-[#0E435A] via-[#124e68] to-[#0A3345] text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md">
            <div className="relative z-10 space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-[#b5e0eb] block">
                Total Perkiraan Kehadiran Fisik
              </span>
              <div className="flex flex-wrap items-baseline gap-3 pt-1">
                <span className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white font-['Lora',serif]">
                  {stats.totalGuestsAttending}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-[#d2eff5]">
                  tamu akan hadir
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#b8e1ec] pt-1 leading-relaxed">
                Dihitung dari <strong className="text-white font-bold">{stats.hadirCount}</strong> konfirmasi kehadiran yang menyatakan hadir (termasuk pasangan / keluarga yang dibawa).
              </p>
            </div>
          </div>

          {/* Hanya 3 Kartu Pendukung: Akan Hadir, Tidak Hadir, Belum Balas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* 1. Akan Hadir */}
            <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-5 shadow-xs space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
              <div className="flex items-center justify-between text-teal-800">
                <span className="text-xs font-bold uppercase tracking-wider">Akan Hadir</span>
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-teal-900">
                  {stats.hadirCount}
                </span>
                <span className="text-xs text-[#52717b] font-medium">konfirmasi</span>
              </div>
              <p className="text-[11px] text-[#5e7d87]">
                {total > 0 ? `${hadirPct.toFixed(0)}% dari seluruh respons` : '0%'}
              </p>
            </div>

            {/* 2. Tidak Hadir */}
            <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-5 shadow-xs space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-xs font-bold uppercase tracking-wider">Tidak Hadir</span>
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-900">
                  {stats.tidakHadirCount}
                </span>
                <span className="text-xs text-[#52717b] font-medium">konfirmasi</span>
              </div>
              <p className="text-[11px] text-[#5e7d87]">
                {total > 0 ? `${tidakHadirPct.toFixed(0)}% dari seluruh respons` : '0%'}
              </p>
            </div>

            {/* 3. Belum Balas / Ragu */}
            <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-5 shadow-xs space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold uppercase tracking-wider">Belum Balas / Ragu</span>
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-900">
                  {stats.belumPastiCount}
                </span>
                <span className="text-xs text-[#52717b] font-medium">konfirmasi</span>
              </div>
              <p className="text-[11px] text-[#5e7d87]">
                {total > 0 ? `${belumPastiPct.toFixed(0)}% dari seluruh respons` : '0%'}
              </p>
            </div>
          </div>

          {/* Keterangan kecil total konfirmasi RSVP */}
          <div className="flex items-center justify-between px-2 text-xs text-[#5e7d87]">
            <span>
              Total konfirmasi masuk:{' '}
              <strong className="text-[#0e2c34] font-bold">{stats.totalRsvp}</strong> respons
            </span>
            {lastUpdated && <span>Pembaruan terakhir: {lastUpdated}</span>}
          </div>
        </div>
      )}

      {/* 4. Tampilkan 3 Ucapan Terbaru + Tombol "Lihat semua" */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#0f3b47]" />
            <div>
              <h2 className="text-base font-bold text-[#0e2c34]">
                3 Ucapan & Doa Restu Terbaru
              </h2>
              <p className="text-xs text-[#5e7d87]">
                Pesan hangat yang baru saja dikirimkan para tamu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab?.('guests')}
            className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#0E435A]/10 hover:bg-[#0E435A]/15 text-xs font-bold text-[#0E435A] transition active:scale-[0.98] cursor-pointer"
          >
            <span>Buka Semua Ucapan</span>
          </button>
        </div>

        {latestWishes.length === 0 ? (
          <div className="py-10 text-center text-[#78939c] text-xs">
            Belum ada ucapan tertulis dari para tamu.
          </div>
        ) : (
          <div className="space-y-3">
            {latestWishes.slice(0, 3).map((item) => {
              const { badge, eventDetail } = getDetailedAttendanceInfo(item.attendance, item.message);
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#faf6ee] border border-[#e5dcce] space-y-2 transition-all duration-200 hover:shadow-sm hover:border-[#cdbe9f] hover:bg-[#f6f0e2]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-xs sm:text-sm text-[#0e2c34] truncate">
                        {item.name}
                      </span>
                      {item.guests > 1 && (
                        <span className="text-[10px] text-[#0f3b47] bg-[#f0ebd9] px-2 py-0.5 rounded-full border border-[#ded4be] font-semibold shrink-0">
                          {item.guests} tamu
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badge.colorClass}`}
                      >
                        {badge.group === 'hadir' && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                        {badge.group === 'tidak_hadir' && <XCircle className="w-3 h-3 text-rose-600" />}
                        {badge.group === 'belum_pasti' && <HelpCircle className="w-3 h-3 text-amber-600" />}
                        <span>{badge.label}</span>
                        {eventDetail && <span className="opacity-75 font-normal">({eventDetail})</span>}
                      </span>
                      <span className="text-[10px] text-[#698892] hidden sm:inline">
                        {formatDateTimeIndonesian(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#1e424c] leading-relaxed italic">
                    {item.message ? `"${item.message}"` : <span className="text-[#89a4ad] not-italic">(Tidak ada pesan tertulis)</span>}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button: Lihat Semua */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => onSelectTab?.('guests')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0E435A]/10 hover:bg-[#0E435A]/15 border border-[#0E435A]/20 text-xs font-bold text-[#0E435A] active:scale-[0.98] transition shadow-xs cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#0E435A]" />
            <span>Buka Seluruh Daftar Tamu & Ucapan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
