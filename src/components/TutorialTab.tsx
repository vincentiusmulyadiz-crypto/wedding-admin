import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Search,
  Users,
} from 'lucide-react';

interface TutorialTabProps {
  onSelectTab?: (tab: 'overview' | 'guests' | 'links' | 'tutorial' | 'customers') => void;
}

export const TutorialTab: React.FC<TutorialTabProps> = ({ onSelectTab }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-6">
      {/* Header: clean title + 1-line purpose, no decorative eyebrow pill */}
      <div className="px-1 space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0e2c34]">
          Panduan Penggunaan Dashboard Undangan
        </h1>
        <p className="text-xs sm:text-sm text-[#52717b]">
          Ringkasan langkah mengundang tamu, mengatur jatah pax atau grup WhatsApp, hingga memantau kehadiran.
        </p>
      </div>

      {/* Bagian 1: Tautan Tamu */}
      <section className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eee5d4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0e2c34]">
                1. Tambah Daftar Tamu &amp; Kirim Link
              </h2>
              <p className="text-[11px] sm:text-xs text-[#52717b]">
                Di tab <strong className="text-[#0e2c34]">Tautan Tamu</strong>
              </p>
            </div>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('links')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#faf6ee] hover:bg-[#f0ebd9] border border-[#ded4be] text-xs font-bold text-[#0f3b47] transition cursor-pointer"
            >
              <span>Buka Tautan Tamu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <ol className="space-y-2.5 text-xs text-[#2b4c56] leading-relaxed">
          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#faf6ee] border border-[#ded4be]">
            <span className="w-5 h-5 rounded-md bg-[#0f3b47] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <strong className="text-[#0e2c34] block">Tambah Tamu &amp; Atur Jatah Pax</strong>
              <span>
                Ketik nama, nomor WA, dan jatah pax (1–10 atau ketik jumlah sendiri) lalu klik{' '}
                <strong>Tambah Tamu</strong>. Untuk banyak nama sekaligus, klik{' '}
                <strong>Tempel Banyak Sekaligus</strong>.
              </span>
            </div>
          </li>

          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#faf6ee] border border-[#ded4be]">
            <span className="w-5 h-5 rounded-md bg-[#0f3b47] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <strong className="text-[#0e2c34] block">Pilih Mode Perorangan atau Grup WA</strong>
              <span>
                <strong>Perorangan:</strong> nama tamu otomatis terisi di form RSVP (tetap bisa diedit).{' '}
                <strong>Grup WA:</strong> centang mode grup lalu klik <strong>Buat Link Grup</strong> — setiap anggota yang membuka link wajib mengisi nama pribadinya sendiri agar data tidak tertumpuk.
              </span>
            </div>
          </li>

          <li className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div>
              <strong className="text-emerald-950 block">Kirim WhatsApp &amp; Pantau Status Link</strong>
              <span className="text-emerald-900">
                Klik <strong>Kirim via WhatsApp</strong> di baris tamu (redaksi pesan bisa diubah lewat{' '}
                <strong>Ubah Template Pesan WhatsApp</strong>) atau klik{' '}
                <strong>Salin Semua Tautan</strong>. Gunakan filter status di atas daftar untuk melihat tamu:
              </span>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#ded4be] text-slate-700">
                  <Mail className="w-3 h-3 text-slate-500" />
                  Belum Dibuka
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900">
                  <Eye className="w-3 h-3 text-amber-600" />
                  Dibuka (Belum RSVP)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-900">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Sudah Konfirmasi
                </span>
              </div>
            </div>
          </li>
        </ol>
      </section>

      {/* Bagian 2: Tracking Kehadiran & Data Konfirmasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ringkasan */}
        <section className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#eee5d4] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-[#0e2c34]">2. Cek Total Hadir (Ringkasan)</h2>
              </div>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab('overview')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3b47] hover:underline cursor-pointer shrink-0"
                >
                  <span>Buka</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <ul className="space-y-2 text-xs text-[#52717b] leading-relaxed">
              <li className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0e2c34]">Total Pax Hadir:</strong> Menghitung otomatis jumlah orang yang akan datang (termasuk pendamping sesuai pax yang dipilih tamu).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0e2c34]">Grafik &amp; Ucapan Terbaru:</strong> Membandingkan tamu Hadir, Belum Pasti, dan Tidak Hadir beserta 3 ucapan terbaru.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Daftar Tamu */}
        <section className="bg-[#fffdfa] border border-[#e5dcce] rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#eee5d4] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f0ebd9] text-[#0f3b47] border border-[#ded4be] shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-[#0e2c34]">3. Detail &amp; Ekspor (Daftar Tamu)</h2>
              </div>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab('guests')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3b47] hover:underline cursor-pointer shrink-0"
                >
                  <span>Buka</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <ul className="space-y-2 text-xs text-[#52717b] leading-relaxed">
              <li className="flex items-start gap-2">
                <Search className="w-3.5 h-3.5 text-[#0f3b47] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0e2c34]">Cari &amp; Kelola Ucapan:</strong> Klik baris tamu untuk membaca ucapan lengkap. Anda bisa memakai <strong>Hapus Chat</strong> (hapus ucapan saja) atau <strong>Hapus</strong> (hapus data konfirmasi).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0e2c34]">Ekspor Excel / CSV:</strong> Klik tombol <strong>Opsi</strong> lalu pilih <strong>Ekspor ke File CSV</strong> untuk kebutuhan katering.
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Tips Singkat */}
      <div className="bg-[#f5eedf] border border-[#ded4be] rounded-2xl p-4 sm:p-5 space-y-2">
        <h3 className="text-xs font-bold text-[#0e2c34] uppercase tracking-wide">
          Tips Singkat
        </h3>
        <ul className="space-y-1.5 text-xs text-[#2b4c56] leading-relaxed">
          <li>• Sebarkan link pada <strong>H-30 sampai H-14</strong> agar tamu punya waktu luang untuk konfirmasi.</li>
          <li>• Gunakan <strong>Link Grup</strong> hanya untuk grup chat — jangan bagikan link perorangan ke banyak orang agar nama &amp; status tidak tertukar.</li>
          <li>• Pada <strong>H-7</strong>, cek status <em>Belum Pasti</em> atau <em>Dibuka (Belum RSVP)</em> untuk memastikan porsi akhir acara.</li>
        </ul>
      </div>
    </div>
  );
};
