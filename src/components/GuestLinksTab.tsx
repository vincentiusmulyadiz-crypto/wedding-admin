import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { encodeGuestCode } from '../lib/guestCode';
import { normalizePhoneNumber, formatPhoneNumber } from '../lib/format';
import { showToast } from '../lib/toast';
import {
  Copy,
  Check,
  MessageCircle,
  Users,
  UserPlus,
  Phone,
  Edit3,
  Trash2,
  RotateCw,
  Search,
  Upload,
  X,
  Send,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface InvitedGuest {
  id: string;
  name: string;
  phone: string;
  code?: string;
}

interface GuestLinksTabProps {
  customer: Customer;
  userEmail?: string | null;
  userId?: string | null;
}

const DEFAULT_WA_TEMPLATE = `Kepada Yth. {nama},

Tanpa mengurangi rasa hormat, kami bermaksud mengundang Anda untuk hadir pada acara pernikahan kami:
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.

Terima kasih.`;

// Helper: Cek apakah daftar saat ini hanya berisi 4 data dummy bawaan
export const isSampleGuestList = (list: InvitedGuest[]): boolean => {
  if (!list || list.length !== 4) return false;
  return list[0]?.name === 'Budi Santoso' && list[1]?.name === 'Siti Aminah & Keluarga';
};

// Format arahan preview URL untuk masing-masing customer
export const getBaseUrlPreviewFormat = (cust: Customer): string => {
  const coupleSlug = cust.slug || 'namapasangan';
  return `https://${coupleSlug}.joyever.id`;
};

// Identifikasi unik per undangan/dashboard pengantin
export const getCustomerStorageId = (cust: Customer): string => {
  return cust.id || cust.slug || 'unknown';
};

// Cek apakah customer ini adalah dashboard Alfredo & Yana (pemilik asli data tamu sebelum isolasi v3)
export const isAlfredoYanaCustomer = (cust: Customer): boolean => {
  const s = (cust.slug || '').toLowerCase();
  const n = (cust.couple_names || '').toLowerCase();

  // Pastikan BUKAN pasangan lain (Indah & Ricky, Dita & Fachrul, Risa & Adi, Herman & Vonny, dll.)
  if (
    n.includes('indah') ||
    n.includes('ricky') ||
    s.includes('indah') ||
    s.includes('ricky') ||
    n.includes('dita') ||
    n.includes('fachrul') ||
    s.includes('dita') ||
    s.includes('fachrul') ||
    n.includes('risa') ||
    n.includes('adi') ||
    s.includes('risa') ||
    s.includes('adi') ||
    n.includes('herman') ||
    n.includes('vonny') ||
    s.includes('herman') ||
    s.includes('vonny')
  ) {
    return false;
  }

  // Hanya cocok jika nama/slug memang Alfredo / Yana / Edo
  return (
    (s.includes('alfredo') && s.includes('yana')) ||
    (n.includes('alfredo') && n.includes('yana')) ||
    (n.includes('yana') && (n.includes('edo') || n.includes('ojoon'))) ||
    s === 'alfredo-yana' ||
    (s === 'pernikahan-saya' && (n.includes('yana') || n.includes('edo') || n.includes('alfredo')))
  );
};

// Deteksi apakah daftar tamu ini adalah salinan bocoran dari Alfredo & Yana
const isLeakedAlfredoGuestList = (list: InvitedGuest[], meta?: any): boolean => {
  if (!Array.isArray(list) || list.length === 0) return false;
  if (isSampleGuestList(list)) return false;

  // 1. Cek terhadap primary_guest_records di metadata Supabase Auth
  if (meta) {
    const primary = Array.isArray(meta.primary_guest_records) ? meta.primary_guest_records : [];
    if (primary.length > 0) {
      const primaryNames = new Set(
        primary.map((g: any) => (g && typeof g.name === 'string' ? g.name.trim().toLowerCase() : '')).filter(Boolean)
      );
      const matchCount = list.filter((g) => primaryNames.has((g.name || '').trim().toLowerCase())).length;
      if (matchCount > 0 && matchCount >= Math.min(3, list.length)) {
        return true;
      }
    }
  }

  // 2. Cek terhadap legacy keys di browser localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('guest_records_v2_owner_') ||
          key.startsWith('guest_records_v2_user_') ||
          key.includes('alfredo') ||
          key.includes('yana'))
      ) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const legacyNames = new Set(
                parsed.map((g: any) => (g && typeof g.name === 'string' ? g.name.trim().toLowerCase() : '')).filter(Boolean)
              );
              const matchCount = list.filter((g) => legacyNames.has((g.name || '').trim().toLowerCase())).length;
              if (matchCount > 0 && matchCount >= Math.min(3, list.length)) {
                return true;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  return false;
};

// Kunci penyimpanan lokal yang terisolasi penuh per ID undangan (tanpa key global owner)
export const getGuestStorageKey = (cust: Customer): string =>
  `guest_records_v3_${getCustomerStorageId(cust)}`;

export const getBaseUrlStorageKey = (cust: Customer): string =>
  `base_url_v3_${getCustomerStorageId(cust)}`;

export const getWaTemplateStorageKey = (cust: Customer): string =>
  `wa_template_v3_${getCustomerStorageId(cust)}`;

// Bersihkan kunci-kunci v2 lama yang bocor di localStorage
const purgeLegacyLeakedLocalStorage = (cust: Customer, userId?: string) => {
  try {
    const ownerId = cust.owner_id || userId;
    if (ownerId) {
      localStorage.removeItem(`guest_records_v2_owner_${ownerId}`);
      localStorage.removeItem(`base_url_owner_${ownerId}`);
    }
    if (!isAlfredoYanaCustomer(cust)) {
      if (cust.id) {
        localStorage.removeItem(`guest_records_v2_${cust.id}`);
        localStorage.removeItem(`guest_names_${cust.id}`);
      }
      if (cust.slug) {
        localStorage.removeItem(`guest_records_v2_${cust.slug}`);
        localStorage.removeItem(`guest_names_${cust.slug}`);
      }
      if (ownerId && cust.id) {
        localStorage.removeItem(`guest_records_v2_owner_${ownerId}_${cust.id}`);
      }
      if (ownerId && cust.slug) {
        localStorage.removeItem(`guest_records_v2_owner_${ownerId}_${cust.slug}`);
      }
    }
  } catch {
    // Abaikan error storage
  }
};

