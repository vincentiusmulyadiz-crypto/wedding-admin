import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Customer } from '../types/database';
import { encodeGuestCode } from '../lib/guestCode';
import { formatDateIndonesian } from '../lib/format';
import { exportToCsv } from '../lib/csv';
import {
  Send,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Square,
  Search,
  Download,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
  Info,
  UserCheck,
  X,
} from 'lucide-react';

export interface BlastContact {
  id: string;
  name: string;
  phone: string; // Sanitized, e.g. 628123456789
  code: string;  // Unique random code
  status: 'pending' | 'sent';
  sentAt?: string; // Formatted time
}

interface WaBlastTabProps {
  customer: Customer;
}

export function normalizeIndonesianPhone(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '628' + cleaned.slice(1);
  }
  return cleaned;
}

const TEMPLATE_PRESETS = [
  {
    name: 'Formal & Santun',
    text: `Kepada Yth. {nama},

Tanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami ({pengantin}) yang akan diselenggarakan pada {acara}.

Informasi lengkap serta konfirmasi kehadiran (RSVP) dapat diakses melalui tautan undangan berikut:
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.
Hormat kami,
{pengantin}`,
  },
  {
    name: 'Elegan & Hangat',
    text: `Halo {nama}! ✨

Dengan penuh rasa syukur dan bahagia, kami bermaksud membagikan kabar bahagia pernikahan kami:

💍 {pengantin}
🗓 {acara}

Silakan buka undangan digital kamu pada link personal berikut:
{link}

Doa restu dan kehadiranmu akan sangat berarti bagi momen bahagia kami. Sampai jumpa di hari bahagia kami! ❤️`,
  },
  {
    name: 'Singkat & Praktis',
    text: `Yth. {nama},

Berikut kami kirimkan undangan pernikahan {pengantin}:
{link}

Mohon doa restu dan konfirmasi kehadiran melalui tautan di atas. Terima kasih! 🙏`,
  },
];

