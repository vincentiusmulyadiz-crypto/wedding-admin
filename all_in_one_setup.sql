-- ==============================================================================
-- SETUP LENGKAP SUPABASE (TABEL + RLS + REALTIME + DATA SAMPEL)
-- Jalankan skrip ini sekali di menu SQL Editor Supabase!
-- ==============================================================================

-- 1. Buat Tabel customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    couple_names TEXT NOT NULL,
    event_date DATE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel admins
CREATE TABLE IF NOT EXISTS public.admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Buat Tabel guests (Daftar Tamu & Kode Acak Undangan)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, code)
);

-- 4. Buat Tabel rsvps
CREATE TABLE IF NOT EXISTS public.rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('hadir', 'hadir_semua', 'hadir_keduanya', 'hadir_resepsi', 'hadir_adat', 'hadir_pemberkatan', 'tidak_hadir', 'belum_pasti')),
    guests INTEGER NOT NULL DEFAULT 1 CHECK (guests >= 1),
    message TEXT,
    guest_param TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_rsvps_customer_id ON public.rsvps(customer_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_attendance ON public.rsvps(attendance);
CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON public.rsvps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_customer_id ON public.guests(customer_id);
CREATE INDEX IF NOT EXISTS idx_guests_code ON public.guests(code);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON public.customers(owner_id);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Fungsi cek Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kebijakan Akses (RLS Policies)
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.admins;
CREATE POLICY "Users can check their own admin status"
ON public.admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "View customers: admin or owner" ON public.customers;
CREATE POLICY "View customers: admin or owner"
ON public.customers FOR SELECT
TO authenticated
USING (public.is_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Insert customers: admin only" ON public.customers;
CREATE POLICY "Insert customers: admin only"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Update customers: admin or owner" ON public.customers;
CREATE POLICY "Update customers: admin or owner"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_admin() OR owner_id = auth.uid())
WITH CHECK (public.is_admin() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Select guests: public by code" ON public.guests;
CREATE POLICY "Select guests: public by code"
ON public.guests FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Manage guests: admin or owner" ON public.guests;
CREATE POLICY "Manage guests: admin or owner"
ON public.guests FOR ALL
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = guests.customer_id AND customers.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = guests.customer_id AND customers.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Select rsvps: admin or owner of customer" ON public.rsvps;
CREATE POLICY "Select rsvps: admin or owner of customer"
ON public.rsvps FOR SELECT
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = rsvps.customer_id AND customers.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Insert rsvps: public / anon" ON public.rsvps;
CREATE POLICY "Insert rsvps: public / anon"
ON public.rsvps FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Delete rsvps: admin or owner of customer" ON public.rsvps;
CREATE POLICY "Delete rsvps: admin or owner of customer"
ON public.rsvps FOR DELETE
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.id = rsvps.customer_id AND customers.owner_id = auth.uid()
  )
);

-- Aktifkan Realtime untuk tabel rsvps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rsvps'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
  END IF;
END $$;

-- ==============================================================================
-- MASUKKAN DATA SAMPEL (DUMMY DATA) OTOMATIS
-- ==============================================================================
DO $$
DECLARE
    current_uid UUID;
    cust_id UUID;
BEGIN
    -- Ambil user pertama yang ada di auth.users
    SELECT id INTO current_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF current_uid IS NULL THEN
        RAISE NOTICE 'PERINGATAN: Belum ada user di auth.users. Buat akun dulu di Authentication > Users, lalu jalankan ulang bagian INSERT data dummy.';
        RETURN;
    END IF;

    -- 1. Daftarkan user sebagai admin
    INSERT INTO public.admins (user_id)
    VALUES (current_uid)
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Buat Undangan Percobaan
    INSERT INTO public.customers (slug, couple_names, event_date, owner_id)
    VALUES ('romeo-juliet', 'Romeo & Juliet', CURRENT_DATE + INTERVAL '45 days', current_uid)
    ON CONFLICT (slug) DO UPDATE 
        SET couple_names = EXCLUDED.couple_names
    RETURNING id INTO cust_id;

    -- 3. Bersihkan RSVP lama jika ada untuk customer ini
    DELETE FROM public.rsvps WHERE customer_id = cust_id;

    -- 4. Masukkan data sampel RSVP beragam dengan opsi kehadiran terbaru
    INSERT INTO public.rsvps (customer_id, name, attendance, guests, message, guest_param, created_at)
    VALUES
    (cust_id, 'Budi Santoso & Istri', 'hadir_semua', 2, '[Hadir: Attend All] Selamat menempuh hidup baru Romeo & Juliet! Kiranya cinta kasih senantiasa mengiringi setiap langkah kalian.', 'Budi Santoso', NOW() - INTERVAL '1 hour'),
    (cust_id, 'Samuel Hutabarat & Maria', 'hadir_pemberkatan', 2, '[Hadir: Pemberkatan] Puji Tuhan, selamat atas ikrar suci pernikahan kalian. Kami hadir dalam ibadah pemberkatan.', 'Samuel & Maria', NOW() - INTERVAL '2 hours'),
    (cust_id, 'Siti Aminah & Keluarga', 'hadir_resepsi', 3, '[Hadir: Reservation] Barakallah Romeo & Juliet! InsyaAllah kami sekeluarga hadir di resepsi pernikahan.', 'Siti Aminah', NOW() - INTERVAL '4 hours'),
    (cust_id, 'Batara Siregar & Dame', 'hadir_adat', 4, '[Hadir: Adat] Selamat atas pesta adatnya! Horas dan bahagia selalu untuk kedua mempelai.', 'Batara Siregar', NOW() - INTERVAL '8 hours'),
    (cust_id, 'Dian Sastro & Suami', 'hadir_keduanya', 2, '[Hadir: Keduanya] Happy wedding sahabat tercinta! Can''t wait to celebrate both ceremonies with you guys!', 'Dian Sastro', NOW() - INTERVAL '12 hours'),
    (cust_id, 'Dr. Hendra Wijaya', 'tidak_hadir', 1, 'Mohon maaf belum bisa hadir secara langsung karena tugas operasi di luar kota. Doa terbaik untuk Romeo & Juliet!', 'Dr. Hendra Wijaya', NOW() - INTERVAL '1 day'),
    (cust_id, 'Reza Fahlevi', 'belum_pasti', 1, 'InsyaAllah diusahakan hadir jika jadwal kantor memungkinkan. Selamat ya!', 'Reza Fahlevi', NOW() - INTERVAL '1 day 4 hours'),
    (cust_id, 'Dimas Anggara & Partner', 'hadir_semua', 2, '[Hadir: Attend All] Hadir untuk semua rangkaian acara! Selamat berbahagia kawan!', 'Dimas Anggara', NOW() - INTERVAL '2 days');

    RAISE NOTICE 'Sukses! Tabel dan data dummy berhasil dipersiapkan.';
END $$;
