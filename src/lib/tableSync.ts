import type { Customer } from '../types/database';
import { getSupabase } from './supabase';

export type GuestCategory = 'VVIP' | 'VIP' | 'Reguler';
export type TableShape = 'round' | 'rect' | 'square';

export interface WeddingTable {
  id: string;
  code: string; // e.g. 'A1', 'B1', 'C1'
  name: string; // e.g. 'A1' or 'A1 - Keluarga'
  shape: TableShape; // 'round' = A, 'rect' = B, 'square' = C
  capacity: number;
  category: GuestCategory;
  session: 'Semua Sesi' | 'Semua Acara' | 'Akad / Pemberkatan' | 'Resepsi';
  notes?: string;
}

export interface GuestExtendedMeta {
  category?: GuestCategory;
  group_name?: string;
  table_id?: string;
  seat_numbers?: string; // e.g. 'A1-01, A1-02'
  max_guests?: number;
  event_filter?: 'all' | 'akad' | 'reception';
}

export const RESERVED_CONFIG_CODE = '__JOYEVER_CONFIG_V1__';

export const CATEGORY_STYLES: Record<
  GuestCategory,
  { badge: string; dot: string; label: string }
> = {
  VVIP: {
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    label: 'VVIP',
  },
  VIP: {
    badge: 'bg-[#0E435A]/10 text-[#0E435A] border-[#0E435A]/30',
    dot: 'bg-[#0E435A]',
    label: 'VIP',
  },
  Reguler: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
    label: 'Reguler',
  },
};

/**
 * Generates seat code for a table, e.g.:
 * Table A1, seat 1 -> A1-01
 * Table B1, seat 2 -> B1-02
 * Table C1, seat 3 -> C1-03
 */
export function formatSeatCode(tableCode: string, seatIndex: number): string {
  const cleanCode = (tableCode || 'A1').trim();
  const seatNum = String(seatIndex).padStart(2, '0');
  return `${cleanCode}-${seatNum}`;
}

/**
 * Returns shape prefix:
 * 'round' -> 'A'
 * 'rect' -> 'B'
 * 'square' -> 'C'
 */
export function getShapePrefix(shape: TableShape): string {
  if (shape === 'round') return 'A';
  if (shape === 'rect') return 'B';
  return 'C';
}

export function getShapeLabel(shape: TableShape): string {
  if (shape === 'round') return 'Meja A';
  if (shape === 'rect') return 'Meja B';
  return 'Meja C';
}

export const getTableStorageKey = (cust: Customer): string =>
  `tables_v3_${cust.id || cust.slug || 'unknown'}`;

export const DEFAULT_DEMO_TABLES: WeddingTable[] = [
  {
    id: 'tbl-a1',
    code: 'A1',
    name: 'A1',
    shape: 'round',
    capacity: 8,
    category: 'VVIP',
    session: 'Semua Sesi',
    notes: 'Keluarga Utama & VVIP',
  },
  {
    id: 'tbl-b1',
    code: 'B1',
    name: 'B1',
    shape: 'rect',
    capacity: 10,
    category: 'VIP',
    session: 'Resepsi',
    notes: 'Sahabat & Kerabat VIP',
  },
  {
    id: 'tbl-c1',
    code: 'C1',
    name: 'C1',
    shape: 'square',
    capacity: 4,
    category: 'Reguler',
    session: 'Resepsi',
    notes: 'Kolega & Rekan Kerja',
  },
];

export function loadStoredTables(cust: Customer): WeddingTable[] {
  try {
    const raw = localStorage.getItem(getTableStorageKey(cust));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t, idx) => {
          const shape: TableShape = t.shape || 'round';
          const pfx = getShapePrefix(shape);
          const autoCode = `${pfx}${idx + 1}`;
          return {
            ...t,
            code: t.code || autoCode,
            name: t.name || t.code || autoCode,
          };
        });
      }
    }
  } catch {
    // Ignore
  }

  if (cust.slug === 'romeo-juliet' || cust.id.includes('demo')) {
    return DEFAULT_DEMO_TABLES;
  }
  return [];
}

