-- ==============================================================================
-- SKEMA DATABASE SUPABASE & ROW LEVEL SECURITY (RLS)
-- Dashboard Admin Undangan Pernikahan
-- ==============================================================================

-- 1. Tabel customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    couple_names TEXT NOT NULL,
    event_date DATE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel admins
CREATE TABLE IF NOT EXISTS public.admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Tabel guests (Daftar Tamu & Kode Acak Undangan)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, code)
);

-- 4. Tabel rsvps
CREATE TABLE IF NOT EXISTS public.rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('hadir', 'tidak_hadir', 'belum_pasti')),
    guests INTEGER NOT NULL DEFAULT 1 CHECK (guests >= 1),
    message TEXT,
    guest_param TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks untuk performa query dan pagination
CREATE INDEX IF NOT EXISTS idx_rsvps_customer_id ON public.rsvps(customer_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_attendance ON public.rsvps(attendance);
CREATE INDEX IF NOT EXISTS idx_rsvps_created_at ON public.rsvps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_customer_id ON public.guests(customer_id);
CREATE INDEX IF NOT EXISTS idx_guests_code ON public.guests(code);
CREATE INDEX IF NOT EXISTS idx_customers_owner ON public.customers(owner_id);

-- ==============================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Helper function: cek apakah user saat ini adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- POLICIES: admins
-- ------------------------------------------------------------------------------
-- Semua user yang login dapat mengecek status admin akunnya sendiri
CREATE POLICY "Users can check their own admin status"
ON public.admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- POLICIES: customers
-- ------------------------------------------------------------------------------
-- Admin bisa melihat semua customers, pemilik hanya bisa melihat miliknya
CREATE POLICY "View customers: admin or owner"
ON public.customers FOR SELECT
TO authenticated
USING (public.is_admin() OR owner_id = auth.uid());

-- Admin bisa menambah customer
CREATE POLICY "Insert customers: admin only"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admin atau pemilik bisa update customer
CREATE POLICY "Update customers: admin or owner"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_admin() OR owner_id = auth.uid())
WITH CHECK (public.is_admin() OR owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- POLICIES: guests
-- ------------------------------------------------------------------------------
-- Publik/tamu dapat membaca data tamu berdasarkan kode undangan
CREATE POLICY "Select guests: public by code"
ON public.guests FOR SELECT
TO anon, authenticated
USING (true);

-- Admin atau pemilik customer dapat mengelola data tamu
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

-- ------------------------------------------------------------------------------
-- POLICIES: rsvps
-- ------------------------------------------------------------------------------
-- Admin atau pemilik undangan dapat melihat RSVP untuk customer yang bersangkutan
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

-- Pengunjung publik atau tamu undangan dapat mengirim RSVP (INSERT)
CREATE POLICY "Insert rsvps: public / anon"
ON public.rsvps FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admin atau pemilik undangan dapat menghapus RSVP
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

-- ==============================================================================
-- AKTIFKAN SUPABASE REALTIME PADA TABEL rsvps
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
