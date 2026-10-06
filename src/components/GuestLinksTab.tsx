import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer, Rsvp } from '../types/database';
import { getSupabase } from '../lib/supabase';
import { encodeGuestCode } from '../lib/guestCode';
import {
  Link2,
  Copy,
  Check,
  Send,
  MessageCircle,
  Users,
  Edit3,
  RotateCw,
  ClipboardList,
  Key,
} from 'lucide-react';

interface GuestLinksTabProps {
  customer: Customer;
}

const DEFAULT_WA_TEMPLATE = `Kepada Yth. {nama},

Tanpa mengurangi rasa hormat, kami bermaksud mengundang Anda untuk hadir pada acara pernikahan kami:
{link}

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.

Terima kasih.`;

export const GuestLinksTab: React.FC<GuestLinksTabProps> = ({ customer }) => {
  const namesStorageKey = `guest_names_${customer.id}`;
  const codesStorageKey = `guest_codes_${customer.id}`;
  const baseUrlStorageKey = `base_url_${customer.id}`;
  const templateStorageKey = `wa_template_${customer.id}`;
  const linkFormatStorageKey = `link_format_${customer.id}`;

  const defaultBaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${customer.slug}`
    : `https://undangan.com/${customer.slug}`;

  const [namesText, setNamesText] = useState<string>(() => {
    return localStorage.getItem(namesStorageKey) || 'Budi Santoso\nSiti Aminah & Keluarga\nDr. Hendra Wijaya\nReza Fahlevi';
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

  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [existingRsvps, setExistingRsvps] = useState<Rsvp[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(namesStorageKey, namesText);
  }, [namesStorageKey, namesText]);

  useEffect(() => {
    localStorage.setItem(baseUrlStorageKey, baseUrl);
  }, [baseUrlStorageKey, baseUrl]);

  useEffect(() => {
    localStorage.setItem(templateStorageKey, waTemplate);
  }, [templateStorageKey, waTemplate]);

  useEffect(() => {
    localStorage.setItem(linkFormatStorageKey, linkFormat);
  }, [linkFormatStorageKey, linkFormat]);

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

  const guestList = useMemo(() => {
    const lines = namesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Load or initialize persistent random codes per guest
    let savedCodes: Record<string, string> = {};
    try {
      savedCodes = JSON.parse(localStorage.getItem(codesStorageKey) || '{}');
    } catch {
      savedCodes = {};
    }

    let codesUpdated = false;
    const currentCodes: Record<string, string> = { ...savedCodes };

    lines.forEach((name) => {
      if (!currentCodes[name]) {
        currentCodes[name] = encodeGuestCode(name);
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

    return lines.map((name, index) => {
      const code = currentCodes[name] || encodeGuestCode(name);
      const separator = cleanBase.includes('?') ? '&' : '?';

      const link =
        linkFormat === 'random'
          ? `${cleanBase}${separator}c=${code}`
          : `${cleanBase}${separator}to=${encodeURIComponent(name).replace(/%20/g, '+')}`;

      const lowerName = name.toLowerCase();
      const lowerCode = code.toLowerCase();
      const isRsvped = rsvpLookup.has(lowerName) || rsvpLookup.has(lowerCode);

      return {
        id: `${index}-${name}`,
        name,
        code,
        link,
        isRsvped,
      };
    });
  }, [namesText, baseUrl, existingRsvps, linkFormat, codesStorageKey]);

  const rsvpedCount = useMemo(() => {
    return guestList.filter((g) => g.isRsvped).length;
  }, [guestList]);

  const totalGuests = guestList.length;
  const percentage = totalGuests > 0 ? ((rsvpedCount / totalGuests) * 100).toFixed(1) : '0';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllLinks = () => {
    if (guestList.length === 0) return;
    const formatted = guestList
      .map((g) => `${g.name}: ${g.link}`)
      .join('\n\n');
    navigator.clipboard.writeText(formatted);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const generateWhatsAppUrl = (name: string, link: string) => {
    const text = waTemplate
      .replace(/{nama}/g, name)
      .replace(/{link}/g, link);
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0f3b47] flex items-center gap-2">
            <Link2 className="w-6 h-6 text-[#0f3b47]" />
            <span>Generator Tautan Tamu & WhatsApp</span>
          </h1>
          <p className="text-xs text-[#5e7d87]">
            Buat tautan personal untuk setiap nama tamu dan pantau status konfirmasinya
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>Ubah Template WA</span>
          </button>
        </div>
      </div>

      {/* Progress & Counter Card */}
      <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#f0ebd9] border border-[#d8cdb8] text-[#0f3b47]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-[#5e7d87] block font-medium">Status Konfirmasi Tautan:</span>
              <span className="text-lg font-bold text-[#0f3b47]">
                {rsvpedCount} dari {totalGuests} sudah RSVP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyAllLinks}
              disabled={guestList.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] disabled:opacity-40 transition shadow-xs"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-[#d3edf2]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Semua Tautan Tersalin!' : 'Salin Semua Tautan'}</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 bg-[#eee5d4] rounded-full overflow-hidden border border-[#ded3bc]">
            <div
              className="h-full bg-gradient-to-r from-[#0f3b47] to-[#10b981] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#6d8a93] font-medium">
            <span>Tingkat respons: {percentage}%</span>
            <span>{totalGuests - rsvpedCount} belum mengisi</span>
          </div>
        </div>
      </div>

      {/* Input Section: Base URL & Name List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs */}
        <div className="lg:col-span-5 bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1f404b] mb-1.5">
              Base URL Undangan
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://undangan.com/nama-pasangan"
              className="w-full px-3.5 py-2 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#0f3b47]"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[11px] text-[#6e8a93] font-medium">Format Tautan:</span>
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
            <p className="text-[11px] text-[#6e8a93] mt-1 font-medium">
              Contoh:{' '}
              <code className="text-[#0f3b47] font-semibold">
                {linkFormat === 'random' ? `${baseUrl}?c=k9X...` : `${baseUrl}?to=Nama+Tamu`}
              </code>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#1f404b]">
                Daftar Nama Tamu (Satu nama per baris)
              </label>
              <span className="text-[11px] text-[#5e7d87] font-mono font-bold">
                {guestList.length} nama
              </span>
            </div>
            <textarea
              rows={10}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder="Budi Santoso&#10;Siti Aminah & Keluarga&#10;Dr. Hendra Wijaya"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf6ee] border border-[#d8cdb8] text-[#0d2e37] placeholder-[#819ea7] text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0f3b47] font-sans resize-y"
            />
            <p className="text-[11px] text-[#6e8a93] mt-1">
              Setiap nama otomatis mendapatkan kombinasi kode acak unik yang langsung terkoneksi ke template undangan.
            </p>
          </div>
        </div>

        {/* Right Section: Generated Links Table & Actions */}
        <div className="lg:col-span-7 space-y-3">
          {guestList.length === 0 ? (
            <div className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-10 text-center space-y-2 shadow-xs">
              <Users className="w-8 h-8 text-[#85a1ab] mx-auto" />
              <p className="text-xs text-[#5e7d87]">Masukkan nama tamu di kolom kiri untuk melihat tautan.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block bg-[#fffdf9] border border-[#e3dac8] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5eedf] text-[#345761] font-bold border-b border-[#e3dac8]">
                    <tr>
                      <th className="py-3 px-4">Nama</th>
                      <th className="py-3 px-4">Kode Acak</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tautan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee5d4]">
                    {guestList.map((guest) => {
                      const isCopied = copiedId === guest.id;
                      return (
                        <tr key={guest.id} className="hover:bg-[#f8f3e9] transition">
                          <td className="py-3 px-4 font-bold text-[#0f3b47] max-w-[130px] truncate">
                            {guest.name}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-[#f0ebd9] text-[#0f3b47] px-2 py-0.5 rounded-md border border-[#d8cdb8]">
                              <Key className="w-2.5 h-2.5 text-[#5e7d87]" />
                              {guest.code.slice(0, 10)}...
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
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

                          <td className="py-3 px-4 max-w-[170px]">
                            <span className="text-[11px] font-mono text-[#4e6e78] truncate block" title={guest.link}>
                              {guest.link}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(guest.link, guest.id)}
                              className={`p-1.5 rounded-lg border transition ${
                                isCopied
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                  : 'bg-[#f0ebd9] border-[#d8cdb8] text-[#2c4e58] hover:text-[#0f3b47] hover:bg-[#e6dfcb]'
                              }`}
                              title="Salin tautan"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <a
                              href={generateWhatsAppUrl(guest.name, guest.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center p-1.5 rounded-lg border bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition"
                              title="Kirim via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-2.5">
                {guestList.map((guest) => {
                  const isCopied = copiedId === guest.id;
                  return (
                    <div
                      key={guest.id}
                      className="bg-[#fffdf9] border border-[#e3dac8] rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#0f3b47] truncate max-w-[160px]">
                          {guest.name}
                        </span>
                        {guest.isRsvped ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Sudah RSVP
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0ebd9] text-[#688691] border border-[#d8cdb8]">
                            Belum
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#5e7d87]">
                        <span>Kode Acak:</span>
                        <span className="font-mono text-[10px] bg-[#f0ebd9] text-[#0f3b47] px-2 py-0.5 rounded border border-[#d8cdb8]">
                          {guest.code}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-[#4e6e78] bg-[#faf6ee] p-2 rounded-xl truncate border border-[#e3dac8]">
                        {guest.link}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(guest.link, guest.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f0ebd9] text-[#0f3b47] text-xs font-bold hover:bg-[#e6dfcb] border border-[#d8cdb8]"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <a
                          href={generateWhatsAppUrl(guest.name, guest.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0f3b47] hover:bg-[#154e5e] text-[#fffdf8] text-xs font-bold shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

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
                className="text-[#6d8a93] hover:text-[#0f3b47] text-xs px-2 py-1 font-bold"
              >
                ✕
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#fffdf8] bg-[#0f3b47] hover:bg-[#154e5e] transition shadow-xs"
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
