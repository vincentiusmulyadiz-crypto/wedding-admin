-- ==============================================================================
-- SQL RUN: HUBUNGKAN UID BARU DENGAN RSVP DASHBOARD (TABEL public.customers)
-- Cara Pakai:
-- 1. Buka Supabase > Authentication > Users, lalu salin "User UID" akun baru.
-- 2. Tempelkan UID tersebut pada variabel v_user_uid di bawah ini.
-- 3. Isi v_slug, v_couple_names, dan v_event_date sesuai data pengantin.
-- 4. Klik "Run" di SQL Editor Supabase.
-- ==============================================================================

DO $$
DECLARE
    -- 1. GANTI DENGAN UID USER BARU DARI SUPABASE AUTHENTICATION > USERS
    v_user_uid UUID := '00000000-0000-0000-0000-000000000000';

    -- 2. ISI DATA UNDANGAN PENGANTIN
    v_slug TEXT := 'nama-pasangan';               -- Contoh: 'risa-adi' (unik, huruf kecil tanpa spasi)
    v_couple_names TEXT := 'Risa & Adi';          -- Nama tampilan pasangan di Dashboard
    v_event_date DATE := '2026-12-20';            -- Tanggal acara (Format: YYYY-MM-DD)

    -- 3. OPSIONAL: Ubah ke true HANYA jika akun ini adalah Admin Utama Joyever
    --    Biarkan false jika akun ini adalah milik Klien / Pengantin
    v_jadikan_admin BOOLEAN := false;

    v_customer_id UUID;
BEGIN
    -- Validasi apakah UID benar-benar ada di tabel auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_uid) THEN
        RAISE EXCEPTION 'UID % tidak ditemukan di auth.users! Pastikan Anda sudah membuat akunnya di menu Authentication > Users.', v_user_uid;
    END IF;

    -- Hubungkan UID dengan data undangan di public.customers
    -- Jika slug sudah ada, otomatis memindahkan kepemilikan (owner_id) ke UID baru
    INSERT INTO public.customers (slug, couple_names, event_date, owner_id)
    VALUES (v_slug, v_couple_names, v_event_date, v_user_uid)
    ON CONFLICT (slug) DO UPDATE
        SET couple_names = EXCLUDED.couple_names,
            event_date = EXCLUDED.event_date,
            owner_id = EXCLUDED.owner_id
    RETURNING id INTO v_customer_id;

    -- Jika v_jadikan_admin = true, daftarkan juga ke tabel public.admins
    IF v_jadikan_admin THEN
        INSERT INTO public.admins (user_id)
        VALUES (v_user_uid)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RAISE NOTICE 'BERHASIL! UID % kini terhubung dengan Dashboard "%" (slug: %, customer_id: %)',
        v_user_uid, v_couple_names, v_slug, v_customer_id;
END $$;

-- Tampilkan hasil data customer yang baru saja dihubungkan:
SELECT id AS customer_id, slug, couple_names, event_date, owner_id, created_at
FROM public.customers
ORDER BY created_at DESC
LIMIT 5;
