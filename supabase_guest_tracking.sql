-- ==============================================================================
-- TRACKING BUKA UNDANGAN (SAFE RPC + ZERO SPAM + REALTIME)
-- Jalankan skrip ini SEKALI di SQL Editor Supabase!
-- ==============================================================================

-- 1. Tambah kolom opened_at pada tabel public.guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;

-- 2. Buat index performa agar pencarian timestamp cepat
CREATE INDEX IF NOT EXISTS idx_guests_opened_at ON public.guests(opened_at);

-- 3. Fungsi RPC SECURITY DEFINER untuk mencatat pembukaan undangan oleh tamu sah
--    Keamanan:
--    - Hanya meng-update baris tamu yang SUDAH ADA di tabel public.guests untuk customer terkait.
--    - Jika tamu tidak terdaftar, fungsi langsung mengembalikan FALSE dan TIDAK membuat baris baru.
--    - Mencegah spam anon insert dan duplikasi data secara total.
CREATE OR REPLACE FUNCTION public.record_guest_open(
  p_customer_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id UUID;
BEGIN
  -- Validasi parameter wajib
  IF p_customer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Prioritas 1: Cocokkan berdasarkan kode acak tamu (code)
  IF p_code IS NOT NULL AND TRIM(p_code) <> '' THEN
    SELECT id INTO v_guest_id
    FROM public.guests
    WHERE customer_id = p_customer_id AND code = TRIM(p_code)
    LIMIT 1;
  END IF;

  -- Prioritas 2: Jika belum ketemu, cocokkan berdasarkan nama tamu (case-insensitive)
  IF v_guest_id IS NULL AND p_name IS NOT NULL AND TRIM(p_name) <> '' THEN
    SELECT id INTO v_guest_id
    FROM public.guests
    WHERE customer_id = p_customer_id AND LOWER(TRIM(name)) = LOWER(TRIM(p_name))
    LIMIT 1;
  END IF;

  -- Jika tamu sah ditemukan: simpan waktu pembukaan (pertahankan waktu buka pertama)
  IF v_guest_id IS NOT NULL THEN
    UPDATE public.guests
    SET opened_at = COALESCE(opened_at, NOW())
    WHERE id = v_guest_id;
    RETURN TRUE;
  END IF;

  -- Jika tamu tidak ditemukan (misal nama acak dari luar), tolak secara aman
  RETURN FALSE;
END;
$$;

-- 4. Berikan izin eksekusi ke peran publik (anon) dan authenticated
GRANT EXECUTE ON FUNCTION public.record_guest_open(UUID, TEXT, TEXT) TO anon, authenticated;

-- 5. Pastikan realtime aktif untuk tabel guests agar dashboard langsung terupdate otomatis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'guests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
  END IF;
END $$;
