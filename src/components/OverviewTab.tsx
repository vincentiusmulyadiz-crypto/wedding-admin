import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Customer, Rsvp, AttendanceType } from '../types/database';
import { getSupabase } from '../lib/supabase';
import {
  formatDateIndonesian,
  formatDateTimeIndonesian,
  formatTimeOnly,
  calculateCountdown,
  getAttendanceBadge,
} from '../lib/format';
import { StatCardsSkeleton } from './Skeleton';
import {
  Users,
  UserCheck,
  UserX,
  HelpCircle,
  UsersRound,
  RotateCw,
  Calendar,
  MessageSquare,
  Sparkles,
  Wifi,
  Radio,
} from 'lucide-react';

interface OverviewTabProps {
  customer: Customer;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ customer }) => {
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
        console.error('Gagal mengambil data RSVP:', error.message);
        return;
      }

      const rows: Rsvp[] = (rsvps as Rsvp[]) || [];

      let hadir = 0;
      let tidakHadir = 0;
      let belumPasti = 0;
      let totalPaxHadir = 0;

      rows.forEach((r) => {
        const att = (r.attendance || '').toLowerCase() as AttendanceType;
        const guestCount = typeof r.guests === 'number' ? r.guests : parseInt(String(r.guests || 1), 10) || 1;

        if (att === 'hadir' || att === 'hadir_keduanya' || att === 'hadir_resepsi') {
          hadir++;
          totalPaxHadir += guestCount;
        } else if (att === 'tidak_hadir') {
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

      const wishes = rows.filter((r) => r.message && r.message.trim().length > 0).slice(0, 5);
      if (wishes.length < 5) {
        const remaining = rows.filter((r) => !wishes.some((w) => w.id === r.id)).slice(0, 5 - wishes.length);
        setLatestWishes([...wishes, ...remaining]);
      } else {
        setLatestWishes(wishes);
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

  const r = 40;
  const circumference = 2 * Math.PI * r;
  const hadirOffset = circumference * (1 - hadirPct / 100);

  return (
    <div className="space-y-6">
      {/* Top Banner: Couple info & Countdown (Dominant Cream) */}
      <div className="bg-gradient-to-r from-[#f4ede0] via-[#f7f2e8] to-[#f4ede0] border border-[#ded3bc] rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ebe2ce] border border-[#dbceb5] text-[#0f3b47] text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#0f3b47]" />
              <span>{formatDateIndonesian(customer.event_date)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f3b47]">
              {customer.couple_names}
            </h1>
            <p className="text-xs text-[#5f7e88] font-mono">
              Slug tautan: <span className="text-[#0f3b47] font-semibold">/{customer.slug}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#fffdfa] border border-[#ded3bc] rounded-2xl px-6 py-3.5 text-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#63828d] block">
                Hitung Mundur
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0f3b47]">
                {countdown.label}
              </span>
            </div>
          </div>
        </div>

        {/* Live Status and Refresh Bar */}
        <div className="mt-5 pt-4 border-t border-[#ded3bc] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-[#587882]">
            <div className="flex items-center gap-1.5">
              {realtimeActive ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span className="text-emerald-700 font-bold">Langsung (Realtime)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#86a2ab]" />
                  <span>Polling berkala (60d)</span>
                </>
              )}
            </div>

            {hasNewInsert && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                <Sparkles className="w-3 h-3" /> RSVP Baru Masuk!
              </span>
            )}

            <span>• Terakhir diperbarui: {lastUpdated || '-'}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchOverviewData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f3b47] hover:bg-[#154e5e] text-[#fffdf8] text-xs font-bold active:scale-95 transition disabled:opacity-50 shadow-xs"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Stat Cards (Cream & White Theme) */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {/* Total RSVP */}
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#5f7e88]">
              <span className="text-xs font-bold">Total RSVP</span>
              <Users className="w-4 h-4 text-[#0f3b47]" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0f3b47] tracking-tight">
              {stats.totalRsvp}
            </p>
            <p className="text-[11px] text-[#718f99]">Respons masuk</p>
          </div>

          {/* Hadir */}
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-xs font-bold">Hadir</span>
              <UserCheck className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
              {stats.hadirCount}
            </p>
            <p className="text-[11px] text-[#718f99]">
              {total > 0 ? `${hadirPct.toFixed(1)}% dari respons` : '0%'}
            </p>
          </div>

          {/* Tidak Hadir */}
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-xs font-bold">Tidak Hadir</span>
              <UserX className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 tracking-tight">
              {stats.tidakHadirCount}
            </p>
            <p className="text-[11px] text-[#718f99]">
              {total > 0 ? `${tidakHadirPct.toFixed(1)}% dari respons` : '0%'}
            </p>
          </div>

          {/* Belum Pasti */}
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-xs font-bold">Belum Pasti</span>
              <HelpCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 tracking-tight">
              {stats.belumPastiCount}
            </p>
            <p className="text-[11px] text-[#718f99]">
              {total > 0 ? `${belumPastiPct.toFixed(1)}% dari respons` : '0%'}
            </p>
          </div>

          {/* Total Tamu Hadir */}
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#0f3b47] to-[#154d5b] text-[#fffdf8] border border-[#0b2b34] rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#c4e3ea]">
              <span className="text-xs font-bold">Total Tamu Hadir</span>
              <UsersRound className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {stats.totalGuestsAttending}
            </p>
            <p className="text-[11px] text-[#b0dbe4]">Jumlah pax terkonfirmasi</p>
          </div>
        </div>
      )}

      {/* Middle row: Donut Chart & 5 Latest Wishes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Donut Chart Card */}
        <div className="lg:col-span-5 bg-[#fffdf9] border border-[#e3dac8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-[#eee5d4] pb-3">
            <h2 className="text-base font-bold text-[#0f3b47]">Proporsi Kehadiran</h2>
            <p className="text-xs text-[#62818c]">Persentase konfirmasi dari seluruh tamu yang merespons</p>
          </div>

          {total === 0 ? (
            <div className="py-12 text-center text-[#7a959e] text-xs">
              Belum ada data konfirmasi kehadiran untuk dihitung.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              {/* Donut SVG */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    stroke="#eee5d4"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {/* Hadir Segment */}
                  {hadirPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      stroke="#059669"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={hadirOffset}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Tidak Hadir Segment */}
                  {tidakHadirPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      stroke="#e11d48"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={`${(tidakHadirPct / 100) * circumference} ${circumference}`}
                      strokeDashoffset={-((hadirPct / 100) * circumference)}
                    />
                  )}
                  {/* Belum Pasti Segment */}
                  {belumPastiPct > 0 && (
                    <circle
                      cx="50"
                      cy="50"
                      r={r}
                      stroke="#d97706"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={`${(belumPastiPct / 100) * circumference} ${circumference}`}
                      strokeDashoffset={-(((hadirPct + tidakHadirPct) / 100) * circumference)}
                    />
                  )}
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-[#0f3b47]">{total}</span>
                  <span className="text-[10px] text-[#5e7e88] font-bold uppercase tracking-wider">RSVP</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 w-full sm:w-auto text-xs">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-[#193a44] font-medium">Hadir</span>
                  </div>
                  <div className="text-right font-bold text-[#0f3b47]">
                    <span>{stats.hadirCount}</span>
                    <span className="text-[#698892] text-[11px] ml-1 font-normal">({hadirPct.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                    <span className="text-[#193a44] font-medium">Tidak Hadir</span>
                  </div>
                  <div className="text-right font-bold text-[#0f3b47]">
                    <span>{stats.tidakHadirCount}</span>
                    <span className="text-[#698892] text-[11px] ml-1 font-normal">({tidakHadirPct.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-600 shrink-0" />
                    <span className="text-[#193a44] font-medium">Belum Pasti</span>
                  </div>
                  <div className="text-right font-bold text-[#0f3b47]">
                    <span>{stats.belumPastiCount}</span>
                    <span className="text-[#698892] text-[11px] ml-1 font-normal">({belumPastiPct.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-[#faf6ee] rounded-xl border border-[#e5dcce] text-[11px] text-[#5b7a84]">
            Total kehadiran fisik diestimasikan sebanyak <strong className="text-[#0f3b47]">{stats.totalGuestsAttending} orang</strong> dari {stats.hadirCount} konfirmasi hadir.
          </div>
        </div>

        {/* Latest 5 Wishes Card */}
        <div className="lg:col-span-7 bg-[#fffdf9] border border-[#e3dac8] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0f3b47] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0f3b47]" />
                <span>5 Ucapan & Doa Terbaru</span>
              </h2>
              <p className="text-xs text-[#62818c]">Pesan dan doa restu teranyar dari para tamu</p>
            </div>
          </div>

          {latestWishes.length === 0 ? (
            <div className="py-12 text-center text-[#78939c] text-xs">
              Belum ada ucapan dari tamu yang tercatat.
            </div>
          ) : (
            <div className="space-y-3">
              {latestWishes.map((item) => {
                const badge = getAttendanceBadge(item.attendance);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#faf6ee] border border-[#e5dcce] hover:border-[#cbbea7] transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-xs text-[#0f3b47] truncate">
                          {item.name}
                        </span>
                        {item.guests > 1 && (
                          <span className="text-[10px] text-[#4d6d77] bg-[#f0ebd9] px-1.5 py-0.5 rounded border border-[#d8cdb8] font-medium">
                            {item.guests} tamu
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-[#698892]">
                          {formatDateTimeIndonesian(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#1e424c] leading-relaxed italic line-clamp-3">
                      {item.message ? `"${item.message}"` : <span className="text-[#78939c] not-italic">(Tidak ada pesan ucapan tertulis)</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
