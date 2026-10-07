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

    RAISE NOTICE 'Berhasil! Data sampel untuk customer % telah dibuat.', cust_id;
END $$;