// Muat Base URL yang tersimpan khusus untuk dashboard pengantin ini saja
export const loadStoredBaseUrl = (cust: Customer, userId?: string): string => {
  try {
    const key = getBaseUrlStorageKey(cust);
    const savedV3 = localStorage.getItem(key);
    if (savedV3 !== null) {
      // Jika BUKAN Alfredo & Yana tapi URL mengandung alfredo/yana/edo, itu adalah bocoran
      if (!isAlfredoYanaCustomer(cust)) {
        const lower = savedV3.toLowerCase();
        if (lower.includes('alfredo') || lower.includes('yana') || lower.includes('ojoon')) {
          localStorage.removeItem(key);
          return '';
        }
      }
      return savedV3;
    }

    // Migrasi v2 hanya jika milik Alfredo & Yana atau URL memang mengandung slug pasangan ini
    const oldVal =
      localStorage.getItem(`base_url_${cust.id}`) ||
      (cust.slug ? localStorage.getItem(`base_url_${cust.slug}`) : null);

    if (oldVal && oldVal.trim() !== '') {
      const lowerUrl = oldVal.toLowerCase();
      const slugMatch = cust.slug && lowerUrl.includes(cust.slug.toLowerCase());
      if (isAlfredoYanaCustomer(cust) || slugMatch) {
        localStorage.setItem(key, oldVal);
        return oldVal;
      }
    }

    purgeLegacyLeakedLocalStorage(cust, userId);
  } catch (e) {
    console.error('Error loading base url:', e);
  }
  return '';
};

// Simpan Base URL khusus untuk dashboard pengantin ini saja
export const saveBaseUrlForCustomer = (cust: Customer, url: string, _userId?: string) => {
  try {
    localStorage.setItem(getBaseUrlStorageKey(cust), url);
  } catch (e) {
    console.error('Error saving base url:', e);
  }
};

// Muat daftar tamu yang tersimpan di browser khusus untuk dashboard pengantin ini saja
export const loadStoredGuests = (cust: Customer, userId?: string): InvitedGuest[] => {
  try {
    const v3Key = getGuestStorageKey(cust);
    const savedV3 = localStorage.getItem(v3Key);
    if (savedV3 !== null) {
      try {
        const parsed = JSON.parse(savedV3);
        if (Array.isArray(parsed)) {
          // Jika BUKAN Alfredo & Yana, periksa apakah list tersimpan adalah bocoran dari Alfredo & Yana
          if (!isAlfredoYanaCustomer(cust) && isLeakedAlfredoGuestList(parsed)) {
            localStorage.removeItem(v3Key);
            return [];
          }
          return parsed;
        }
      } catch {
        // Abaikan json yang korup
      }
    }

    // Migrasi data lama v2 HANYA untuk dashboard Alfredo & Yana
    if (isAlfredoYanaCustomer(cust)) {
      const ownerId = cust.owner_id || userId;
      const v2Candidates = [
        cust.id ? `guest_records_v2_${cust.id}` : '',
        cust.slug ? `guest_records_v2_${cust.slug}` : '',
        ownerId && cust.id ? `guest_records_v2_owner_${ownerId}_${cust.id}` : '',
        ownerId && cust.slug ? `guest_records_v2_owner_${ownerId}_${cust.slug}` : '',
        ownerId ? `guest_records_v2_owner_${ownerId}` : '',
      ].filter(Boolean);

      for (const k of v2Candidates) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(v3Key, JSON.stringify(parsed));
              return parsed;
            }
          } catch {
            // Abaikan
          }
        }
      }
    } else {
      // Untuk semua akun/dashboard pengantin lain, bersihkan bocoran data v2
      purgeLegacyLeakedLocalStorage(cust, userId);
    }
  } catch (e) {
    console.error('Error loading guests:', e);
  }

  // Khusus akun demo romeo-juliet sediakan data contoh awal
  if (cust.slug === 'romeo-juliet' || cust.id.includes('demo')) {
    return [
      { id: 'demo-1', name: 'Budi Santoso', phone: '081234567890' },
      { id: 'demo-2', name: 'Siti Aminah & Keluarga', phone: '085712345678' },
      { id: 'demo-3', name: 'Dr. Hendra Wijaya', phone: '081987654321' },
      { id: 'demo-4', name: 'Reza Fahlevi', phone: '' },
    ];
  }

  return [];
};

// Simpan daftar tamu khusus untuk dashboard pengantin ini saja ke browser
export const saveGuestsForCustomer = (
  cust: Customer,
  guestList: InvitedGuest[],
  _userId?: string
) => {
  try {
    const jsonStr = JSON.stringify(guestList);
    localStorage.setItem(getGuestStorageKey(cust), jsonStr);
  } catch (e) {
    console.error('Error saving guests:', e);
  }
};

// ==============================================================================
// SINKRONISASI CLOUD TERISOLASI PER CUSTOMER ID (V3)
// ==============================================================================

