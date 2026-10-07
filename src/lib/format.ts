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
    case 'hadir_semua':
    case 'hadir_keduanya':
      return {
        label: attendance === 'hadir_semua' ? 'Hadir (Semua Acara)' : attendance === 'hadir_keduanya' ? 'Hadir (Keduanya)' : 'Hadir',
        colorClass: 'text-emerald-800 border-emerald-300 bg-emerald-100/80',
        bgClass: 'bg-emerald-600',
      };
    case 'hadir_resepsi':
      return {
        label: 'Hadir (Resepsi Saja)',
        colorClass: 'text-teal-800 border-teal-300 bg-teal-100/80',
        bgClass: 'bg-teal-600',
      };
    case 'hadir_adat':
      return {
        label: 'Hadir (Adat Saja)',
        colorClass: 'text-sky-800 border-sky-300 bg-sky-100/80',
        bgClass: 'bg-sky-600',
      };
    case 'hadir_pemberkatan':
      return {
        label: 'Hadir (Pemberkatan Saja)',
        colorClass: 'text-indigo-800 border-indigo-300 bg-indigo-100/80',
        bgClass: 'bg-indigo-600',
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

/**
 * Normalizes phone numbers to international digits format (e.g. 6281234567890 for wa.me)
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Pretty formats phone number for human-readable display in tables/cards
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '-';
  const raw = phone.trim();
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('62')) {
    const rest = digits.slice(2);
    if (rest.length > 7) {
      return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
    }
    return `+62 ${rest}`;
  }
  if (digits.startsWith('0')) {
    if (digits.length > 8) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
  }
  return raw;
}
