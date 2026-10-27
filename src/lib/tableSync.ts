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
    const key = `joyever_qr_checkin_enabled_${cust.id || cust.slug}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) return stored === 'true';
  } catch {}

  const lowerSlug = (cust.slug || '').toLowerCase();
  // Known accounts with QR Check-In active
  if (
    lowerSlug.includes('indah') ||
    lowerSlug.includes('rima') ||
    lowerSlug === 'romeo-juliet' ||
    (cust.id && cust.id.includes('demo'))
  ) {
    return true;
  }
  return false;
}

export async function setCustomerQrCheckinEnabled(
  cust: Customer,
  enabled: boolean
): Promise<void> {
  try {
    const key = `joyever_qr_checkin_enabled_${cust.id || cust.slug}`;
    localStorage.setItem(key, String(enabled));
  } catch {}

  if (!cust.id || cust.id.includes('demo')) return;

  try {
    const supabase = getSupabase();
    const existing = await loadSharedConfigFromCloud(cust);
    const payloadStr = JSON.stringify({
      tables: existing.tables || [],
      guestMeta: existing.guestMeta || {},
      qrCheckinEnabled: enabled,
      updatedAt: new Date().toISOString(),
    });

    await supabase
      .from('guests')
      .delete()
      .eq('customer_id', cust.id)
      .eq('code', RESERVED_CONFIG_CODE);
    await supabase.from('guests').insert({
      customer_id: cust.id,
      name: RESERVED_CONFIG_CODE,
      code: RESERVED_CONFIG_CODE,
      phone: payloadStr,
    });
  } catch (e) {
    console.warn('Could not save qr checkin flag to cloud:', e);
  }
}

/**
 * Loads shared config (tables + guest extended metadata + qrCheckinEnabled) from public.guests reserved row
 * or user_metadata so both the couple and Joyever Ushers see the exact same tables & categories.
 */
export async function loadSharedConfigFromCloud(cust: Customer): Promise<{
  tables: WeddingTable[] | null;
  guestMeta: Record<string, GuestExtendedMeta>;
  qrCheckinEnabled: boolean;
}> {
  let tables: WeddingTable[] | null = null;
  let guestMeta: Record<string, GuestExtendedMeta> = {};
  let qrCheckinEnabled = isQrCheckinEnabled(cust);

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
          }
        } catch {
          // Ignore
        }
      }
    }

    // 2. Fallback to Supabase auth user_metadata if present
    if (!tables) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

  return { tables, guestMeta, qrCheckinEnabled };
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
    const custId = cust.id || cust.slug;

    let mergedGuestMeta = guestMeta;
    if (!guestMeta) {
      const existing = await loadSharedConfigFromCloud(cust);
      mergedGuestMeta = existing.guestMeta || {};
    }

    const payloadStr = JSON.stringify({
      tables,
      guestMeta: mergedGuestMeta,
      qrCheckinEnabled: isQrCheckinEnabled(cust),
      updatedAt: new Date().toISOString(),
    });

    await supabase
      .from('guests')
      .delete()
      .eq('customer_id', cust.id)
      .eq('code', RESERVED_CONFIG_CODE);
    await supabase.from('guests').insert({
      customer_id: cust.id,
      name: RESERVED_CONFIG_CODE,
      code: RESERVED_CONFIG_CODE,
      phone: payloadStr,
    });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const tablesV3 =
          meta.tables_v3 && typeof meta.tables_v3 === 'object' ? { ...meta.tables_v3 } : {};
        if (JSON.stringify(tables).length <= 3500) {
          tablesV3[custId] = tables;
          await supabase.auth.updateUser({
            data: {
              ...meta,
              tables_v3: tablesV3,
            },
          });
        }
      }
    } catch {
      // Ignore
    }
  } catch (e) {
    console.warn('Could not sync table config to cloud:', e);
  }
}