// Muat daftar tamu langsung dari cloud khusus untuk customer.id ini saja
export const loadGuestsFromCloud = async (cust: Customer): Promise<InvitedGuest[] | null> => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);

    // 1. Baca dari Supabase Auth user_metadata.guest_records_v3[cust.id] terlebih dahulu
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (!userErr && user && user.user_metadata) {
        const meta = user.user_metadata;
        const guestRecordsV3 = meta.guest_records_v3;

        if (
          guestRecordsV3 &&
          typeof guestRecordsV3 === 'object' &&
          Object.prototype.hasOwnProperty.call(guestRecordsV3, custId)
        ) {
          const list = guestRecordsV3[custId];
          if (Array.isArray(list)) {
            // Jika BUKAN Alfredo & Yana, periksa apakah list v3 yang tersimpan adalah bocoran identik
            if (!isAlfredoYanaCustomer(cust) && isLeakedAlfredoGuestList(list, meta)) {
              console.warn(
                `[Auto-Purge] Menghapus data tamu bocoran Alfredo & Yana dari dashboard ${
                  cust.couple_names || cust.slug || cust.id
                }`
              );
              await saveGuestsToCloud(cust, []);
              localStorage.removeItem(getGuestStorageKey(cust));
              return [];
            }
            return list;
          }
        }

        // Jika belum ada di guest_records_v3:
        // Migrasi satu kali dari v2 / tabel HANYA jika ini dashboard Alfredo & Yana
        if (isAlfredoYanaCustomer(cust)) {
          const legacyRecords = meta.guest_records;
          const legacyList =
            (legacyRecords && typeof legacyRecords === 'object'
              ? legacyRecords[cust.id] || (cust.slug ? legacyRecords[cust.slug] : null)
              : null) ||
            (Array.isArray(meta.primary_guest_records) ? meta.primary_guest_records : null);

          if (Array.isArray(legacyList) && legacyList.length > 0) {
            await saveGuestsToCloud(cust, legacyList);
            return legacyList;
          }
        } else {
          // Untuk dashboard pengantin selain Alfredo & Yana yang belum terinisialisasi di v3,
          // inisialisasi bersih ke array kosong [] agar bocoran dari v2 / tabel lama langsung terhapus
          await saveGuestsToCloud(cust, []);
          localStorage.removeItem(getGuestStorageKey(cust));
          return [];
        }
      }
    } catch (metaErr) {
      console.warn('Could not read user_metadata:', metaErr);
    }

    // 2. Fallback baca dari tabel public.guests (terfilter ketat berdasarkan customer_id)
    try {
      const { data: dbGuests, error: dbErr } = await supabase
        .from('guests')
        .select('id, name, phone, code')
        .eq('customer_id', cust.id);

      if (!dbErr && dbGuests && dbGuests.length > 0) {
        return dbGuests.map((g: any) => ({
          id: g.id || `db-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: g.name,
          phone: g.phone || '',
          code: g.code,
        }));
      }
    } catch {
      // Abaikan jika tabel belum ada
    }
  } catch (e) {
    console.warn('Error loading guests from cloud:', e);
  }
  return null;
};

// Simpan daftar tamu secara permanen khusus untuk customer.id ini saja
export const saveGuestsToCloud = async (
  cust: Customer,
  guestList: InvitedGuest[]
): Promise<boolean> => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);

    // 1. Simpan ke Supabase Auth user_metadata.guest_records_v3[cust.id] (tanpa primary_guest_records global)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        const existingMeta = user.user_metadata || {};
        const existingRecordsV3 =
          existingMeta.guest_records_v3 && typeof existingMeta.guest_records_v3 === 'object'
            ? existingMeta.guest_records_v3
            : {};

        const updatedRecordsV3 = {
          ...existingRecordsV3,
          [custId]: guestList,
        };

        await supabase.auth.updateUser({
          data: {
            ...existingMeta,
            guest_records_v3: updatedRecordsV3,
            primary_guest_records: null,
            last_guest_sync: new Date().toISOString(),
          },
        });
      }
    } catch (authErr) {
      console.warn('Could not update user_metadata:', authErr);
    }

    // 2. Jika tabel public.guests ada, sinkronkan juga ke tabel database khusus customer_id ini
    try {
      await supabase.from('guests').delete().eq('customer_id', cust.id);
      if (guestList.length > 0) {
        const rows = guestList.map((g) => ({
          customer_id: cust.id,
          name: g.name,
          phone: g.phone || '',
          code: g.code || encodeGuestCode(g.name),
        }));
        await supabase.from('guests').insert(rows);
      }
    } catch {
      // Abaikan jika tabel public.guests belum dibuat
    }

    return true;
  } catch (e) {
    console.error('Error saving guests to cloud:', e);
    return false;
  }
};

export const loadBaseUrlFromCloud = async (cust: Customer): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata;
    if (!meta) return null;

    if (
      meta.base_urls_v3 &&
      typeof meta.base_urls_v3 === 'object' &&
      typeof meta.base_urls_v3[custId] === 'string'
    ) {
      const saved = meta.base_urls_v3[custId];
      // Jika BUKAN Alfredo & Yana tapi URL mengandung alfredo/yana/edo, bersihkan
      if (!isAlfredoYanaCustomer(cust)) {
        const lower = saved.toLowerCase();
        if (lower.includes('alfredo') || lower.includes('yana') || lower.includes('ojoon')) {
          await saveBaseUrlToCloud(cust, '');
          return '';
        }
      }
      return saved;
    }

    // Migrasi v2 hanya jika milik Alfredo & Yana atau URL sesuai dengan slug pasangan ini
    if (meta.base_urls && typeof meta.base_urls === 'object') {
      const oldUrl = meta.base_urls[cust.id] || (cust.slug ? meta.base_urls[cust.slug] : null);
      if (typeof oldUrl === 'string' && oldUrl.trim() !== '') {
        const slugMatch = cust.slug && oldUrl.toLowerCase().includes(cust.slug.toLowerCase());
        if (isAlfredoYanaCustomer(cust) || slugMatch) {
          await saveBaseUrlToCloud(cust, oldUrl);
          return oldUrl;
        }
      }
    }
  } catch {}
  return null;
};

export const saveBaseUrlToCloud = async (cust: Customer, url: string) => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata || {};
      const baseUrlsV3 =
        meta.base_urls_v3 && typeof meta.base_urls_v3 === 'object' ? meta.base_urls_v3 : {};
      await supabase.auth.updateUser({
        data: {
          ...meta,
          base_urls_v3: {
            ...baseUrlsV3,
            [custId]: url,
          },
        },
      });
    }
  } catch {}
};

export const loadWaTemplateFromCloud = async (cust: Customer): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);
    const { data: { user } } = await supabase.auth.getUser();
    const meta = user?.user_metadata;
    if (meta?.wa_templates_v3 && typeof meta.wa_templates_v3[custId] === 'string') {
      return meta.wa_templates_v3[custId];
    }
  } catch {}
  return null;
};

export const saveWaTemplateToCloud = async (cust: Customer, template: string) => {
  try {
    const supabase = getSupabase();
    const custId = getCustomerStorageId(cust);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = user.user_metadata || {};
      const templatesV3 =
        meta.wa_templates_v3 && typeof meta.wa_templates_v3 === 'object'
          ? meta.wa_templates_v3
          : {};
      await supabase.auth.updateUser({
        data: {
          ...meta,
          wa_templates_v3: {
            ...templatesV3,
            [custId]: template,
          },
        },
      });
    }
  } catch {}
};

export const GuestLinksTab: React.FC<GuestLinksTabProps> = ({
  customer,
  userEmail,
  userId,
}) => {
  const codesStorageKey = `guest_codes_${customer.id}`;
  const templateStorageKey = getWaTemplateStorageKey(customer);
  const linkFormatStorageKey = `link_format_${customer.id}`;

  const previewBaseUrl = getBaseUrlPreviewFormat(customer);

  // Status sinkronisasi ke akun Supabase Cloud
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');

  // Initial guest list loader tersimpan khusus per customer.id
  const [guests, setGuests] = useState<InvitedGuest[]>(() =>
    loadStoredGuests(customer, userId || undefined)
  );

  // Base URL text box
  const [baseUrl, setBaseUrl] = useState<string>(() =>
    loadStoredBaseUrl(customer, userId || undefined)
  );

  const [linkFormat, setLinkFormat] = useState<'random' | 'named'>(() => {
    return (localStorage.getItem(linkFormatStorageKey) as 'random' | 'named') || 'random';
  });

  const [waTemplate, setWaTemplate] = useState<string>(() => {
    return localStorage.getItem(templateStorageKey) || DEFAULT_WA_TEMPLATE;
  });

  // Modal & Form States
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [editingGuest, setEditingGuest] = useState<InvitedGuest | null>(null);

  // Quick Inline Add in Step 1
  const [quickName, setQuickName] = useState<string>('');
  const [quickPhone, setQuickPhone] = useState<string>('');

  // Form Fields for Add / Edit modal
  const [inputName, setInputName] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Batch Import Text & Options
  const [batchText, setBatchText] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPhone, setFilterPhone] = useState<'all' | 'with_phone' | 'no_phone'>('all');

  // RSVP Status Check
  const [existingRsvps, setExistingRsvps] = useState<Rsvp[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sinkronisasi data lokal & cloud secara otomatis saat customer dipilih/berubah
  useEffect(() => {
    let isCancelled = false;
    const currentTemplateKey = getWaTemplateStorageKey(customer);

    // 1. Muat data lokal seketika dari cache browser (terisolasi per customer.id)
    const localGuests = loadStoredGuests(customer, userId || undefined);
    setGuests(localGuests);

    const localUrl = loadStoredBaseUrl(customer, userId || undefined);
    setBaseUrl(localUrl);

    const localTemplate =
      localStorage.getItem(currentTemplateKey) || DEFAULT_WA_TEMPLATE;
    setWaTemplate(localTemplate);

    // 2. Sinkronkan dengan Supabase Cloud khusus untuk customer.id ini
    const syncFromCloud = async () => {
      try {
        const cloudGuests = await loadGuestsFromCloud(customer);
        if (isCancelled) return;

        if (cloudGuests && cloudGuests.length > 0) {
          setGuests(cloudGuests);
          saveGuestsForCustomer(customer, cloudGuests, userId || undefined);
          setSyncStatus('synced');
        } else if (localGuests.length > 0 && !isSampleGuestList(localGuests)) {
          // Ada data lokal v3 untuk customer ini tapi di cloud belum ada, upload ke cloud
          setSyncStatus('saving');
          const ok = await saveGuestsToCloud(customer, localGuests);
          if (!isCancelled) setSyncStatus(ok ? 'synced' : 'offline');
        } else if (cloudGuests !== null) {
          setGuests([]);
          saveGuestsForCustomer(customer, [], userId || undefined);
          setSyncStatus('synced');
        }

        const cloudUrl = await loadBaseUrlFromCloud(customer);
        if (!isCancelled && cloudUrl) {
          setBaseUrl(cloudUrl);
          saveBaseUrlForCustomer(customer, cloudUrl, userId || undefined);
        } else if (localUrl) {
          await saveBaseUrlToCloud(customer, localUrl);
        }

        const cloudTemplate = await loadWaTemplateFromCloud(customer);
        if (!isCancelled && cloudTemplate) {
          setWaTemplate(cloudTemplate);
          localStorage.setItem(currentTemplateKey, cloudTemplate);
        } else if (localTemplate && localTemplate !== DEFAULT_WA_TEMPLATE) {
          await saveWaTemplateToCloud(customer, localTemplate);
        }
      } catch (err) {
        console.warn('Sync cloud error:', err);
      }
    };

    syncFromCloud();

    return () => {
      isCancelled = true;
    };
  }, [customer.id, customer.slug, customer.owner_id, userId]);

  // Fungsi terpusat: Perbarui tamu di state, localStorage, dan akun Supabase Cloud
  const updateAndPersistGuests = useCallback(
    async (nextList: InvitedGuest[]) => {
      setGuests(nextList);
      saveGuestsForCustomer(customer, nextList, userId || undefined);
      setSyncStatus('saving');
      const ok = await saveGuestsToCloud(customer, nextList);
      setSyncStatus(ok ? 'synced' : 'offline');
    },
    [customer, userId]
  );

  const baseUrlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBaseUrlChange = (val: string) => {
    setBaseUrl(val);
    saveBaseUrlForCustomer(customer, val, userId || undefined);

    if (baseUrlDebounceRef.current) {
      clearTimeout(baseUrlDebounceRef.current);
    }
    baseUrlDebounceRef.current = setTimeout(() => {
      saveBaseUrlToCloud(customer, val);
    }, 1500);
  };

  const handleBaseUrlBlur = () => {
    if (baseUrlDebounceRef.current) {
      clearTimeout(baseUrlDebounceRef.current);
    }
    saveBaseUrlToCloud(customer, baseUrl);
  };

  useEffect(() => {
    localStorage.setItem(linkFormatStorageKey, linkFormat);
  }, [linkFormatStorageKey, linkFormat]);

  // Fetch RSVPs to match confirmation status
  const fetchExistingRsvps = useCallback(async () => {
    if (!customer?.id) return;
    setLoadingRsvps(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('rsvps')
        .select('id, name, guest_param, attendance, guests, created_at')
        .eq('customer_id', customer.id);

      if (error) {
        console.error('Error fetching RSVPs for links matching:', error.message);
        return;
      }
      setExistingRsvps((data as Rsvp[]) || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingRsvps(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchExistingRsvps();
  }, [fetchExistingRsvps]);

  // Enriched Guests with generated links, codes, and RSVP status
  const enrichedGuests = useMemo(() => {
    let savedCodes: Record<string, string> = {};
    try {
      savedCodes = JSON.parse(localStorage.getItem(codesStorageKey) || '{}');
    } catch {
      savedCodes = {};
    }

    let codesUpdated = false;
    const currentCodes: Record<string, string> = { ...savedCodes };

    guests.forEach((g) => {
      if (!currentCodes[g.name]) {
        currentCodes[g.name] = encodeGuestCode(g.name);
        codesUpdated = true;
      }
    });

    if (codesUpdated) {
      localStorage.setItem(codesStorageKey, JSON.stringify(currentCodes));
    }

    const rsvpLookup = new Set<string>();
    existingRsvps.forEach((r) => {
      if (r.name) rsvpLookup.add(r.name.trim().toLowerCase());
      if (r.guest_param) rsvpLookup.add(r.guest_param.trim().toLowerCase());
    });

    let cleanBase = baseUrl.trim().replace(/\/+$/, '');
    if (cleanBase && !cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
      cleanBase = `https://${cleanBase}`;
    }
    const effectiveBase = cleanBase || previewBaseUrl.replace(/\/+$/, '');

    return guests.map((guest) => {
      const code = currentCodes[guest.name] || encodeGuestCode(guest.name);
      const separator = effectiveBase.includes('?') ? '&' : '?';

      const link =
        linkFormat === 'random'
          ? `${effectiveBase}${separator}c=${code}`
          : `${effectiveBase}${separator}to=${encodeURIComponent(guest.name).replace(/%20/g, '+')}`;

      const lowerName = guest.name.toLowerCase();
      const lowerCode = code.toLowerCase();
      const isRsvped = rsvpLookup.has(lowerName) || rsvpLookup.has(lowerCode);

      return {
        ...guest,
        code,
        link,
        isRsvped,
      };
    });
  }, [guests, baseUrl, previewBaseUrl, existingRsvps, linkFormat, codesStorageKey]);

  // Filtered guest list based on search and phone filter
  const filteredGuests = useMemo(() => {
    return enrichedGuests.filter((g) => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        g.name.toLowerCase().includes(query) ||
        g.phone.toLowerCase().includes(query) ||
        normalizePhoneNumber(g.phone).includes(query);

      const matchPhone =
        filterPhone === 'all' ||
        (filterPhone === 'with_phone' && !!normalizePhoneNumber(g.phone)) ||
        (filterPhone === 'no_phone' && !normalizePhoneNumber(g.phone));

      return matchSearch && matchPhone;
    });
  }, [enrichedGuests, searchQuery, filterPhone]);

  const totalGuests = guests.length;
  const withPhoneCount = useMemo(() => {
    return guests.filter((g) => !!normalizePhoneNumber(g.phone)).length;
  }, [guests]);
  const rsvpedCount = useMemo(() => {
    return enrichedGuests.filter((g) => g.isRsvped).length;
  }, [enrichedGuests]);

  // Clipboard Helpers
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Tautan undangan berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    if (enrichedGuests.length === 0) return;
    const formatted = enrichedGuests
      .map((g) => {
        const phoneStr = g.phone ? ` (${formatPhoneNumber(g.phone)})` : '';
        return `${g.name}${phoneStr}: ${g.link}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(formatted);
    showToast(`Berhasil menyalin ${enrichedGuests.length} tautan tamu ke clipboard!`, 'success');
  };

  // WhatsApp Direct Link Generator
  const generateWhatsAppUrl = (name: string, phone: string, link: string) => {
    const text = waTemplate
      .replace(/{nama}/g, name)
      .replace(/{link}/g, link)
      .replace(/{pasangan}/g, customer.couple_names || 'Pengantin');

    const clean = normalizePhoneNumber(phone);
    if (clean) {
      return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Quick Add Handler from Step 1
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickName.trim();
    if (!trimmed) return;

    const newGuest: InvitedGuest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      phone: quickPhone.trim(),
    };

    const nextList = [newGuest, ...guests];
    updateAndPersistGuests(nextList);
    setQuickName('');
    setQuickPhone('');
    showToast(`Tamu "${trimmed}" berhasil ditambahkan!`, 'success');
  };

  // Add / Edit Handlers for modal
  const handleOpenAddModal = () => {
    setInputName('');
    setInputPhone('');
    setFormError(null);
    setEditingGuest(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (guest: InvitedGuest) => {
    setEditingGuest(guest);
    setInputName(guest.name);
    setInputPhone(guest.phone);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = inputName.trim();
    if (!trimmedName) {
      setFormError('Nama tamu wajib diisi.');
      return;
    }

    let nextList: InvitedGuest[];
    if (editingGuest) {
      nextList = guests.map((g) =>
        g.id === editingGuest.id
          ? { ...g, name: trimmedName, phone: inputPhone.trim() }
          : g
      );
      showToast(`Data "${trimmedName}" berhasil diperbarui`, 'success');
    } else {
      const newGuest: InvitedGuest = {
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        phone: inputPhone.trim(),
      };
      nextList = [newGuest, ...guests];
      showToast(`Tamu "${trimmedName}" berhasil ditambahkan`, 'success');
    }

    updateAndPersistGuests(nextList);
    setShowAddModal(false);
  };

  const handleDeleteGuest = (id: string, name: string) => {
    if (window.confirm(`Hapus "${name}" dari daftar tamu?`)) {
      const nextList = guests.filter((g) => g.id !== id);
      updateAndPersistGuests(nextList);
      showToast(`Tamu "${name}" telah dihapus`, 'info');
    }
  };

  const handleClearAllGuests = () => {
    if (guests.length === 0) return;
    if (
      window.confirm(
        `Hapus semua ${guests.length} tamu dari daftar undangan ${
          customer.couple_names || customer.slug
        }?`
      )
    ) {
      updateAndPersistGuests([]);
      showToast('Seluruh daftar tamu telah dikosongkan', 'info');
    }
  };

  const handleOpenBatchModal = () => {
    setBatchText('');
    setReplaceExisting(guests.length === 0 || isSampleGuestList(guests));
    setShowBatchModal(true);
  };

  // Batch Import Handler
  const handleImportBatch = () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const imported: InvitedGuest[] = lines.map((line, idx) => {
      let name = line;
      let phone = '';

      if (line.includes(',')) {
        const parts = line.split(',');
        name = parts[0].trim();
        phone = parts.slice(1).join(',').trim();
      } else if (line.includes(' - ')) {
        const parts = line.split(' - ');
        name = parts[0].trim();
        phone = parts[1].trim();
      } else if (line.includes('\t')) {
        const parts = line.split('\t');
        name = parts[0].trim();
        phone = parts.slice(1).join('\t').trim();
      } else if (line.includes(';')) {
        const parts = line.split(';');
        name = parts[0].trim();
        phone = parts.slice(1).join(';').trim();
      }

      name = name.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim();

      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        phone,
      };
    });

    const shouldReplace = replaceExisting || (guests.length > 0 && isSampleGuestList(guests));
    const nextList = shouldReplace ? imported : [...guests, ...imported];

    updateAndPersistGuests(nextList);
    setBatchText('');
    setShowBatchModal(false);
    showToast(`Berhasil menambahkan ${imported.length} tamu!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Aksi Sekunder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0e2c34] flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-emerald-600" />
            <span>Kirim Undangan via WhatsApp</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-[#52717b]">
              Alur praktis 3 langkah untuk mengundang tamu secara personal
            </p>
            <span className="text-[#a5b9be]">•</span>
            {syncStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-teal-700 font-medium bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full">
                <RotateCw className="w-3 h-3 animate-spin text-teal-600" />
                <span>Menyimpan ke akun...</span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full" title="Daftar tamu tersimpan aman di akun Anda (bahkan saat logout & login lagi)">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tersimpan di akun {userEmail ? `(${userEmail})` : ''}</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Tersimpan di browser (offline)</span>
              </span>
            )}
          </div>
        </div>

        {/* Aksi Sekunder: Template Pesan, Salin Semua, Pengaturan Tautan */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchExistingRsvps}
            className="p-2 rounded-xl bg-[#fffdfa] border border-[#ded4be] text-[#52717b] hover:text-[#0e2c34] hover:bg-[#f0ebd9] transition shadow-xs"
            title="Segarkan status konfirmasi tamu"
          >
            <RotateCw className={`w-4 h-4 ${loadingRsvps ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0e2c34] bg-[#f0ebd9] hover:bg-[#e7e0cc] border border-[#ded4be] transition shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#0f3b47]" />
            <span>Template Pesan</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAllLinks}
            disabled={guests.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0e2c34] bg-[#f0ebd9] hover:bg-[#e7e0cc] border border-[#ded4be] disabled:opacity-40 transition shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-[#0f3b47]" />
            <span>Salin Semua Tautan</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-[#fffdfa] border border-[#ded4be] text-[#52717b] hover:text-[#0e2c34] hover:bg-[#f0ebd9] transition shadow-xs"
            title="Pengaturan Format & Base URL"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Alur 3 Langkah (Friendly Process Indicator) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Langkah 1 */}
        <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 shadow-xs flex items-start gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
          <div className="w-8 h-8 rounded-full bg-[#0f3b47] text-white flex items-center justify-center font-bold text-sm shrink-0">
            1
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#0e2c34] block">1. Tempel Nama Tamu</span>
            <p className="text-[11px] text-[#52717b] leading-relaxed">
              Ketik nama dan nomor HP, atau tempel daftar massal dari WhatsApp / Excel.
            </p>
          </div>
        </div>

        {/* Langkah 2 */}
        <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 shadow-xs flex items-start gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
          <div className="w-8 h-8 rounded-full bg-[#0f3b47] text-white flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#0e2c34] block">2. Cek Tautan Personal</span>
            <p className="text-[11px] text-[#52717b] leading-relaxed">
              Tautan unik dengan nama tamu dibuat otomatis secara rapi.
            </p>
          </div>
        </div>

        {/* Langkah 3 */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-start gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            3
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-emerald-950 block">3. Kirim via WhatsApp</span>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Klik tombol hijau WhatsApp untuk membuka chat dengan template pesan terisi!
            </p>
          </div>
        </div>
      </div>

      {/* LANGKAH 1: Tempel / Input Nama Tamu */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee5d4] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#0e2c34] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0f3b47] text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>Tempel & Tambah Nama Tamu</span>
            </h2>
            <p className="text-xs text-[#52717b]">
              Masukkan tamu satu per satu atau gunakan fitur import massal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#0e2c34] bg-[#f0ebd9] hover:bg-[#e6deca] border border-[#ded4be] transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#0f3b47]" />
              <span>+ Form Lengkap</span>
            </button>

            <button
              type="button"
              onClick={handleOpenBatchModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e6deca] border border-[#ded4be] transition shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#0f3b47]" />
              <span>Tempel Banyak Sekaligus</span>
            </button>
          </div>
        </div>

        {/* Quick inline add form */}
        <form onSubmit={handleQuickAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Ketik Nama Tamu (contoh: Budi & Keluarga)"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
          </div>

          <div className="sm:col-span-4">
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#819ea7] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                placeholder="Nomor WA (contoh: 08123456789)"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={!quickName.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] disabled:opacity-40 transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Tamu</span>
            </button>
          </div>
        </form>
      </div>

      {/* LANGKAH 2: Cek & Atur Tautan Undangan */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee5d4] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#0e2c34] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0f3b47] text-white text-xs flex items-center justify-center font-bold">2</span>
              <span>Cek & Atur Tautan Undangan</span>
            </h2>
            <p className="text-xs text-[#52717b]">
              Masukkan link website undangan Anda agar tautan personal tamu terbentuk otomatis
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#52717b] font-medium hidden sm:inline">Format Tautan:</span>
            <div className="inline-flex rounded-xl border border-[#ded4be] p-0.5 bg-[#faf6ee] text-xs">
              <button
                type="button"
                onClick={() => setLinkFormat('random')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  linkFormat === 'random'
                    ? 'bg-[#0f3b47] text-white shadow-xs'
                    : 'text-[#52717b] hover:text-[#0e2c34]'
                }`}
              >
                Kode Acak (?c=...)
              </button>
              <button
                type="button"
                onClick={() => setLinkFormat('named')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  linkFormat === 'named'
                    ? 'bg-[#0f3b47] text-white shadow-xs'
                    : 'text-[#52717b] hover:text-[#0e2c34]'
                }`}
              >
                Nama (?to=...)
              </button>
            </div>
          </div>
        </div>

        {/* Kotak Link Undangan (Base URL) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[#0e2c34]">
              Link Undangan (Base URL)
            </label>
            {baseUrl.trim() && (
              <button
                type="button"
                onClick={() => handleBaseUrlChange('')}
                className="text-[11px] text-rose-700 hover:underline font-medium"
                title="Kosongkan link agar kembali ke arahan default"
              >
                Kosongkan
              </button>
            )}
          </div>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            onBlur={handleBaseUrlBlur}
            placeholder="masukkan link undangan anda (namapasangan.joyever.id)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs font-mono text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
          />
          <p className="text-[11px] text-[#52717b] leading-relaxed">
            Arahan: <span className="text-[#0e2c34] font-medium">masukkan link undangan anda (namapasangan.joyever.id)</span>
            {baseUrl.trim() ? (
              <span className="text-teal-800 font-semibold ml-2">✓ Tersimpan untuk akun ini</span>
            ) : (
              <span className="text-[#698892] ml-1">(Kotak dikosongkan secara default)</span>
            )}
          </p>
        </div>
      </div>

      {/* LANGKAH 3: Daftar Tamu & Kirim via WhatsApp */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eee5d4] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#0e2c34] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>Daftar Tamu & Kirim via WhatsApp</span>
            </h2>
            <p className="text-xs text-[#52717b]">
              Tombol WhatsApp di bawah siap dikirim langsung dengan satu klik
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-[#f0ebd9] rounded-xl border border-[#ded4be] font-bold text-[#0e2c34]">
              {totalGuests} Tamu ({withPhoneCount} ada No. WA, {rsvpedCount} sudah konfirmasi)
            </span>

            {guests.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllGuests}
                className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
                title="Kosongkan daftar tamu"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#73929c] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor WhatsApp..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#819ea7] hover:text-[#0e2c34]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#52717b] font-medium hidden sm:inline">Filter:</span>
            <select
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs text-[#0e2c34] font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            >
              <option value="all">Semua Tamu ({guests.length})</option>
              <option value="with_phone">Ada Nomor WA ({withPhoneCount})</option>
              <option value="no_phone">Belum Ada Nomor ({guests.length - withPhoneCount})</option>
            </select>
          </div>
        </div>

        {/* Daftar Tamu dengan Tombol WhatsApp sebagai Aksi Utama */}
        {filteredGuests.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-[#faf6ee] rounded-2xl border border-[#ded4be]">
            <Users className="w-10 h-10 text-[#85a1ab] mx-auto" />
            <h3 className="text-sm font-bold text-[#0e2c34]">Belum ada tamu di daftar ini</h3>
            <p className="text-xs text-[#52717b] max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ditemukan tamu dengan pencarian "${searchQuery}".`
                : 'Silakan ketik nama tamu di kotak langkah 1 di atas atau gunakan tombol Tempel Banyak Sekaligus.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGuests.map((guest) => {
              const isCopied = copiedId === guest.id;
              const hasPhone = !!normalizePhoneNumber(guest.phone);
              const waUrl = generateWhatsAppUrl(guest.name, guest.phone, guest.link);

              return (
                <div
                  key={guest.id}
                  className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] transition-all duration-200 hover:shadow-sm hover:border-[#cdbe9f] hover:bg-[#f6f0e2] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Info Tamu & Tautan */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#0e2c34] truncate">
                        {guest.name}
                      </span>

                      {hasPhone ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          <Phone className="w-3 h-3 text-teal-700" />
                          <span>{formatPhoneNumber(guest.phone)}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(guest)}
                          className="text-[10px] text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-medium transition"
                        >
                          + Isi Nomor WA
                        </button>
                      )}

                      {guest.isRsvped && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-300">
                          <CheckCircle2 className="w-3 h-3 text-teal-700" />
                          <span>Sudah Konfirmasi</span>
                        </span>
                      )}
                    </div>

                    {/* Preview Tautan Undangan */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-mono text-[#52717b] truncate max-w-sm sm:max-w-md bg-white/70 px-2 py-0.5 rounded border border-[#ded4be]"
                        title={guest.link}
                      >
                        {guest.link}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(guest.link, guest.id)}
                        className="p-1 rounded text-[#52717b] hover:text-[#0e2c34] hover:bg-[#f0ebd9] transition shrink-0"
                        title="Salin tautan ini"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* AKSI UTAMA: Tombol WhatsApp yang Menonjol */}
                  <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition"
                      title={
                        hasPhone
                          ? `Buka WhatsApp langsung ke ${formatPhoneNumber(guest.phone)}`
                          : 'Kirim via WhatsApp (Pilih kontak manual di WA)'
                      }
                    >
                      <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                      <span>Kirim via WhatsApp</span>
                      <Send className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    {/* Aksi Tambahan: Edit & Hapus */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(guest)}
                      className="p-2 rounded-xl bg-[#f0ebd9] hover:bg-[#e6deca] border border-[#ded4be] text-[#52717b] hover:text-[#0e2c34] transition"
                      title="Edit nama atau nomor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(guest.id, guest.name)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition"
                      title="Hapus tamu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Import Massal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0e2c34]">
                <Upload className="w-5 h-5 text-[#0f3b47]" />
                <h3 className="text-base font-bold text-[#0e2c34]">Tempel Daftar Tamu Sekaligus</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-[#6d8a93] hover:text-[#0e2c34] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#52717b] leading-relaxed">
              Salin dan tempel daftar tamu Anda di sini (satu baris per tamu). Format: <code className="text-[#0e2c34] font-bold">Nama, Nomor HP</code> atau cukup <code className="text-[#0e2c34] font-bold">Nama</code> saja jika belum ada nomor.
            </p>

            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`Budi Santoso, 081234567890\nSiti Aminah & Keluarga, 085712345678\nDr. Hendra Wijaya, 081987654321\nReza Fahlevi`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />

            <div className="bg-[#f0ebd9] border border-[#ded4be] rounded-2xl p-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 rounded border-[#ded4be] text-[#0f3b47] focus:ring-[#0f3b47]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0e2c34] block">
                    Gantikan seluruh daftar tamu yang ada saat ini
                  </span>
                  <span className="text-[11px] text-[#52717b] block leading-tight">
                    {replaceExisting
                      ? 'Daftar lama akan digantikan seluruhnya oleh teks baru ini.'
                      : 'Daftar baru akan ditambahkan ke tamu yang sudah ada.'}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#52717b]">
                {batchText.split('\n').filter((l) => l.trim()).length} baris terdeteksi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52717b] hover:bg-[#f0ebd9] transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportBatch}
                  disabled={!batchText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] disabled:opacity-40 transition shadow-xs"
                >
                  {replaceExisting ? 'Ganti Daftar' : 'Tambahkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Tamu */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0e2c34]">
                <UserPlus className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-[#0e2c34]">
                  {editingGuest ? 'Edit Data Tamu' : 'Tambah Tamu Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#6d8a93] hover:text-[#0e2c34] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveGuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0e2c34] mb-1.5">
                  Nama Tamu <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Contoh: Budi Santoso & Keluarga"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] text-xs placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0e2c34] mb-1.5">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#819ea7] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] text-xs placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                  />
                </div>
                <p className="text-[11px] text-[#52717b] mt-1.5 leading-relaxed">
                  Bisa diawali 08 atau 62. Tombol Kirim WhatsApp akan langsung mengarah ke nomor ini.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee5d4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52717b] hover:bg-[#f0ebd9] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs"
                >
                  {editingGuest ? 'Simpan Perubahan' : 'Tambah Tamu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Template Pesan WhatsApp */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0e2c34]">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-[#0e2c34]">Edit Template Pesan WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-[#6d8a93] hover:text-[#0e2c34] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#52717b] leading-relaxed">
              Gunakan tag <code className="text-[#0e2c34] font-mono font-bold">{"{nama}"}</code> untuk nama tamu, dan <code className="text-[#0e2c34] font-mono font-bold">{"{link}"}</code> untuk tautan undangan.
            </p>

            <textarea
              rows={8}
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-[#0e2c34] text-xs leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setWaTemplate(DEFAULT_WA_TEMPLATE);
                  showToast('Template dikembalikan ke teks awal', 'info');
                }}
                className="text-xs text-[#52717b] hover:text-[#0e2c34] font-medium underline"
              >
                Reset ke template awal
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(templateStorageKey, waTemplate);
                  saveWaTemplateToCloud(customer, waTemplate);
                  setShowTemplateModal(false);
                  showToast('Template pesan WhatsApp disimpan!', 'success');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs"
              >
                Simpan & Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Format & Base URL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdfa] border border-[#ded4be] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0e2c34]">
                <Sliders className="w-5 h-5 text-[#0f3b47]" />
                <h3 className="text-base font-bold text-[#0e2c34]">Pengaturan Tautan Undangan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-[#6d8a93] hover:text-[#0e2c34] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0e2c34] mb-1">
                  Base URL Undangan
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => handleBaseUrlChange(e.target.value)}
                  onBlur={handleBaseUrlBlur}
                  placeholder="masukkan link undangan anda (namapasangan.joyever.id)"
                  className="w-full px-3 py-2 rounded-xl bg-[#faf6ee] border border-[#ded4be] text-xs font-mono text-[#0e2c34] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                />
                <p className="text-[11px] text-[#52717b] mt-1 leading-relaxed">
                  Arahan: <span className="text-[#0e2c34] font-medium">masukkan link undangan anda (namapasangan.joyever.id)</span>
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#0e2c34] mb-1">
                  Format Parameter Tautan
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLinkFormat('random')}
                    className={`p-3 rounded-xl border text-left transition ${
                      linkFormat === 'random'
                        ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-xs'
                        : 'bg-[#faf6ee] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    <span className="font-bold block text-xs">Kode Acak (?c=...)</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Lebih rapi & aman</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkFormat('named')}
                    className={`p-3 rounded-xl border text-left transition ${
                      linkFormat === 'named'
                        ? 'bg-[#0f3b47] text-white border-[#0f3b47] shadow-xs'
                        : 'bg-[#faf6ee] text-[#0e2c34] border-[#ded4be] hover:bg-[#f0ebd9]'
                    }`}
                  >
                    <span className="font-bold block text-xs">Nama Terbuka (?to=...)</span>
                    <span className="text-[10px] opacity-80 block mt-0.5">Nama terlihat di URL</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#eee5d4]">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition"
              >
                Tutup & Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
