export type AttendanceType =
  | 'hadir'
  | 'hadir_semua'
  | 'hadir_keduanya'
  | 'hadir_resepsi'
  | 'hadir_adat'
  | 'hadir_pemberkatan'
  | 'tidak_hadir'
  | 'belum_pasti';

export interface Customer {
  id: string;
  slug: string;
  couple_names: string;
  event_date: string; // ISO date string (YYYY-MM-DD or timestamptz)
  owner_id: string;
}

export interface Admin {
  user_id: string;
}

export interface Rsvp {
  id: string | number;
  customer_id: string;
  name: string;
  attendance: AttendanceType;
  guests: number;
  message: string | null;
  guest_param: string | null;
  created_at: string;
}

export interface DatabaseStats {
  totalRsvp: number;
  hadirCount: number;
  tidakHadirCount: number;
  belumPastiCount: number;
  totalGuestsAttending: number;
}
