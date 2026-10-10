import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';

export interface InvitedGuest {
  id: string;
  name: string;
  phone: string;
  code?: string;
}

interface GuestLinksTabProps {
  customer: Customer;
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

// Muat Base URL yang tersimpan khusus untuk akun ini
export const loadStoredBaseUrl = (cust: Customer): string => {
  try {
    const fromId = localStorage.getItem(`base_url_${cust.id}`);
    if (fromId !== null && fromId !== undefined) {
      return fromId;
    }
    if (cust.slug) {
      const fromSlug = localStorage.getItem(`base_url_${cust.slug}`);
      if (fromSlug !== null && fromSlug !== undefined) {
        return fromSlug;
      }
    }
  } catch (e) {
    console.error('Error loading base url:', e);
  }
  return '';
};

// Simpan Base URL khusus untuk akun ini
export const saveBaseUrlForCustomer = (cust: Customer, url: string) => {
  try {
    localStorage.setItem(`base_url_${cust.id}`, url);
    if (cust.slug) {
      localStorage.setItem(`base_url_${cust.slug}`, url);
    }
  } catch (e) {
    console.error('Error saving base url:', e);
  }
};

// Muat daftar tamu yang tersimpan khusus untuk akun ini
export const loadStoredGuests = (cust: Customer): InvitedGuest[] => {
  try {
    const idKey = `guest_records_v2_${cust.id}`;
    const slugKey = cust.slug ? `guest_records_v2_${cust.slug}` : null;
    const legacyKey = `guest_names_${cust.id}`;
    const legacySlugKey = cust.slug ? `guest_names_${cust.slug}` : null;

    const saved = localStorage.getItem(idKey) || (slugKey ? localStorage.getItem(slugKey) : null);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // Cek format nama legasi jika ada
    const legacy = localStorage.getItem(legacyKey) || (legacySlugKey ? localStorage.getItem(legacySlugKey) : null);
    if (legacy) {
      const lines = legacy.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        return lines.map((line, idx) => {
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
          }
          return {
            id: `legacy-${idx}-${Date.now()}`,
            name,
            phone,
          };
        });
      }
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

// Simpan daftar tamu khusus untuk akun ini
export const saveGuestsForCustomer = (cust: Customer, guestList: InvitedGuest[]) => {
  try {
    const idKey = `guest_records_v2_${cust.id}`;
    const legacyIdKey = `guest_names_${cust.id}`;
    localStorage.setItem(idKey, JSON.stringify(guestList));
    const namesOnly = guestList.map((g) => (g.phone ? `${g.name}, ${g.phone}` : g.name)).join('\n');
    localStorage.setItem(legacyIdKey, namesOnly);

    if (cust.slug) {
      localStorage.setItem(`guest_records_v2_${cust.slug}`, JSON.stringify(guestList));
      localStorage.setItem(`guest_names_${cust.slug}`, namesOnly);
    }
  } catch (e) {
    console.error('Error saving guests:', e);
  }
};

export const GuestLinksTab: React.FC<GuestLinksTabProps> = ({ customer }) => {
  const codesStorageKey = `guest_codes_${customer.id}`;
  const templateStorageKey = `wa_template_${customer.id}`;
  const linkFormatStorageKey = `link_format_${customer.id}`;

  const previewBaseUrl = getBaseUrlPreviewFormat(customer);

  // Initial guest list loader tersimpan per akun
  const [guests, setGuests] = useState<InvitedGuest[]>(() => loadStoredGuests(customer));

  // Base URL text box
  const [baseUrl, setBaseUrl] = useState<string>(() => loadStoredBaseUrl(customer));

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

  // Sinkronisasi ulang data saat customer berubah
  useEffect(() => {
    setGuests(loadStoredGuests(customer));
    setBaseUrl(loadStoredBaseUrl(customer));
    setWaTemplate(localStorage.getItem(`wa_template_${customer.id}`) || DEFAULT_WA_TEMPLATE);
  }, [customer.id, customer.slug]);

  // Sync Guests to LocalStorage khusus akun ini
  useEffect(() => {
    saveGuestsForCustomer(customer, guests);
  }, [customer, guests]);

  const handleBaseUrlChange = (val: string) => {
    setBaseUrl(val);
    saveBaseUrlForCustomer(customer, val);
  };

  useEffect(() => {
    localStorage.setItem(templateStorageKey, waTemplate);
  }, [templateStorageKey, waTemplate]);

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
    setGuests(nextList);
    saveGuestsForCustomer(customer, nextList);
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

    setGuests(nextList);
    saveGuestsForCustomer(customer, nextList);
    setShowAddModal(false);
  };

  const handleDeleteGuest = (id: string, name: string) => {
    if (window.confirm(`Hapus "${name}" dari daftar tamu?`)) {
      const nextList = guests.filter((g) => g.id !== id);
      setGuests(nextList);
      saveGuestsForCustomer(customer, nextList);
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
      setGuests([]);
      saveGuestsForCustomer(customer, []);
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

    setGuests(nextList);
    saveGuestsForCustomer(customer, nextList);
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
          <p className="text-xs text-[#52717b] mt-0.5">
            Alur praktis 3 langkah untuk mengundang tamu secara personal
          </p>
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
        <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 shadow-xs flex items-start gap-3">
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
        <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 shadow-xs flex items-start gap-3">
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
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs flex items-start gap-3">
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
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
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
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
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
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
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
                  className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] hover:border-[#cbbea7] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
