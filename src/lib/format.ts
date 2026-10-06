import type { AttendanceType } from '../types/database';

export function formatDateIndonesian(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTimeIndonesian(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTimeOnly(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * Calculates countdown string from event date.
 * If today -> "Hari H"
 * If future -> "H-N"
 * If past -> "H+N"
 */
export function calculateCountdown(eventDateString: string | null | undefined): {
  label: string;
  days: number;
  isPast: boolean;
  isToday: boolean;
} {
  if (!eventDateString) {
    return { label: '-', days: 0, isPast: false, isToday: false };
  }

  try {
    const event = new Date(eventDateString);
    if (isNaN(event.getTime())) {
      return { label: '-', days: 0, isPast: false, isToday: false };
    }

    const today = new Date();
    // Normalize to midnight UTC/Local
    const eventMidnight = new Date(event.getFullYear(), event.getMonth(), event.getDate()).getTime();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const diffMs = eventMidnight - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: 'Hari H', days: 0, isPast: false, isToday: true };
    } else if (diffDays > 0) {
      return { label: `H-${diffDays}`, days: diffDays, isPast: false, isToday: false };
    } else {
      return { label: `H+${Math.abs(diffDays)}`, days: Math.abs(diffDays), isPast: true, isToday: false };
    }
  } catch {
    return { label: '-', days: 0, isPast: false, isToday: false };
  }
}

export function getAttendanceBadge(attendance: AttendanceType | string): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  switch (attendance) {
    case 'hadir':
      return {
        label: 'Hadir',
        colorClass: 'text-emerald-800 border-emerald-300 bg-emerald-100/80',
        bgClass: 'bg-emerald-600',
      };
    case 'tidak_hadir':
      return {
        label: 'Tidak Hadir',
        colorClass: 'text-rose-800 border-rose-300 bg-rose-100/80',
        bgClass: 'bg-rose-600',
      };
    case 'belum_pasti':
    default:
      return {
        label: 'Belum Pasti',
        colorClass: 'text-amber-800 border-amber-300 bg-amber-100/80',
        bgClass: 'bg-amber-600',
      };
  }
}

export function translateAuthError(errorMsg: string): string {
  const lower = errorMsg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Alamat email belum dikonfirmasi.';
  }
  if (lower.includes('invalid email') || lower.includes('valid email')) {
    return 'Format alamat email tidak valid.';
  }
  if (lower.includes('password') && lower.includes('short')) {
    return 'Kata sandi minimal 6 karakter.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Harap tunggu beberapa saat.';
  }
  if (lower.includes('invalid path specified in request url') || lower.includes('invalid path')) {
    return 'URL Supabase tidak valid (ada path tambahan). Pastikan format URL adalah "https://[proyek-id].supabase.co" tanpa "/dashboard" atau subpath lain. Klik tombol "Konfigurasi Supabase" di bawah untuk memperbaiki.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
    return 'Gagal terhubung ke Supabase. Periksa koneksi internet atau periksa kembali konfigurasi Supabase URL.';
  }
  return errorMsg;
}
