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

export type EventCategory =
  | 'resepsi_saja'
  | 'akad_saja'
  | 'adat_saja'
  | 'resepsi_adat'
  | 'resepsi_akad'
  | 'semuanya'
  | 'umum';

export function classifyEventAttendance(
  attendance: AttendanceType | string,
  message?: string | null
): {
  category: EventCategory;
  label: string;
} {
  const att = (attendance || '').toLowerCase().trim();
  const msg = (message || '').toLowerCase();

  // Extract event tag from message if present e.g. [Hadir: Reservation] or [Hadir: Adat, Reservation]
  const tagMatch = msg.match(/\[hadir:\s*([^\]]+)\]/i);
  const tagContent = tagMatch ? tagMatch[1].toLowerCase() : '';
  const combined = `${att} ${tagContent} ${msg}`;

  // Check event presence indicators
  const hasAttendAll =
    att === 'hadir_semua' ||
    tagContent.includes('attend all') ||
    tagContent.includes('semua acara') ||
    tagContent.includes('all') ||
    msg.includes('attend all') ||
    msg.includes('semua acara');

  const hasReservationOrResepsi =
    att === 'hadir_resepsi' ||
    tagContent.includes('resepsi') ||
    tagContent.includes('reservation') ||
    combined.includes('resepsi') ||
    combined.includes('reservation');

  const hasAkadOrMatrimony =
    att === 'hadir_pemberkatan' ||
    tagContent.includes('pemberkatan') ||
    tagContent.includes('akad') ||
    tagContent.includes('matrimony') ||
    combined.includes('pemberkatan') ||
    combined.includes('akad') ||
    combined.includes('matrimony');

  const hasAdat =
    att === 'hadir_adat' ||
    tagContent.includes('adat') ||
    combined.includes('adat');

  // 1. Semuanya / Attend All
  if (hasAttendAll || (hasReservationOrResepsi && hasAkadOrMatrimony && hasAdat)) {
    return { category: 'semuanya', label: 'Semua Acara' };
  }

  // 2. Resepsi dan Adat
  if (hasReservationOrResepsi && hasAdat && !hasAkadOrMatrimony) {
    return { category: 'resepsi_adat', label: 'Resepsi & Adat' };
  }

  // 3. Resepsi dan Akad / Pemberkatan (termasuk hadir_keduanya)
  if (
    att === 'hadir_keduanya' ||
    tagContent.includes('keduanya') ||
    (hasReservationOrResepsi && hasAkadOrMatrimony && !hasAdat)
  ) {
    return { category: 'resepsi_akad', label: 'Resepsi & Akad' };
  }

  // 4. Resepsi Saja (termasuk Reservation Only / Hadir: Reservation)
  if (hasReservationOrResepsi && !hasAkadOrMatrimony && !hasAdat) {
    return { category: 'resepsi_saja', label: 'Resepsi Saja' };
  }

  // 5. Akad Saja / Pemberkatan Saja
  if (hasAkadOrMatrimony && !hasReservationOrResepsi && !hasAdat) {
    return { category: 'akad_saja', label: 'Akad Saja' };
  }

  // 6. Adat Saja
  if (hasAdat && !hasReservationOrResepsi && !hasAkadOrMatrimony) {
    return { category: 'adat_saja', label: 'Adat Saja' };
  }

  // Default fallback if hadir without specific ceremony tag
  if (att.startsWith('hadir') || att === 'attending') {
    return { category: 'umum', label: 'Hadir' };
  }

  return { category: 'umum', label: '' };
}

export function getAttendanceBadge(attendance: AttendanceType | string): {
  group: 'hadir' | 'tidak_hadir' | 'belum_pasti';
  label: string;
  colorClass: string;
  bgClass: string;
} {
  const att = (attendance || '').toLowerCase().trim();

  if (att.startsWith('hadir') || att === 'attending') {
    return {
      group: 'hadir',
      label: 'Akan Hadir',
      colorClass: 'text-emerald-900 border-emerald-300 bg-emerald-50',
      bgClass: 'bg-emerald-600',
    };
  }

  if (att === 'tidak_hadir' || att === 'not_attending') {
    return {
      group: 'tidak_hadir',
      label: 'Tidak Hadir',
      colorClass: 'text-rose-900 border-rose-300 bg-rose-50',
      bgClass: 'bg-rose-600',
    };
  }

  return {
    group: 'belum_pasti',
    label: 'Belum Pasti',
    colorClass: 'text-amber-900 border-amber-300 bg-amber-50',
    bgClass: 'bg-amber-600',
  };
}

export function getDetailedAttendanceInfo(
  attendance: AttendanceType | string,
  message?: string | null
): {
  badge: {
    group: 'hadir' | 'tidak_hadir' | 'belum_pasti';
    label: string;
    colorClass: string;
    bgClass: string;
  };
  eventCategory: EventCategory;
  eventDetail: string;
} {
  const badge = getAttendanceBadge(attendance);
  const { category, label } = classifyEventAttendance(attendance, message);

  return {
    badge,
    eventCategory: category,
    eventDetail: label,
  };
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