export function saveStoredTables(cust: Customer, tables: WeddingTable[]): void {
  try {
    localStorage.setItem(getTableStorageKey(cust), JSON.stringify(tables));
  } catch {
    // Ignore
  }
}

export function isQrCheckinEnabled(cust: Customer, cloudEnabled?: boolean | null): boolean {
  if (typeof cloudEnabled === 'boolean') return cloudEnabled;
  try {
    if (cust.id) {
      const stored = localStorage.getItem(`joyever_qr_checkin_enabled_${cust.id}`);
      if (stored !== null) return stored === 'true';
    }
    if (cust.slug) {
      const stored = localStorage.getItem(`joyever_qr_checkin_enabled_${cust.slug}`);
      if (stored !== null) return stored === 'true';
    }
  } catch {}

  const lowerSlug = (cust.slug || '').toLowerCase();
  if (lowerSlug === 'romeo-juliet' || (cust.id && cust.id.includes('demo'))) {
    return true;
  }
  return false;
}

export function isTableManagementEnabled(cust: Customer, cloudEnabled?: boolean | null): boolean {
  if (typeof cloudEnabled === 'boolean') return cloudEnabled;
  try {
    if (cust.id) {
      const stored = localStorage.getItem(`joyever_table_mgmt_enabled_${cust.id}`);
      if (stored !== null) return stored === 'true';
    }
    if (cust.slug) {
      const stored = localStorage.getItem(`joyever_table_mgmt_enabled_${cust.slug}`);
      if (stored !== null) return stored === 'true';
    }
  } catch {}

  const lowerSlug = (cust.slug || '').toLowerCase();
  if (lowerSlug === 'romeo-juliet' || (cust.id && cust.id.includes('demo'))) {
    return true;
  }
  // Default mengikuti QR Checkin jika belum diset terpisah
  return isQrCheckinEnabled(cust);
}

export function isGuestCategoryEnabled(cust: Customer, cloudEnabled?: boolean | null): boolean {
  if (typeof cloudEnabled === 'boolean') return cloudEnabled;
  try {
    if (cust.id) {
      const stored = localStorage.getItem(`joyever_guest_cat_enabled_${cust.id}`);
      if (stored !== null) return stored === 'true';
    }
    if (cust.slug) {
      const stored = localStorage.getItem(`joyever_guest_cat_enabled_${cust.slug}`);
      if (stored !== null) return stored === 'true';
    }
  } catch {}

  const lowerSlug = (cust.slug || '').toLowerCase();
  if (lowerSlug === 'romeo-juliet' || (cust.id && cust.id.includes('demo'))) {
    return true;
  }
  // Default mengikuti QR Checkin jika belum diset terpisah
  return isQrCheckinEnabled(cust);
}

export function isEventFilterEnabled(cust: Customer, cloudEnabled?: boolean | null): boolean {
  if (typeof cloudEnabled === 'boolean') return cloudEnabled;
  try {
    if (cust.id) {
      const stored = localStorage.getItem(`joyever_event_filter_enabled_${cust.id}`);
      if (stored !== null) return stored === 'true';
    }
    if (cust.slug) {
      const stored = localStorage.getItem(`joyever_event_filter_enabled_${cust.slug}`);
      if (stored !== null) return stored === 'true';
    }
  } catch {}

  return false;
}

export function getCustomerCoverPhoto(cust?: Customer | null): string {
  if (!cust) return '/wedding-cover.jpg';
  try {
    const slug = (cust.slug || '').toLowerCase().trim();
    const customBg = localStorage.getItem(`welcome_cover_bg_${cust.id || slug}`);
    if (customBg) return customBg;
  } catch {}

  const slug = (cust.slug || '').toLowerCase().trim();
  if (slug) {
    return `/${slug}/banner/banner-qr.jpg`;
  }

  const host = cust.domain || (cust.slug ? `${cust.slug}.joyever.id` : '');
  if (host) return `https://${host}/banner/banner-qr.jpg`;

  return '/wedding-cover.jpg';
}

