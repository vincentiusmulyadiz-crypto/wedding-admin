-- ==============================================================================
-- SKRIP DATA SAMPEL (DUMMY DATA) SUPABASE
-- Jalankan di SQL Editor Supabase untuk mencoba dashboard langsung dengan data
-- ==============================================================================

DO $$
DECLARE
    current_uid UUID;
    cust_id UUID;
BEGIN
    -- Ambil ID user pertama yang ada di auth.users (atau ganti dengan UID spesifik)
    SELECT id INTO current_uid FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF current_uid IS NULL THEN
        RAISE EXCEPTION 'Belum ada user di auth.users. Buat user terlebih dahulu di Authentication > Users!';
    END IF;

    -- 1. Daftarkan user sebagai admin (agar memiliki akses penuh)
    INSERT INTO public.admins (user_id)
    VALUES (current_uid)
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Buat / Ambil Customer Percobaan
    INSERT INTO public.customers (slug, couple_names, event_date, owner_id)
    VALUES ('romeo-juliet', 'Romeo & Juliet', CURRENT_DATE + INTERVAL '45 days', current_uid)
    ON CONFLICT (slug) DO UPDATE 
        SET couple_names = EXCLUDED.couple_names
    RETURNING id INTO cust_id;

    -- 3. Hapus data RSVP lama jika ada untuk customer ini (opsional)
    DELETE FROM public.rsvps WHERE customer_id = cust_id;

    -- 4. Masukkan data sampel RSVP menggunakan nama asli dan pesan autentik
    INSERT INTO public.rsvps (customer_id, name, attendance, guests, message, guest_param, created_at)
    VALUES
    (cust_id, 'Rian Pratama & Anisa Rahma', 'hadir', 2, 'Selamat menempuh hidup baru Romeo & Juliet! Semoga selalu rukun, bahagia, dan penuh berkah.', 'Rian Pratama', NOW() - INTERVAL '1 hour'),
    (cust_id, 'Dimas Setiawan & Nadia Putri', 'hadir', 2, 'Happy wedding Romeo & Juliet! Doa terbaik untuk kalian berdua, semoga langgeng sampai tua ya.', 'Dimas Setiawan', NOW() - INTERVAL '2 hours');

    RAISE NOTICE 'Berhasil! Data sampel untuk customer % telah dibuat.', cust_id;
END $$;