export const WaBlastTab: React.FC<WaBlastTabProps> = ({ customer }) => {
  const contactsKey = `wablast_contacts_${customer.id}`;
  const templateKey = `wablast_template_${customer.id}`;
  const baseUrlKey = `wablast_baseurl_${customer.id}`;
  const delayKey = `wablast_delay_${customer.id}`;

  const defaultBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${customer.slug}`
    : `https://undangan.com/${customer.slug}`;

  // State
  const [contacts, setContacts] = useState<BlastContact[]>(() => {
    try {
      const saved = localStorage.getItem(contactsKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: '1',
        name: 'Budi Santoso',
        phone: '6281234567890',
        code: encodeGuestCode('Budi Santoso'),
        status: 'pending',
      },
      {
        id: '2',
        name: 'Siti Aminah & Partner',
        phone: '6285712345678',
        code: encodeGuestCode('Siti Aminah & Partner'),
        status: 'pending',
      },
    ];
  });

  const [messageTemplate, setMessageTemplate] = useState<string>(() => {
    return localStorage.getItem(templateKey) || TEMPLATE_PRESETS[0].text;
  });

  const [baseUrl, setBaseUrl] = useState<string>(() => {
    return localStorage.getItem(baseUrlKey) || defaultBaseUrl;
  });

  const [blastDelay, setBlastDelay] = useState<number>(() => {
    const d = localStorage.getItem(delayKey);
    return d ? parseInt(d, 10) : 4;
  });

  // Manual Add Form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Bulk Import Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');

  // Filter & Search
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'sent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-Blast Engine State
  const [isBlasting, setIsBlasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentBlastIndex, setCurrentBlastIndex] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const blastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preview Selected Contact
  const [previewContactId, setPreviewContactId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(contactsKey, JSON.stringify(contacts));
    } catch (e) {
      console.error(e);
    }
  }, [contacts, contactsKey]);

  useEffect(() => {
    localStorage.setItem(templateKey, messageTemplate);
  }, [messageTemplate, templateKey]);

  useEffect(() => {
    localStorage.setItem(baseUrlKey, baseUrl);
  }, [baseUrl, baseUrlKey]);

  useEffect(() => {
    localStorage.setItem(delayKey, blastDelay.toString());
  }, [blastDelay, delayKey]);

  // Generate personal link for a contact
  const getPersonalLink = (contact: BlastContact) => {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}?c=${encodeURIComponent(contact.code)}`;
  };

  // Compile final message text
  const compileMessage = (contact: BlastContact) => {
    const link = getPersonalLink(contact);
    const eventDateFormatted = formatDateIndonesian(customer.event_date);

    return messageTemplate
      .replace(/{nama}/g, contact.name)
      .replace(/{link}/g, link)
      .replace(/{pengantin}/g, customer.couple_names || 'Pengantin')
      .replace(/{acara}/g, eventDateFormatted);
  };

  // Generate WA send URL
  const getWhatsAppUrl = (contact: BlastContact) => {
    const text = compileMessage(contact);
    return `https://wa.me/${contact.phone}?text=${encodeURIComponent(text)}`;
  };

  // Add single contact
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const cleanedPhone = normalizeIndonesianPhone(newPhone);
    if (cleanedPhone.length < 9) {
      alert('Nomor WhatsApp tidak valid (minimal 9 digit). Format: 08xxx atau 628xxx');
      return;
    }

    const newContact: BlastContact = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      name: newName.trim(),
      phone: cleanedPhone,
      code: encodeGuestCode(newName.trim()),
      status: 'pending',
    };

    setContacts((prev) => [newContact, ...prev]);
    setNewName('');
    setNewPhone('');
  };

  // Bulk Import parser
  const handleBulkImport = () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText.split(/\r?\n/);
    const imported: BlastContact[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Match delimiter: tab, comma, semicolon, or vertical pipe
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes('|')) {
        parts = line.split('|');
      } else {
        // Maybe split by last sequence of digits
        const match = line.match(/^(.*?)[\s]+([0-9+()\- ]{8,})$/);
        if (match) {
          parts = [match[1], match[2]];
        }
      }

      if (parts.length >= 2) {
        const name = parts[0].trim();
        const rawPhone = parts[1].trim();
        const cleaned = normalizeIndonesianPhone(rawPhone);

        if (name && cleaned.length >= 9) {
          imported.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            name,
            phone: cleaned,
            code: encodeGuestCode(name),
            status: 'pending',
          });
        }
      }
    }

    if (imported.length === 0) {
      alert('Tidak ada kontak valid yang ditemukan. Pastikan format: Nama, Nomor WA (per baris).');
      return;
    }

    setContacts((prev) => [...prev, ...imported]);
    setBulkInputText('');
    setShowBulkModal(false);
  };

  // Import from existing names in GuestLinksTab
  const handleImportFromGuestNames = () => {
    try {
      const raw = localStorage.getItem(`guest_names_${customer.id}`);
      if (!raw) {
        alert('Belum ada data tamu di tab "Tautan Tamu".');
        return;
      }
      const names = raw.split(/\r?\n/).map((n) => n.trim()).filter(Boolean);
      if (names.length === 0) {
        alert('Daftar tamu di tab "Tautan Tamu" kosong.');
        return;
      }

      const existingNames = new Set(contacts.map((c) => c.name.toLowerCase()));
      const newItems: BlastContact[] = [];

      for (const name of names) {
        if (!existingNames.has(name.toLowerCase())) {
          newItems.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            name,
            phone: '', // Need customer to enter phone
            code: encodeGuestCode(name),
            status: 'pending',
          });
        }
      }

      if (newItems.length === 0) {
        alert('Semua nama dari tab Tautan Tamu sudah ada di daftar WA Blast.');
        return;
      }

      setContacts((prev) => [...prev, ...newItems]);
      alert(`Berhasil menambahkan ${newItems.length} tamu. Jangan lupa lengkapi nomor WhatsApp-nya.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Mark single contact as sent and open WhatsApp
  const handleSendSingle = (contact: BlastContact) => {
    if (!contact.phone || contact.phone.length < 9) {
      alert(`Nomor WhatsApp untuk ${contact.name} belum lengkap atau tidak valid.`);
      return;
    }

    const waUrl = getWhatsAppUrl(contact);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Mark as sent
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, status: 'sent', sentAt: timeStr } : c))
    );
  };

  // Auto-Blast Engine
  useEffect(() => {
    if (!isBlasting || isPaused) {
      if (blastTimerRef.current) clearTimeout(blastTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    // Find next pending contact with valid phone
    const pendingContacts = contacts.filter((c) => c.status === 'pending' && c.phone && c.phone.length >= 9);

    if (pendingContacts.length === 0) {
      // Completed blast!
      setIsBlasting(false);
      setCurrentBlastIndex(null);
      alert('🎉 Selesai! Semua kontak dalam antrean telah diproses.');
      return;
    }

    const nextContact = pendingContacts[0];
    setCurrentBlastIndex(contacts.findIndex((c) => c.id === nextContact.id));
    setCountdown(blastDelay);

    // Countdown interval
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : 1));
    }, 1000);

    // Timeout to trigger opening next WhatsApp
    blastTimerRef.current = setTimeout(() => {
      const waUrl = getWhatsAppUrl(nextContact);
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setContacts((prev) =>
        prev.map((c) => (c.id === nextContact.id ? { ...c, status: 'sent', sentAt: timeStr } : c))
      );

      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }, blastDelay * 1000);

    return () => {
      if (blastTimerRef.current) clearTimeout(blastTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isBlasting, isPaused, contacts, blastDelay]);

  // Stop Auto-Blast
  const handleStopBlast = () => {
    setIsBlasting(false);
    setIsPaused(false);
    setCurrentBlastIndex(null);
    if (blastTimerRef.current) clearTimeout(blastTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Reset status all to pending
  const handleResetStatus = () => {
    if (window.confirm('Reset status pengiriman semua kontak kembali ke "Belum Dikirim"?')) {
      setContacts((prev) => prev.map((c) => ({ ...c, status: 'pending', sentAt: undefined })));
    }
  };

  // Delete contact
  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (previewContactId === id) setPreviewContactId(null);
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm('Hapus seluruh daftar kontak WA Blast? Tindakan ini tidak dapat dibatalkan.')) {
      setContacts([]);
      setPreviewContactId(null);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Nama Tamu', 'No WhatsApp', 'Tautan Undangan', 'Status', 'Waktu Kirim'];
    const rows = contacts.map((c) => [
      c.name,
      c.phone,
      getPersonalLink(c),
      c.status === 'sent' ? 'Sudah Terkirim' : 'Belum Dikirim',
      c.sentAt || '-',
    ]);
    exportToCsv(`WA_Blast_${customer.slug}_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Inline edit phone
  const handlePhoneChange = (id: string, value: string) => {
    const cleaned = normalizeIndonesianPhone(value);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, phone: cleaned } : c)));
  };

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchFilter =
        filterStatus === 'all'
          ? true
          : filterStatus === 'sent'
          ? c.status === 'sent'
          : c.status === 'pending';

      const matchQuery =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);

      return matchFilter && matchQuery;
    });
  }, [contacts, filterStatus, searchQuery]);

  // Statistics
  const totalCount = contacts.length;
  const sentCount = contacts.filter((c) => c.status === 'sent').length;
  const pendingCount = totalCount - sentCount;
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  // Contact for live preview
  const activePreviewContact = useMemo(() => {
    if (previewContactId) {
      const found = contacts.find((c) => c.id === previewContactId);
      if (found) return found;
    }
    return contacts[0] || {
      id: 'demo',
      name: 'Budi Santoso',
      phone: '6281234567890',
      code: 'demo123',
      status: 'pending',
    };
  }, [previewContactId, contacts]);

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-[#fffef8] rounded-2xl border border-[#ded3bd] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eee3cd] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Send className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#0f3b47]">WhatsApp Broadcast & Blast</h2>
                <p className="text-xs text-[#52717b]">
                  Kirim pesan undangan digital personal beserta tautan ber-kode acak ke daftar WhatsApp tamu
                </p>
              </div>
            </div>
          </div>

          {/* Action Stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-center px-3 py-1.5 bg-[#f5eedf] rounded-xl border border-[#e5d9c2]">
              <div className="text-xs text-[#52717b]">Total Tamu</div>
              <div className="text-base font-bold text-[#0f3b47]">{totalCount}</div>
            </div>
            <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-700">Terkirim</div>
              <div className="text-base font-bold text-emerald-800">{sentCount}</div>
            </div>
            <div className="text-center px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-700">Belum Kirim</div>
              <div className="text-base font-bold text-amber-800">{pendingCount}</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-4">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-medium text-[#355863]">
              Progres Pengiriman: {sentCount} dari {totalCount} tamu ({progressPercent}%)
            </span>
            {isBlasting && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                {isPaused ? 'Blast Dijeda' : `Mengirim antrean berikutnya dalam ${countdown} detik...`}
              </span>
            )}
          </div>
          <div className="w-full h-2.5 bg-[#eee3cd] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Engine Controls Bar */}
        <div className="mt-4 pt-4 border-t border-[#eee3cd] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isBlasting ? (
              <button
                type="button"
                onClick={() => {
                  if (pendingCount === 0) {
                    alert('Semua kontak sudah berstatus terkirim. Klik "Reset Status" untuk mengirim ulang.');
                    return;
                  }
                  setIsBlasting(true);
                  setIsPaused(false);
                }}
                disabled={totalCount === 0 || pendingCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow transition disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Blast Otomatis</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow transition ${
                    isPaused ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Lanjutkan Blast' : 'Jeda (Pause)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopBlast}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow transition"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Hentikan</span>
                </button>
              </>
            )}

            {/* Delay Selector */}
            <div className="flex items-center gap-1.5 text-xs text-[#4b6a74] bg-[#f5eedf] px-3 py-1.5 rounded-xl border border-[#ded3bd]">
              <Clock className="w-3.5 h-3.5 text-[#0f3b47]" />
              <span>Jeda per pesan:</span>
              <select
                value={blastDelay}
                onChange={(e) => setBlastDelay(Number(e.target.value))}
                disabled={isBlasting}
                className="bg-transparent font-semibold text-[#0f3b47] outline-none cursor-pointer"
              >
                <option value={3}>3 Detik</option>
                <option value={4}>4 Detik (Standar)</option>
                <option value={6}>6 Detik (Aman)</option>
                <option value={8}>8 Detik (Sangat Aman)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetStatus}
              title="Reset status semua tamu ke 'Belum Dikirim'"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#4b6a74] hover:text-[#0f3b47] bg-[#f5eedf] hover:bg-[#ede3ce] border border-[#dcd0b8] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Status</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={totalCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#0f3b47] bg-[#f5eedf] hover:bg-[#ede3ce] border border-[#dcd0b8] transition disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Tip / Notice Banner */}
        <div className="mt-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-950">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong>Info Penting Blast Web:</strong> Jika menggunakan <em>Blast Otomatis</em>, pastikan browser Anda mengizinkan <strong>Pop-up</strong> untuk situs ini. Setiap kontak akan dibuka di WhatsApp Web dengan pesan yang sudah terisi otomatis, sehingga Anda tinggal menekan tombol kirim di WhatsApp.
          </div>
        </div>
      </div>

      {/* Main Grid: Template Editor + Live WhatsApp Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Message Template & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#fffef8] rounded-2xl border border-[#ded3bd] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0f3b47]">Format Template Pesan</h3>
                <p className="text-xs text-[#52717b]">Sesuaikan isi kata-kata undangan yang akan diterima tamu</p>
              </div>

              {/* Template Presets Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#52717b]">Pilihan Cepat:</span>
                <select
                  onChange={(e) => {
                    const preset = TEMPLATE_PRESETS.find((p) => p.name === e.target.value);
                    if (preset) setMessageTemplate(preset.text);
                  }}
                  defaultValue=""
                  className="text-xs bg-[#f5eedf] border border-[#dcd0b8] rounded-lg px-2 py-1 text-[#0f3b47] outline-none"
                >
                  <option value="" disabled>
                    Pilih Gaya Pesan...
                  </option>
                  {TEMPLATE_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Variable Tags Quick Insert */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-[#52717b]">Sisipkan variabel:</span>
              <button
                type="button"
                onClick={() => setMessageTemplate((prev) => prev + ' {nama}')}
                className="px-2 py-0.5 bg-emerald-100/90 text-emerald-800 rounded-md text-[11px] font-mono hover:bg-emerald-200 transition"
              >
                + &#123;nama&#125;
              </button>
              <button
                type="button"
                onClick={() => setMessageTemplate((prev) => prev + ' {link}')}
                className="px-2 py-0.5 bg-sky-100/90 text-sky-800 rounded-md text-[11px] font-mono hover:bg-sky-200 transition"
              >
                + &#123;link&#125;
              </button>
              <button
                type="button"
                onClick={() => setMessageTemplate((prev) => prev + ' {pengantin}')}
                className="px-2 py-0.5 bg-purple-100/90 text-purple-800 rounded-md text-[11px] font-mono hover:bg-purple-200 transition"
              >
                + &#123;pengantin&#125;
              </button>
              <button
                type="button"
                onClick={() => setMessageTemplate((prev) => prev + ' {acara}')}
                className="px-2 py-0.5 bg-amber-100/90 text-amber-800 rounded-md text-[11px] font-mono hover:bg-amber-200 transition"
              >
                + &#123;acara&#125;
              </button>
            </div>

            {/* Message Textarea */}
            <textarea
              rows={9}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-[#ded3bd] bg-[#fffcf5] text-[#1a3842] focus:ring-2 focus:ring-[#0f3b47]/20 focus:border-[#0f3b47] outline-none"
              placeholder="Ketik draf pesan WhatsApp di sini..."
            />

            {/* Base URL Configuration */}
            <div className="pt-2 border-t border-[#eee3cd] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-semibold text-[#0f3b47]">Alamat Web Undangan (Base URL):</span>
                <span className="block text-[11px] text-[#6b8790]">
                  Tautan unik setiap tamu akan otomatis ditambahkan parameter kode acak <code>?c=...</code>
                </span>
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="text-xs font-mono px-3 py-1.5 rounded-lg border border-[#ded3bd] bg-[#fffcf5] text-[#0f3b47] max-w-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Live WhatsApp Chat Bubble Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#fffef8] rounded-2xl border border-[#ded3bd] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0f3b47]">Simulasi Pesan WhatsApp</h3>
              </div>
              {contacts.length > 0 && (
                <select
                  value={activePreviewContact.id}
                  onChange={(e) => setPreviewContactId(e.target.value)}
                  className="text-xs bg-[#f5eedf] border border-[#dcd0b8] rounded-lg px-2 py-1 text-[#0f3b47] max-w-[150px] truncate"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* WhatsApp Phone Mockup Container */}
            <div className="bg-[#efeae2] rounded-xl p-3 border border-[#ded3bd] shadow-inner relative overflow-hidden min-h-[310px] flex flex-col justify-between">
              {/* WA Chat Header */}
              <div className="bg-[#075e54] text-white px-3 py-2 rounded-t-lg -mx-3 -mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-200 text-[#075e54] flex items-center justify-center font-bold text-xs">
                    {activePreviewContact.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{activePreviewContact.name}</div>
                    <div className="text-[10px] opacity-80 leading-tight">+{activePreviewContact.phone || '628xxx'}</div>
                  </div>
                </div>
                <div className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">WhatsApp Preview</div>
              </div>

              {/* Chat Bubble Area */}
              <div className="py-4 space-y-2">
                {/* Outgoing Message Bubble (Green) */}
                <div className="bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none text-[#111] shadow-sm ml-auto max-w-[95%] border border-[#c4e8aa]">
                  <div className="text-xs whitespace-pre-wrap font-sans leading-relaxed break-words">
                    {compileMessage(activePreviewContact)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Footer preview action */}
              <div className="pt-2 border-t border-[#e2dacb] flex items-center justify-between">
                <span className="text-[11px] text-[#52717b]">Tautan yang terbuat:</span>
                <button
                  type="button"
                  onClick={() => {
                    const link = getPersonalLink(activePreviewContact);
                    navigator.clipboard.writeText(link);
                    setCopiedLink(activePreviewContact.id);
                    setTimeout(() => setCopiedLink(null), 2000);
                  }}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 bg-emerald-100 px-2 py-1 rounded-md"
                >
                  {copiedLink === activePreviewContact.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Management & Input Area */}
      <div className="bg-[#fffef8] rounded-2xl border border-[#ded3bd] p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eee3cd] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#0f3b47]">Daftar Kontak & Nomor WhatsApp Tamu</h3>
            <p className="text-xs text-[#52717b]">
              Tambahkan tamu secara manual, tempel sekaligus (bulk paste), atau ambil dari tab Tautan Tamu
            </p>
          </div>

          {/* Import / Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0f3b47] bg-[#f5eedf] hover:bg-[#ede3ce] border border-[#dcd0b8] shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tempel Sekaligus (Bulk)</span>
            </button>
            <button
              type="button"
              onClick={handleImportFromGuestNames}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0f3b47] bg-[#f5eedf] hover:bg-[#ede3ce] border border-[#dcd0b8] shadow-sm transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Tarik dari Tautan Tamu</span>
            </button>
            {contacts.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                title="Hapus semua kontak"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Form (Single Guest) */}
        <form
          onSubmit={handleAddSingle}
          className="bg-[#f9f5ec] p-3 rounded-xl border border-[#e8ddc7] flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nama Tamu (misal: Budi Santoso & Partner)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#ded3bd] bg-white text-[#0f3b47] outline-none focus:border-[#0f3b47]"
            />
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="No. WhatsApp (08xxx / 628xxx)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#ded3bd] bg-white text-[#0f3b47] outline-none focus:border-[#0f3b47]"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0f3b47] hover:bg-[#1a4a58] text-[#fffef8] rounded-lg text-xs font-semibold transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Tamu</span>
          </button>
        </form>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#ede4d0] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterStatus === 'all' ? 'bg-[#fffef8] text-[#0f3b47] shadow-sm' : 'text-[#4b6a74] hover:text-[#0f3b47]'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterStatus === 'pending'
                  ? 'bg-[#fffef8] text-amber-800 shadow-sm'
                  : 'text-[#4b6a74] hover:text-amber-800'
              }`}
            >
              Belum Dikirim ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('sent')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterStatus === 'sent'
                  ? 'bg-[#fffef8] text-emerald-800 shadow-sm'
                  : 'text-[#4b6a74] hover:text-emerald-800'
              }`}
            >
              Sudah Terkirim ({sentCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#6c8892] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama atau no. WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[#ded3bd] bg-[#fffcf5] text-[#0f3b47] outline-none"
            />
          </div>
        </div>

        {/* Contacts Table */}
        <div className="border border-[#e2d8c3] rounded-xl overflow-x-auto bg-white">
          <table className="w-full text-left text-xs text-[#284954]">
            <thead className="bg-[#f5eedf] text-[#0f3b47] font-semibold border-b border-[#e2d8c3]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">Nama Tamu</th>
                <th className="py-2.5 px-3">No. WhatsApp</th>
                <th className="py-2.5 px-3">Kode Acak</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee3cd]">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#6d8a94]">
                    Belum ada kontak tamu dalam kategori ini.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact, index) => {
                  const isCurrent = currentBlastIndex !== null && contacts[currentBlastIndex]?.id === contact.id;

                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-[#faf6ee] transition ${
                        isCurrent ? 'bg-emerald-50/90 font-semibold ring-2 ring-emerald-400 inset-0' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-[#6d8a94]">{index + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-[#0f3b47]">
                        {contact.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={contact.phone}
                            onChange={(e) => handlePhoneChange(contact.id, e.target.value)}
                            placeholder="628xxx"
                            className="text-xs font-mono px-2 py-1 rounded border border-[#ded3bd] bg-[#fffcf5] w-36 outline-none focus:border-[#0f3b47]"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#4b6a74]">
                        <code>?c={contact.code}</code>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {contact.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terkirim {contact.sentAt ? `(${contact.sentAt})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Belum</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendSingle(contact)}
                            title="Kirim Pesan WhatsApp Langsung"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Kirim WA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id)}
                            title="Hapus kontak dari daftar"
                            className="p-1 rounded-lg text-[#7f9aa2] hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#fffef8] rounded-2xl border border-[#ded3bd] max-w-xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#eee3cd] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-[#0f3b47]">Tempel Sekaligus (Bulk Import)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="p-1 text-[#6c8892] hover:text-[#0f3b47] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#52717b]">
              <p>
                Salin daftar tamu dari <strong>Excel</strong>, <strong>Google Sheets</strong>, atau ketik langsung dengan format <strong>Nama, Nomor WhatsApp</strong> (satu tamu per baris).
              </p>
              <div className="p-2.5 bg-[#f5eedf] rounded-lg font-mono text-[11px] text-[#2c4c56]">
                Budi Santoso, 081234567890<br />
                Siti Aminah & Keluarga, 085712345678<br />
                dr. Hendra Wijaya, 6281987654321
              </div>
            </div>

            <textarea
              rows={8}
              value={bulkInputText}
              onChange={(e) => setBulkInputText(e.target.value)}
              placeholder="Tempel data di sini..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-[#ded3bd] bg-[#fffcf5] text-[#0f3b47] outline-none focus:ring-2 focus:ring-[#0f3b47]/20"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eee3cd]">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#4b6a74] hover:bg-[#ede3ce]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Impor ke Daftar WA</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
