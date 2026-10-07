import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { encodeGuestCode } from '../lib/guestCode';
import { normalizePhoneNumber, formatPhoneNumber } from '../lib/format';
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
  ClipboardList,
  Key,
  Search,
  Upload,
  X,
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

export const GuestLinksTab: React.FC<GuestLinksTabProps> = ({ customer }) => {
  const guestsStorageKey = `guest_records_v2_${customer.id}`;
  const namesOldStorageKey = `guest_names_${customer.id}`;
  const codesStorageKey = `guest_codes_${customer.id}`;
  const baseUrlStorageKey = `base_url_${customer.id}`;
  const templateStorageKey = `wa_template_${customer.id}`;
  const linkFormatStorageKey = `link_format_${customer.id}`;

  const defaultBaseUrl = customer.slug === 'alfredo-yana'
    ? 'https://alfredo-yana.vercel.app'
    : (typeof window !== 'undefined'
      ? `${window.location.origin}/${customer.slug}`
      : `https://undangan.com/${customer.slug}`);

  // Initial guest list loader with backward compatibility
  const [guests, setGuests] = useState<InvitedGuest[]>(() => {
    try {
      const savedV2 = localStorage.getItem(guestsStorageKey);
      if (savedV2) {
        return JSON.parse(savedV2);
      }

      // Check legacy names string
      const legacyNames = localStorage.getItem(namesOldStorageKey);
      if (legacyNames) {
        const lines = legacyNames
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        return lines.map((line, idx) => {
          // Check if formatted like "Nama, 0812345678" or "Nama - 0812345678"
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
    } catch (e) {
      console.error('Error loading guests:', e);
    }

    // Default sample list if nothing exists
    return [
      { id: '1', name: 'Budi Santoso', phone: '081234567890' },
      { id: '2', name: 'Siti Aminah & Keluarga', phone: '085712345678' },
      { id: '3', name: 'Dr. Hendra Wijaya', phone: '081987654321' },
      { id: '4', name: 'Reza Fahlevi', phone: '' },
    ];
  });

  const [baseUrl, setBaseUrl] = useState<string>(() => {
    return localStorage.getItem(baseUrlStorageKey) || defaultBaseUrl;
  });

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
  const [editingGuest, setEditingGuest] = useState<InvitedGuest | null>(null);

  // Form Fields for Add / Edit
  const [inputName, setInputName] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Batch Import Text
  const [batchText, setBatchText] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPhone, setFilterPhone] = useState<'all' | 'with_phone' | 'no_phone'>('all');

  // RSVP Status Check
  const [existingRsvps, setExistingRsvps] = useState<Rsvp[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Sync Guests to LocalStorage
  useEffect(() => {
    localStorage.setItem(guestsStorageKey, JSON.stringify(guests));
    // Also save plain names string for legacy compatibility
    const namesOnly = guests.map((g) => g.phone ? `${g.name}, ${g.phone}` : g.name).join('\n');
    localStorage.setItem(namesOldStorageKey, namesOnly);
  }, [guestsStorageKey, namesOldStorageKey, guests]);

  useEffect(() => {
    localStorage.setItem(baseUrlStorageKey, baseUrl);
  }, [baseUrlStorageKey, baseUrl]);

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
    // Load saved codes
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

    const cleanBase = baseUrl.trim().replace(/\/+$/, '');

    return guests.map((guest) => {
      const code = currentCodes[guest.name] || encodeGuestCode(guest.name);
      const separator = cleanBase.includes('?') ? '&' : '?';

      const link =
        linkFormat === 'random'
          ? `${cleanBase}${separator}c=${code}`
          : `${cleanBase}${separator}to=${encodeURIComponent(guest.name).replace(/%20/g, '+')}`;

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
  }, [guests, baseUrl, existingRsvps, linkFormat, codesStorageKey]);

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
  const percentage = totalGuests > 0 ? ((rsvpedCount / totalGuests) * 100).toFixed(1) : '0';

  // Clipboard Helpers
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
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
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
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
    // Fallback if no phone number: open WhatsApp with recipient picker
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Add / Edit Handlers
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

    if (editingGuest) {
      // Update existing
      setGuests((prev) =>
        prev.map((g) =>
          g.id === editingGuest.id
            ? { ...g, name: trimmedName, phone: inputPhone.trim() }
            : g
        )
      );
    } else {
      // Create new
      const newGuest: InvitedGuest = {
        id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        phone: inputPhone.trim(),
      };
      setGuests((prev) => [newGuest, ...prev]);
    }

    setShowAddModal(false);
  };

  const handleDeleteGuest = (id: string, name: string) => {
    if (window.confirm(`Hapus "${name}" dari daftar tamu?`)) {
      setGuests((prev) => prev.filter((g) => g.id !== id));
    }
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
      }

      return {
        id: `batch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        phone,
      };
    });

    setGuests((prev) => [...prev, ...imported]);
    setBatchText('');
    setShowBatchModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3b47] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0f3b47]" />
            <span>Kelola Tamu & Kirim WhatsApp</span>
          </h1>
          <p className="text-xs text-[#5e7d87]">
            Tambahkan tamu beserta nomornya untuk mengirim tautan personal langsung ke WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchExistingRsvps}
            className="p-2 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-[#345863] hover:text-[#0f3b47] hover:bg-[#f3eedf] transition shadow-xs"
            title="Segarkan data status RSVP"
          >
            <RotateCw className={`w-4 h-4 ${loadingRsvps ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] border border-[#d8cdb8] transition shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#0f3b47]" />
            <span>Template WA</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] border border-[#d8cdb8] transition shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#0f3b47]" />
            <span>Import Massal</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-emerald-300" />
            <span>+ Tambah Tamu</span>
          </button>
        </div>
      </div>

      {/* Progress & Counter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Tamu */}
        <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#f0ebd9] border border-[#d8cdb8] text-[#0f3b47]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#5e7d87] block font-medium">Total Tamu Diundang:</span>
            <span className="text-lg font-bold text-[#0f3b47]">{totalGuests} Tamu</span>
          </div>
        </div>

        {/* Nomor WhatsApp Terisi */}
        <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#5e7d87] block font-medium">Nomor WhatsApp Terdata:</span>
            <span className="text-lg font-bold text-emerald-800">
              {withPhoneCount} <span className="text-xs font-normal text-[#5e7d87]">({totalGuests > 0 ? ((withPhoneCount / totalGuests) * 100).toFixed(0) : 0}%)</span>
            </span>
          </div>
        </div>

        {/* Sudah RSVP */}
        <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#f0ebd9] border border-[#d8cdb8] text-[#0f3b47]">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[#5e7d87] block font-medium">Konfirmasi RSVP:</span>
            <span className="text-lg font-bold text-[#0f3b47]">
              {rsvpedCount} <span className="text-xs font-normal text-[#5e7d87]">sudah mengisi ({percentage}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Settings Row: Base URL & Format Option */}
      <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <label className="block text-[11px] font-bold text-[#1f404b] mb-1">
            Base URL Undangan
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://undangan.com/nama-pasangan"
            className="w-full px-3 py-1.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-[11px] text-[#6e8a93] font-medium block mb-1">Format Tautan:</span>
            <div className="inline-flex rounded-lg border border-[#d8cdb8] p-0.5 bg-[#f0ebd9] text-xs">
              <button
                type="button"
                onClick={() => setLinkFormat('random')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  linkFormat === 'random'
                    ? 'bg-[#0f3b47] text-white shadow-xs'
                    : 'text-[#345863] hover:text-[#0f3b47]'
                }`}
              >
                Kode Acak (?c=...)
              </button>
              <button
                type="button"
                onClick={() => setLinkFormat('named')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  linkFormat === 'named'
                    ? 'bg-[#0f3b47] text-white shadow-xs'
                    : 'text-[#345863] hover:text-[#0f3b47]'
                }`}
              >
                Nama (?to=...)
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleCopyAllLinks}
              disabled={guests.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#0f3b47] bg-[#f0ebd9] hover:bg-[#e7e0cc] border border-[#d8cdb8] disabled:opacity-40 transition shadow-xs"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Tersalin!' : 'Salin Semua Tautan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#73929c] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor WhatsApp..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-xs text-[#0f3b47] placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#819ea7] hover:text-[#0f3b47]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5e7d87] font-medium hidden sm:inline">Filter:</span>
          <select
            value={filterPhone}
            onChange={(e) => setFilterPhone(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#fffdf9] border border-[#d8cdb8] text-xs text-[#0f3b47] font-medium focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
          >
            <option value="all">Semua Tamu ({guests.length})</option>
            <option value="with_phone">Ada Nomor WhatsApp ({withPhoneCount})</option>
            <option value="no_phone">Belum Ada Nomor ({guests.length - withPhoneCount})</option>
          </select>
        </div>
      </div>

      {/* Main Guests Table & Cards */}
      {filteredGuests.length === 0 ? (
        <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <Users className="w-10 h-10 text-[#85a1ab] mx-auto" />
          <h3 className="text-sm font-bold text-[#0f3b47]">Belum ada data tamu yang cocok</h3>
          <p className="text-xs text-[#5e7d87] max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ditemukan tamu dengan kata kunci "${searchQuery}".`
              : 'Daftar tamu masih kosong. Klik tombol "+ Tambah Tamu" di atas untuk menambahkan tamu beserta nomornya.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs mt-2"
          >
            <UserPlus className="w-4 h-4 text-emerald-300" />
            <span>Tambah Tamu Pertama</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#fffdf9] border border-[#e3dac8] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f5eedf] text-[#345761] font-bold border-b border-[#e3dac8]">
                <tr>
                  <th className="py-3 px-4">Nama Tamu</th>
                  <th className="py-3 px-4">Nomor WhatsApp</th>
                  <th className="py-3 px-4">Kode Acak</th>
                  <th className="py-3 px-4">Status RSVP</th>
                  <th className="py-3 px-4">Tautan Personal</th>
                  <th className="py-3 px-4 text-right">Kirim & Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee5d4]">
                {filteredGuests.map((guest) => {
                  const isCopied = copiedId === guest.id;
                  const hasPhone = !!normalizePhoneNumber(guest.phone);
                  const waUrl = generateWhatsAppUrl(guest.name, guest.phone, guest.link);

                  return (
                    <tr key={guest.id} className="hover:bg-[#f8f3e9] transition">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-[#0f3b47] max-w-[160px] truncate">
                        {guest.name}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasPhone ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#134957]">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{formatPhoneNumber(guest.phone)}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(guest)}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition"
                            title="Klik untuk menambahkan nomor telepon"
                          >
                            <span>+ Isi Nomor</span>
                          </button>
                        )}
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-[#f0ebd9] text-[#0f3b47] px-2 py-0.5 rounded-md border border-[#d8cdb8]">
                          <Key className="w-2.5 h-2.5 text-[#5e7d87]" />
                          {guest.code ? `${guest.code.slice(0, 10)}...` : '-'}
                        </span>
                      </td>

                      {/* RSVP Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {guest.isRsvped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Sudah RSVP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0ebd9] text-[#688691] border border-[#d8cdb8]">
                            Belum
                          </span>
                        )}
                      </td>

                      {/* Link Preview & Copy */}
                      <td className="py-3.5 px-4 max-w-[170px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-[#4e6e78] truncate block" title={guest.link}>
                            {guest.link}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(guest.link, guest.id)}
                            className={`p-1 rounded-md border shrink-0 transition ${
                              isCopied
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                : 'bg-[#f0ebd9] border-[#d8cdb8] text-[#2c4e58] hover:text-[#0f3b47] hover:bg-[#e6dfcb]'
                            }`}
                            title="Salin tautan personal"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        {/* WhatsApp Button (Directs to phone if available) */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition shadow-xs ${
                            hasPhone
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                          title={
                            hasPhone
                              ? `Buka chat WhatsApp langsung ke ${formatPhoneNumber(guest.phone)}`
                              : 'Kirim via WhatsApp (Pilih kontak manual)'
                          }
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Kirim WA</span>
                        </a>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(guest)}
                          className="p-1.5 rounded-lg border bg-[#f0ebd9] border-[#d8cdb8] text-[#2c4e58] hover:text-[#0f3b47] hover:bg-[#e6dfcb] transition"
                          title="Edit nama atau nomor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteGuest(guest.id, guest.name)}
                          className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 transition"
                          title="Hapus tamu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredGuests.map((guest) => {
              const isCopied = copiedId === guest.id;
              const hasPhone = !!normalizePhoneNumber(guest.phone);
              const waUrl = generateWhatsAppUrl(guest.name, guest.phone, guest.link);

              return (
                <div
                  key={guest.id}
                  className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0f3b47]">{guest.name}</h4>
                      {hasPhone ? (
                        <p className="text-xs font-mono text-emerald-800 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{formatPhoneNumber(guest.phone)}</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(guest)}
                          className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1"
                        >
                          + Tambah Nomor WA
                        </button>
                      )}
                    </div>

                    {guest.isRsvped ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        Sudah RSVP
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0ebd9] text-[#688691] border border-[#d8cdb8] shrink-0">
                        Belum RSVP
                      </span>
                    )}
                  </div>

                  {/* Link Preview */}
                  <div className="text-[11px] font-mono text-[#4e6e78] bg-[#faf6ee] p-2 rounded-xl truncate border border-[#e3dac8]">
                    {guest.link}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f0ebd9]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(guest)}
                        className="p-1.5 rounded-lg border bg-[#f0ebd9] border-[#d8cdb8] text-[#2c4e58] text-xs"
                        title="Edit data tamu"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGuest(guest.id, guest.name)}
                        className="p-1.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 text-xs"
                        title="Hapus tamu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(guest.link, guest.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f0ebd9] text-[#0f3b47] text-xs font-bold hover:bg-[#e6dfcb] border border-[#d8cdb8]"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs ${
                          hasPhone
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Tambah / Edit Tamu */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0f3b47]">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-[#0f3b47]">
                  {editingGuest ? 'Edit Data Tamu' : 'Tambah Tamu Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#6d8a93] hover:text-[#0f3b47] text-sm p-1"
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
                <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
                  Nama Tamu <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Contoh: Budi Santoso & Keluarga"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#819ea7] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs placeholder-[#819ea7] focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
                  />
                </div>
                <p className="text-[11px] text-[#5e7d87] mt-1.5 leading-relaxed">
                  Bisa diawali 08, 62, atau +62. Tombol Kirim WA akan otomatis mengarah langsung ke nomor ini.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#eee5d4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#486b75] hover:bg-[#f0ebd9] transition"
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

      {/* Modal Import Massal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0f3b47]">
                <Upload className="w-5 h-5 text-[#0f3b47]" />
                <h3 className="text-base font-bold text-[#0f3b47]">Import Daftar Tamu Sekaligus</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-[#6d8a93] hover:text-[#0f3b47] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5e7d87] leading-relaxed">
              Masukkan satu tamu per baris dengan format: <code className="text-[#0f3b47] font-bold">Nama, Nomor HP</code> atau cukup <code className="text-[#0f3b47] font-bold">Nama</code> saja jika belum ada nomor.
            </p>

            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`Budi Santoso, 081234567890\nSiti Aminah & Keluarga, 085712345678\nDr. Hendra Wijaya, 081987654321\nReza Fahlevi`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#5e7d87]">
                {batchText.split('\n').filter((l) => l.trim()).length} baris terdeteksi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#486b75] hover:bg-[#f0ebd9] transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportBatch}
                  disabled={!batchText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] disabled:opacity-40 transition shadow-xs"
                >
                  Tambahkan ke Daftar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Template Editor Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-3xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
              <div className="flex items-center gap-2 text-[#0f3b47]">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-[#0f3b47]">Edit Template Pesan WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="text-[#6d8a93] hover:text-[#0f3b47] text-sm p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5e7d87] leading-relaxed">
              Gunakan tag <code className="text-[#0f3b47] font-mono font-bold">{"{nama}"}</code> untuk nama tamu, dan <code className="text-[#0f3b47] font-mono font-bold">{"{link}"}</code> untuk tautan undangan khusus.
            </p>

            <textarea
              rows={8}
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] text-xs leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setWaTemplate(DEFAULT_WA_TEMPLATE)}
                className="text-xs text-[#62818c] hover:text-[#0f3b47] font-medium"
              >
                Reset ke template awal
              </button>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs"
              >
                Simpan & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
