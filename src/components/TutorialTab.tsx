import React from 'react';
import {
  UserPlus,
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Mail,
} from 'lucide-react';

interface TutorialTabProps {
  onSelectTab?: (tab: 'overview' | 'guests' | 'links' | 'tutorial' | 'customers') => void;
}

export const TutorialTab: React.FC<TutorialTabProps> = ({ onSelectTab }) => {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Singkat */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-[#f0ebd9] border border-[#ded4be] text-[#0f3b47] shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0e2c34]">
            Panduan Singkat Calon Pengantin
          </h1>
          <p className="text-xs text-[#52717b]">
            Dua langkah utama: tambah daftar tamu &amp; pantau konfirmasi kehadirannya.
          </p>
        </div>
      </div>

      {/* 1. Cara Tambah Daftar Tamu */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#0f3b47] text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#0e2c34] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#0f3b47]" />
              <span>Cara Tambah Daftar Tamu &amp; Kirim Undangan</span>
            </h2>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('links')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3b47] hover:underline cursor-pointer shrink-0"
            >
              <span>Buka Tautan Tamu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#52717b] leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1">
            <p className="font-bold text-[#0e2c34]">a. Tambah Satuan atau Massal</p>
            <p>
              Di tab <strong>Tautan Tamu</strong>, isi nama &amp; jatah tamu lalu klik{' '}
              <strong>Tambah Tamu</strong>. Untuk banyak nama sekaligus, klik{' '}
              <strong>Tempel Banyak Sekaligus</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1">
            <p className="font-bold text-[#0e2c34]">b. Kirim Link Personal</p>
            <p>
              Klik <strong>Kirim via WhatsApp</strong> di baris tamu (kata pesan bisa diatur di{' '}
              <strong>Ubah Template Pesan WhatsApp</strong>), atau klik{' '}
              <strong>Salin Semua Tautan</strong> untuk menyalin sekaligus.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Cara Tracking Data Tamu */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#0f3b47] text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#0e2c34] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0f3b47]" />
              <span>Cara Tracking Data &amp; Kehadiran Tamu</span>
            </h2>
          </div>

          {onSelectTab && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onSelectTab('overview')}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#0f3b47] hover:underline cursor-pointer"
              >
                <span>Ringkasan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('guests')}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3b47] hover:underline cursor-pointer"
              >
                <span>Daftar Tamu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#0e2c34]">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Belum Dibuka</span>
            </div>
            <p className="text-[#52717b] leading-relaxed">
              Tamu belum pernah membuka tautan undangan yang dikirim.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>Dibuka (Belum RSVP)</span>
            </div>
            <p className="text-[#52717b] leading-relaxed">
              Link undangan sudah dibuka tamu (lengkap dengan jam buka), tapi belum kirim konfirmasi.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sudah Konfirmasi</span>
            </div>
            <p className="text-[#52717b] leading-relaxed">
              Tamu sudah mengisi RSVP. Total orang hadir tampil di tab{' '}
              <strong>Ringkasan</strong>, detail &amp; ekspor Excel/CSV ada di tab{' '}
              <strong>Daftar Tamu</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
