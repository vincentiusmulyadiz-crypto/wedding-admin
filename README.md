# Admin Dashboard Undangan Pernikahan

Aplikasi web dashboard admin modern, bersih, bertema gelap (dark mode), responsif untuk perangkat mobile & desktop, dibangun dengan **React**, **Vite**, **TypeScript**, **Tailwind CSS**, dan **@supabase/supabase-js**.

Seluruh data tersimpan di Supabase dengan **Row Level Security (RLS)** sebagai pengatur hak akses data.

---

## 🛠️ Stack & Teknologi

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Dark UI
- **Backend & Auth**: Supabase (@supabase/supabase-js)
- **Icons**: Lucide React
- **Keamanan**: Noindex, plain-text rendering (aman XSS), formula injection escaping pada ekspor CSV, RLS database-level.

---

## 🚀 Menjalankan Aplikasi

1. Pindah ke direktori proyek:
   ```bash
   cd C:\Users\MSI\.gemini\antigravity\scratch\wedding-admin
   ```

2. Konfigurasi kredensial Supabase di `.env` (atau melalui tombol **Konfigurasi Supabase** di UI):
   ```env
   VITE_SUPABASE_URL=https://XXXX.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=PASTE_PUBLISHABLE_KEY
   ```
   > **Catatan Keamanan:** Gunakan selalu **Publishable (Anon) Key**. Jangan pernah memasukkan *Service Role Secret Key* ke dalam aplikasi frontend!

3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

4. Build untuk produksi & type check:
   ```bash
   npm run build
   ```

---

## 📋 Fitur Utama

1. **Autentikasi & Sesi (Login)**
   - Login dengan email dan kata sandi (`signInWithPassword`).
   - Tombol "Keluar", persistensi sesi otomatis.
   - Pesan error dalam Bahasa Indonesia yang ramah.
   - Tidak ada registrasi publik (akun hanya dibuat langsung di Supabase Auth).

2. **Customer Switcher & Filter RLS**
   - Otomatis memuat daftar undangan yang berhak dilihat user.
   - Dropdown pemilih jika akun memiliki lebih dari satu undangan.
   - Tampilan kosong informatif jika belum ada undangan untuk akun tersebut.

3. **Ringkasan (Overview Tab)**
   - Nama pasangan pengantin, tanggal acara, dan hitung mundur `H-N` / `Hari H` / `H+N`.
   - Kartu statistik: Total RSVP, Hadir, Tidak Hadir, Belum Pasti, dan Total Tamu Hadir (*sum of guests*).
   - Donut chart interaktif (SVG).
   - 5 ucapan & doa restu terbaru.
   - Penanda waktu pembaruan terakhir & tombol "Segarkan".
   - Sinkronisasi realtime (*Supabase postgres_changes INSERT*) dengan fallback polling 60 detik.

4. **Daftar Tamu (Guests Tab)**
   - Tabel responsif (desktop) & kartu bertingkat (mobile).
   - Pencarian (nama, ucapan, parameter tautan).
   - Filter kehadiran & pengurutan (waktu, nama, jumlah tamu).
   - Paginasi 25 data per halaman menggunakan `.range()` Supabase (mampu menangani >1000 data).
   - Modal konfirmasi penghapusan data.
   - Ekspor CSV berstandar UTF-8 dengan BOM dan sanitasi formula injection (`=`, `+`, `-`, `@`).

5. **Tautan Tamu & WhatsApp (Guest Links Tab)**
   - Textarea input nama tamu (satu nama per baris).
   - Input Base URL undangan.
   - Generator tautan otomatis: `{baseUrl}?to={Nama+Tamu}`.
   - Status pencocokan cerdas *case-insensitive* ("Sudah RSVP" / "Belum") mencocokkan `name` dan `guest_param`.
   - Tombol salin per tautan dan tombol **"Salin Semua Tautan"**.
   - Integrasi langsung pesan WhatsApp (`wa.me/?text=...`) dengan template pesan yang dapat disesuaikan.
   - Indikator kemajuan (*progress bar*) dan penghitung *"x dari y sudah RSVP"*.

6. **Kelola Undangan (Customer Tab - Khusus Admin)**
   - Terbuka otomatis hanya untuk user yang terdaftar di tabel `admins`.
   - Melihat daftar undangan, menyalin ID pelanggan dengan satu klik.
   - Menambahkan pelanggan baru (`slug`, `couple_names`, `event_date`).
   - Mengedit nama pasangan dan tanggal acara.
