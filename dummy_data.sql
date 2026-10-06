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

    -- 4. Masukkan data sampel RSVP beragam (Hadir, Tidak Hadir, Belum Pasti)
    INSERT INTO public.rsvps (customer_id, name, attendance, guests, message, guest_param, created_at)
    VALUES
    (cust_id, 'Budi Santoso', 'hadir', 2, 'Selamat menempuh hidup baru Romeo & Juliet! Semoga menjadi keluarga yang sakinah, mawaddah, warahmah.', 'Budi Santoso', NOW() - INTERVAL '1 hour'),
    (cust_id, 'Siti Aminah & Keluarga', 'hadir', 3, 'Barakallahu lakuma wa baraka alaikuma! InsyaAllah kami sekeluarga akan hadir.', 'Siti Aminah & Keluarga', NOW() - INTERVAL '3 hours'),
    (cust_id, 'Dr. Hendra Wijaya', 'tidak_hadir', 1, 'Mohon maaf belum bisa hadir secara langsung karena ada jadwal operasi di luar kota. Doa terbaik untuk kedua mempelai.', 'Dr. Hendra Wijaya', NOW() - INTERVAL '5 hours'),
    (cust_id, 'Reza Fahlevi', 'belum_pasti', 1, 'InsyaAllah diusahakan hadir jika jadwal cuti disetujui kantor ya!', 'Reza Fahlevi', NOW() - INTERVAL '8 hours'),
    (cust_id, 'Dian Sastro & Suami', 'hadir', 2, 'Happy wedding sahabatku tercinta! Can''t wait to see you both on the big day!', 'Dian Sastro', NOW() - INTERVAL '12 hours'),
    (cust_id, 'Ahmad Fauzi', 'hadir', 1, 'Selamat bro! Lancar sampai hari H.', 'Ahmad Fauzi', NOW() - INTERVAL '1 day'),
    (cust_id, 'Nurul Hidayah', 'tidak_hadir', 1, 'Selamat atas pernikahannya. Maaf belum bisa hadir, titip salam buat keluarga besar.', 'Nurul Hidayah', NOW() - INTERVAL '1 day 4 hours'),
    (cust_id, 'Dimas Anggara', 'hadir', 4, 'Kami sekeluarga hadir meramaikan hari bahagia kalian!', 'Dimas Anggara', NOW() - INTERVAL '2 days'),
    (cust_id, 'Maya Indriani', 'belum_pasti', 2, 'Selamat ya! Nanti kami kabari lagi H-7 untuk kepastiannya.', 'Maya Indriani', NOW() - INTERVAL '2 days 6 hours'),
    (cust_id, 'Rian Pratama', 'hadir', 2, 'Congratsss bro! Semoga langgeng sampai kakek nenek!', 'Rian Pratama', NOW() - INTERVAL '3 days');

    RAISE NOTICE 'Berhasil! Data sampel untuk customer % telah dibuat.', cust_id;
END $$;