export function getWeddingEventDetails(
  cust?: Customer | null,
  settings?: { venueName?: string; eventDateText?: string } | null
): {
  venueName: string;
  formattedDate: string;
} {
  if (!cust) {
    return {
      venueName: 'The Grand Chapel Hall',
      formattedDate: 'Jumat, 16 Oktober 2026',
    };
  }

  const lowerSlug = (cust.slug || '').toLowerCase();
  const lowerCouple = (cust.couple_names || '').toLowerCase();

  // 1. Venue resolution
  let venue = settings?.venueName?.trim() || '';
  if (!venue) {
    if (lowerSlug.includes('seno') || lowerCouple.includes('seno')) {
      venue = 'The Heritage Hall at Plataran';
    } else if (lowerSlug.includes('rima') || lowerCouple.includes('rima')) {
      venue = 'The Grand Ballroom Hall';
    } else if (lowerSlug.includes('aul') || lowerSlug.includes('farid') || lowerCouple.includes('farid')) {
      venue = 'Grand Ballroom Aston Priority';
    } else if (lowerSlug.includes('romeo') || lowerCouple.includes('romeo')) {
      venue = 'The Grand Chapel Hall';
    } else {
      venue = 'The Grand Ballroom Hall';
    }
  }

  // 2. Date resolution
  let dateText = settings?.eventDateText?.trim() || '';
  if (!dateText) {
    if (cust.event_date && /^\d{4}-\d{2}-\d{2}/.test(cust.event_date)) {
      const parsedDate = new Date(cust.event_date);
      if (!isNaN(parsedDate.getTime())) {
        dateText = parsedDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    }
    if (!dateText) {
      if (lowerSlug.includes('seno') || lowerCouple.includes('seno')) {
        dateText = 'Minggu, 22 November 2026';
      } else {
        dateText = 'Jumat, 16 Oktober 2026';
      }
    }
  }

  return {
    venueName: venue,
    formattedDate: dateText,
  };
}

export async function setCustomerFeatureToggle(
  cust: Customer,
  feature: 'qrCheckin' | 'tableManagement' | 'guestCategory' | 'eventFilter',
  enabled: boolean
): Promise<void> {
  const keyMap = {
    qrCheckin: 'joyever_qr_checkin_enabled',
    tableManagement: 'joyever_table_mgmt_enabled',
    guestCategory: 'joyever_guest_cat_enabled',
    eventFilter: 'joyever_event_filter_enabled',
  };
  const prefix = keyMap[feature];
  try {
    if (cust.id) localStorage.setItem(`${prefix}_${cust.id}`, String(enabled));
    if (cust.slug) localStorage.setItem(`${prefix}_${cust.slug}`, String(enabled));
    window.dispatchEvent(
      new CustomEvent('joyever:feature-toggled', {
        detail: { customerId: cust.id, slug: cust.slug, feature, enabled },
      })
    );
    // Backward compatibility event
    if (feature === 'qrCheckin') {
      window.dispatchEvent(
        new CustomEvent('joyever:qr-checkin-toggled', {
          detail: { customerId: cust.id, slug: cust.slug, enabled },
        })
      );
    }
  } catch {}

  if (!cust.id || cust.id.includes('demo')) return;

  try {
    const supabase = getSupabase();
    const existing = await loadSharedConfigFromCloud(cust);

    let existingRowId: string | null = null;
    let rawExisting: Record<string, any> = {};
    try {
      const { data: row } = await supabase
        .from('guests')
        .select('id, phone')
        .eq('customer_id', cust.id)
        .eq('code', RESERVED_CONFIG_CODE)
        .maybeSingle();
      if (row?.id) existingRowId = row.id;
      if (row?.phone) {
        const parsed = JSON.parse(row.phone);
        if (parsed && typeof parsed === 'object') rawExisting = parsed;
      }
    } catch {}

    const currentQr = feature === 'qrCheckin' ? enabled : existing.qrCheckinEnabled;
    const currentTable = feature === 'tableManagement' ? enabled : existing.tableManagementEnabled;
    const currentCategory = feature === 'guestCategory' ? enabled : existing.guestCategoryEnabled;
    const currentEventFilter = feature === 'eventFilter' ? enabled : existing.eventFilterEnabled;

    const payloadStr = JSON.stringify({
      ...rawExisting,
      tables: existing.tables || [],
      guestMeta: existing.guestMeta || {},
      qrCheckinEnabled: currentQr,
      tableManagementEnabled: currentTable,
      guestCategoryEnabled: currentCategory,
      eventFilterEnabled: currentEventFilter,
      updatedAt: new Date().toISOString(),
    });

    if (existingRowId) {
      await supabase.from('guests').update({ phone: payloadStr }).eq('id', existingRowId);
    } else {
      await supabase.from('guests').insert({
        customer_id: cust.id,
        name: RESERVED_CONFIG_CODE,
        code: RESERVED_CONFIG_CODE,
        phone: payloadStr,
      });
    }

    // Broadcast across devices / QR Checkin tabs
    try {
      const channel = supabase.channel(`joyever_checkin_sync_${cust.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'checkin_updated',
        payload: { updatedAt: new Date().toISOString() },
      });
    } catch {
      // Ignore broadcast error
    }
  } catch (e) {
    console.warn(`Could not save feature toggle [${feature}] to cloud:`, e);
  }
}

export async function setCustomerQrCheckinEnabled(
  cust: Customer,
  enabled: boolean
): Promise<void> {
  return setCustomerFeatureToggle(cust, 'qrCheckin', enabled);
}

/**
 * Loads shared config (tables + guest extended metadata + feature toggles) from public.guests reserved row
 * or user_metadata so both the couple and Joyever Ushers see the exact same tables & categories.
 */
export async function loadSharedConfigFromCloud(cust: Customer): Promise<{
  tables: WeddingTable[] | null;
  guestMeta: Record<string, GuestExtendedMeta>;
  qrCheckinEnabled: boolean;
  tableManagementEnabled: boolean;
  guestCategoryEnabled: boolean;
  eventFilterEnabled: boolean;
}> {
  let tables: WeddingTable[] | null = null;
  let guestMeta: Record<string, GuestExtendedMeta> = {};
  let qrCheckinEnabled = isQrCheckinEnabled(cust);
  let tableManagementEnabled = isTableManagementEnabled(cust);
  let guestCategoryEnabled = isGuestCategoryEnabled(cust);
  let eventFilterEnabled = isEventFilterEnabled(cust);

  try {
    const supabase = getSupabase();
    const custId = cust.id || cust.slug;

    // 1. Check public.guests reserved row (__JOYEVER_CONFIG_V1__)
    if (cust.id && !cust.id.includes('demo')) {
      const { data, error } = await supabase
        .from('guests')
        .select('phone')
        .eq('customer_id', cust.id)
        .eq('code', RESERVED_CONFIG_CODE)
        .maybeSingle();

      if (!error && data?.phone) {
        try {
          const parsed = JSON.parse(data.phone);
          if (parsed && Array.isArray(parsed.tables)) {
            tables = parsed.tables;
          }
          if (parsed && parsed.guestMeta && typeof parsed.guestMeta === 'object') {
            guestMeta = parsed.guestMeta;
          }
          if (parsed && typeof parsed.qrCheckinEnabled === 'boolean') {
            qrCheckinEnabled = parsed.qrCheckinEnabled;
            try {
              if (cust.id) localStorage.setItem(`joyever_qr_checkin_enabled_${cust.id}`, String(qrCheckinEnabled));
              if (cust.slug) localStorage.setItem(`joyever_qr_checkin_enabled_${cust.slug}`, String(qrCheckinEnabled));
            } catch {}
          }
          if (parsed && typeof parsed.tableManagementEnabled === 'boolean') {
            tableManagementEnabled = parsed.tableManagementEnabled;
            try {
              if (cust.id) localStorage.setItem(`joyever_table_mgmt_enabled_${cust.id}`, String(tableManagementEnabled));
              if (cust.slug) localStorage.setItem(`joyever_table_mgmt_enabled_${cust.slug}`, String(tableManagementEnabled));
            } catch {}
          }
          if (parsed && typeof parsed.guestCategoryEnabled === 'boolean') {
            guestCategoryEnabled = parsed.guestCategoryEnabled;
            try {
              if (cust.id) localStorage.setItem(`joyever_guest_cat_enabled_${cust.id}`, String(guestCategoryEnabled));
              if (cust.slug) localStorage.setItem(`joyever_guest_cat_enabled_${cust.slug}`, String(guestCategoryEnabled));
            } catch {}
          }
          if (parsed && typeof parsed.eventFilterEnabled === 'boolean') {
            eventFilterEnabled = parsed.eventFilterEnabled;
            try {
              if (cust.id) localStorage.setItem(`joyever_event_filter_enabled_${cust.id}`, String(eventFilterEnabled));
              if (cust.slug) localStorage.setItem(`joyever_event_filter_enabled_${cust.slug}`, String(eventFilterEnabled));
            } catch {}
          }
        } catch {
          // Ignore
        }
      }
    }

    // 2. Fallback to Supabase auth session user_metadata if present (without network call)
    if (!tables) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (user?.user_metadata) {
          const meta = user.user_metadata;
          if (meta.tables_v3 && meta.tables_v3[custId]) {
            tables = meta.tables_v3[custId];
          }
          if (meta.guest_meta_v3 && meta.guest_meta_v3[custId]) {
            guestMeta = meta.guest_meta_v3[custId];
          }
        }
      } catch {
        // Ignore
      }
    }
  } catch (e) {
    console.warn('Could not load shared config from cloud:', e);
  }

  // 3. Fallback to localStorage if cloud didn't have it
  if (!tables) {
    tables = loadStoredTables(cust);
  }

  return { tables, guestMeta, qrCheckinEnabled, tableManagementEnabled, guestCategoryEnabled, eventFilterEnabled };
}

/**
 * Saves shared tables & guest metadata into public.guests reserved row
 * so all usher devices & couple accounts share it in real time.
 */
export async function saveSharedConfigToCloud(
  cust: Customer,
  tables: WeddingTable[],
  guestMeta?: Record<string, GuestExtendedMeta>
): Promise<void> {
  saveStoredTables(cust, tables);

  if (!cust.id || cust.id.includes('demo')) return;

  try {
    const supabase = getSupabase();

    let mergedGuestMeta = guestMeta;
    if (!guestMeta) {
      const existing = await loadSharedConfigFromCloud(cust);
      mergedGuestMeta = existing.guestMeta || {};
    }

    let existingRowId: string | null = null;
    let rawExisting: Record<string, any> = {};
    try {
      const { data: row } = await supabase
        .from('guests')
        .select('id, phone')
        .eq('customer_id', cust.id)
        .eq('code', RESERVED_CONFIG_CODE)
        .maybeSingle();
      if (row?.id) existingRowId = row.id;
      if (row?.phone) {
        const parsed = JSON.parse(row.phone);
        if (parsed && typeof parsed === 'object') rawExisting = parsed;
      }
    } catch {}

    const payloadStr = JSON.stringify({
      ...rawExisting,
      tables,
      guestMeta: mergedGuestMeta,
      qrCheckinEnabled: isQrCheckinEnabled(cust),
      tableManagementEnabled: isTableManagementEnabled(cust),
      guestCategoryEnabled: isGuestCategoryEnabled(cust),
      eventFilterEnabled: isEventFilterEnabled(cust),
      updatedAt: new Date().toISOString(),
    });

    if (existingRowId) {
      await supabase.from('guests').update({ phone: payloadStr }).eq('id', existingRowId);
    } else {
      await supabase.from('guests').insert({
        customer_id: cust.id,
        name: RESERVED_CONFIG_CODE,
        code: RESERVED_CONFIG_CODE,
        phone: payloadStr,
      });
    }
  } catch (e) {
    console.warn('Could not sync table config to cloud:', e);
  }
}
