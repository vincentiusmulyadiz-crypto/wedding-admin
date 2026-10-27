import React from 'react';
import {
  Users,
  LayoutDashboard,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Download,
  Search,
  MessageCircle,
  ArrowRight,
  HeartHandshake,
  BookOpen,
} from 'lucide-react';

interface TutorialTabProps {
  onSelectTab?: (tab: 'overview' | 'guests' | 'links' | 'tutorial' | 'customers') => void;
}

export const TutorialTab: React.FC<TutorialTabProps> = ({ onSelectTab }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Sambutan */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 shadow-xs space-y-2 text-center sm:text-left transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0ebd9] border border-[#ded4be] text-xs font-bold text-[#0f3b47]">
          <BookOpen className="w-3.5 h-3.5 text-teal-800" />
          <span>Panduan Praktis untuk Calon Pengantin</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0e2c34]">
          Cara Mudah Menggunakan Dashboard Undangan Anda
        </h1>
        <p className="text-xs sm:text-sm text-[#52717b] max-w-2xl leading-relaxed">
          Selamat mempersiapkan hari bahagia! Dashboard ini dirancang agar Anda dapat mengundang tamu dan memantau konfirmasi kehadiran secara rapi, cepat, dan otomatis tanpa repot mencatat manual.
        </p>
      </div>

      {/* Bagian 1: Alur Utama Mengundang Tamu (Tab Tautan Tamu) */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0e2c34]">
                1. Cara Mengundang Tamu via WhatsApp
              </h2>
              <p className="text-xs text-[#52717b]">
                Dikerjakan di tab <strong className="text-[#0e2c34]">"Tautan Tamu"</strong>
              </p>
            </div>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('links')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3b47] hover:underline"
            >
              <span>Buka Tautan Tamu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Langkah 1 */}
          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
            <div className="w-7 h-7 rounded-xl bg-[#0f3b47] text-white flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="font-bold text-sm text-[#0e2c34]">Tambah & Tempel Nama Tamu</h3>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Ketik nama tamu & nomor WhatsApp lalu klik <strong>"Tambah Tamu"</strong>, atau klik tombol <strong>"Tempel Banyak Sekaligus"</strong> di bilah atas untuk menyalin daftar nama massal dari WhatsApp atau Excel.
            </p>
          </div>

          {/* Langkah 2 */}
          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
            <div className="w-7 h-7 rounded-xl bg-[#0f3b47] text-white flex items-center justify-center font-bold text-xs">
              2
            </div>
            <h3 className="font-bold text-sm text-[#0e2c34]">Tautan Undangan Personal</h3>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Link undangan personal otomatis tercipta untuk tiap tamu. Anda juga dapat menyalin seluruh daftar tautan tamu sekaligus melalui tombol <strong>"Salin Semua Tautan"</strong> di bilah atas.
            </p>
          </div>

          {/* Langkah 3 */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              3
            </div>
            <h3 className="font-bold text-sm text-emerald-950">Kirim WhatsApp & Atur Template</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Klik tombol hijau <strong>"Kirim via WhatsApp"</strong> untuk mengirim pesan personal. Ingin mengubah redaksi kata-kata undangan? Klik tombol <strong>"Ubah Template Pesan WhatsApp"</strong> di samping judul langkah 3.
            </p>
          </div>
        </div>

        {/* Fitur Tambahan: Filter Status Undangan */}
        <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] flex items-start gap-3 mt-2">
          <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#0e2c34]">Pantau Status Undangan dengan Dropdown Filter</h4>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Gunakan dropdown filter status di atas daftar tamu untuk memantau tamu yang <strong>Belum Dibuka (✉)</strong>, <strong>Sudah Dibuka (👁)</strong>, maupun yang <strong>Sudah Konfirmasi (✓)</strong> tanpa perlu repot mencocokkan satu per satu.
            </p>
          </div>
        </div>
      </div>

      {/* Bagian 2: Memantau Kehadiran & Doa Restu (Tab Ringkasan) */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0e2c34]">
                2. Cara Memantau Jumlah Tamu yang Hadir
              </h2>
              <p className="text-xs text-[#52717b]">
                Dilihat di tab <strong className="text-[#0e2c34]">"Ringkasan"</strong>
              </p>
            </div>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('overview')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3b47] hover:underline"
            >
              <span>Buka Ringkasan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-xs">
              <Users className="w-4 h-4 text-teal-700" />
              <span>Angka Tamu Hadir</span>
            </div>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Kotak besar di atas otomatis menghitung <strong>total porsi/orang fisik</strong> yang akan hadir, termasuk pasangan atau anak yang diajak oleh tamu Anda.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
            <div className="flex items-center gap-2 text-[#0e2c34] font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Grafik Warna Kehadiran</span>
            </div>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Bagan bersegmen langsung memperlihatkan perbandingan antara tamu yang <strong>Akan Hadir (Hijau)</strong>, <strong>Ragu-ragu (Kuning)</strong>, dan <strong>Tidak Hadir (Merah)</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] space-y-1.5 sm:col-span-2 lg:col-span-1 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#cdbe9f]">
            <div className="flex items-center gap-2 text-[#0e2c34] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Ucapan Terbaru</span>
            </div>
            <p className="text-xs text-[#52717b] leading-relaxed">
              Tiga ucapan dan doa restu teranyar langsung muncul di bagian bawah ringkasan setiap kali ada tamu yang mengirim ucapan baru.
            </p>
          </div>
        </div>
      </div>

      {/* Bagian 3: Mencari & Mengelola Tamu (Tab Daftar Tamu) */}
      <div className="bg-[#fffdfa] border border-[#e5dcce] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex items-center justify-between border-b border-[#eee5d4] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#f0ebd9] text-[#0f3b47] border border-[#ded4be]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0e2c34]">
                3. Cara Melihat Detail Ucapan & Ekspor Data
              </h2>
              <p className="text-xs text-[#52717b]">
                Dikelola di tab <strong className="text-[#0e2c34]">"Daftar Tamu"</strong>
              </p>
            </div>
          </div>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('guests')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#0f3b47] hover:underline"
            >
              <span>Buka Daftar Tamu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3 pt-1">
          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] flex items-start gap-3 transition-all duration-200 hover:shadow-sm hover:border-[#cdbe9f]">
            <Search className="w-5 h-5 text-[#0f3b47] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-xs text-[#0e2c34]">Cari & Filter Cepat</h3>
              <p className="text-xs text-[#52717b] mt-0.5 leading-relaxed">
                Ketik nama tamu di kolom pencarian untuk melihat apakah kerabat tertentu sudah mengisi atau belum. Gunakan tombol status untuk melihat tamu yang hadir saja atau yang tidak hadir saja.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] flex items-start gap-3 transition-all duration-200 hover:shadow-sm hover:border-[#cdbe9f]">
            <HeartHandshake className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-xs text-[#0e2c34]">Klik Baris Tamu untuk Baca Pesan Lengkap</h3>
              <p className="text-xs text-[#52717b] mt-0.5 leading-relaxed">
                Sentuh atau klik pada nama tamu mana pun untuk membuka panel detail di sebelah samping/bawah. Anda dapat membaca pesan doa restu lengkap serta menghapus data jika tamu salah mengisi.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#faf6ee] border border-[#ded4be] flex items-start gap-3 transition-all duration-200 hover:shadow-sm hover:border-[#cdbe9f]">
            <Download className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-xs text-[#0e2c34]">Simpan ke Excel / Ekspor CSV</h3>
              <p className="text-xs text-[#52717b] mt-0.5 leading-relaxed">
                Butuh daftar nama untuk laporan katering atau buku tamu fisik? Klik tombol <strong>"Opsi"</strong> di pojok kanan atas tab Daftar Tamu, lalu pilih <strong>"Ekspor ke File CSV"</strong>. File siap dibuka di Microsoft Excel atau Google Sheets.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 4: Tips Praktis untuk Pengantin */}
      <div className="bg-gradient-to-br from-[#f0ebd9] to-[#e8dfc9] border border-[#ded4be] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#cdbe9f]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#0f3b47]" />
          <h2 className="text-base font-bold text-[#0e2c34]">
            Tips Penting untuk Hasil Maksimal
          </h2>
        </div>

        <ul className="space-y-2.5 text-xs text-[#2b4c56] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#0f3b47]">✦</span>
            <span>
              <strong>Gunakan Tautan Personal:</strong> Tamu yang membuka link khusus akan disambut dengan namanya di cover undangan (misal: <em>"Kepada Yth. Budi & Keluarga"</em>). Ini membuat undangan terasa jauh lebih sopan dan eksklusif.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#0f3b47]">✦</span>
            <span>
              <strong>Waktu Terbaik Menyebarkan Undangan:</strong> Kirim undangan sekitar <strong>H-30 hingga H-14</strong> sebelum hari pernikahan agar tamu memiliki cukup waktu untuk mencocokkan jadwal.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#0f3b47]">✦</span>
            <span>
              <strong>Konfirmasi Ulang (H-7):</strong> Satu minggu sebelum acara, periksa tab Daftar Tamu dengan filter <em>"Belum Pasti"</em>. Anda dapat menyapa kembali tamu tersebut untuk memastikan kepastian porsi katering dan meja resepsi.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
