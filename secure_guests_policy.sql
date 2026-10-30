-- ==============================================================================
-- PENGAMANAN DATA TAMU & ENTRANCE PASS (RLS SUPABASE)
-- 
-- TUJUAN:
-- 1. Menghentikan kebocoran seluruh data check-in, amplop, usher, dan kado 
--    yang tersimpan pada baris internal '__JOYEVER_CONFIG_V1__'.
-- 2. Memastikan seluruh web undangan klien aktif (Indah-Ricky, Risa-Adi, Vonny-Herman, dll.)
--    TETAP 100% NORMAL menyapa tamu dan menerima RSVP tanpa ada error.
-- 3. Data RSVP yang sudah masuk TIDAK DISENTUH SAMA SEKALI (100% AMAN).
-- ==============================================================================

-- LANGKAH 1: Hapus policy publik lama yang terlalu terbuka
DROP POLICY IF EXISTS "Select guests: public by code" ON public.guests;
DROP POLICY IF EXISTS "Select guests: public invited guest only" ON public.guests;
DROP POLICY IF EXISTS "Select guests: authenticated owner or admin" ON public.guests;

-- LANGKAH 2: Buat policy baru untuk Tamu Publik (anon)
-- Pengunjung publik di web undangan hanya diizinkan membaca data tamu undangan biasa,
-- dan DILARANG KERAS membaca baris konfigurasi internal (__JOYEVER_CONFIG_V1__).
CREATE POLICY "Select guests: public invited guest only"
ON public.guests FOR SELECT
TO anon
USING (
  code <> '__JOYEVER_CONFIG_V1__'
);

-- LANGKAH 3: Buat policy untuk Pengguna Terotentikasi (Admin & Pemilik Undangan)
-- Admin Joyever dan pengantin yang login dapat membaca seluruh tamu & konfigurasi miliknya.
CREATE POLICY "Select guests: authenticated owner or admin"
ON public.guests FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = guests.customer_id AND customers.owner_id = auth.uid()
  )
);

-- ==============================================================================
-- SKRIP ROLLBACK / PEMULIHAN (JIKA INGIN MEMBATALKAN KAPAN SAJA):
-- Jalankan 2 baris di bawah jika sewaktu-waktu ingin mengembalikan ke aturan lama:
--
-- DROP POLICY IF EXISTS "Select guests: public invited guest only" ON public.guests;
-- CREATE POLICY "Select guests: public by code" ON public.guests FOR SELECT TO anon, authenticated USING (true);
-- ==============================================================================
