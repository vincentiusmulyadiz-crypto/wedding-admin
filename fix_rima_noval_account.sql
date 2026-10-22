-- ==============================================================================
-- FIX AKUN RIMA & NOVAL (UID: 78b69efa-abcc-46a0-a82f-fac165d69989)
-- Jalankan skrip ini sekali di menu SQL Editor Supabase!
-- 1. Menghubungkan akun ke tabel public.customers
-- 2. Membersihkan metadata 56KB di auth.users (Memperbaiki 'TypeError: Load failed')
-- 3. Memasukkan seluruh 142 tamu dari backup ke tabel public.guests
-- ==============================================================================

DO $$
DECLARE
  v_uid UUID := '78b69efa-abcc-46a0-a82f-fac165d69989';
  v_cust_id UUID;
BEGIN
  -- 1. Hubungkan customer 'rima-noval' ke UID akun pengantin
  INSERT INTO public.customers (slug, couple_names, event_date, owner_id)
  VALUES ('rima-noval', 'Rima & Noval', '2026-12-20', v_uid)
  ON CONFLICT (slug) DO UPDATE
    SET owner_id = v_uid,
        couple_names = 'Rima & Noval'
  RETURNING id INTO v_cust_id;

  -- 2. Bersihkan raw_user_meta_data raksasa (56 KB) di auth.users agar JWT kembali ringan (<1 KB)
  --    Ini menghentikan penolakan header HTTP Cloudflare dan mengatasi 'TypeError: Load failed' di Safari iOS
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'email_verified', true,
    'migrated_to_db', true
  )
  WHERE id = v_uid;

  RAISE NOTICE 'Customer rima-noval berhasil dihubungkan ke UID % (customer_id: %)', v_uid, v_cust_id;
END $$;

-- 3. Masukkan / Sinkronkan 142 Tamu ke tabel public.guests
WITH cust AS (
  SELECT id FROM public.customers WHERE slug = 'rima-noval' LIMIT 1
)
INSERT INTO public.guests (customer_id, name, phone, code)
SELECT 
  cust.id,
  g.name,
  g.phone,
  g.code
FROM cust,
(VALUES
  ('Bang Panji', '081364392141', 'bangm1hz0'),
  ('Eky & partner', '0895359440332', 'ekypfs7c1'),
  ('Pasukan Alerdo', '', 'pasuw1kx2'),
  ('Aisyah & keluarga', '+62 853-3801-5385', 'aisy4gkd3'),
  ('Nadia & keluarga', '+62 857-1500-0015', 'nadidd7r4'),
  ('Elang & partner', '+62 877-3801-6466', 'elanv1yr5'),
  ('Febi & keluarga', '+62 812-9097-9959', 'febitkjf6'),
  ('Aziz & keluarga', '+62 859-2104-8700', 'azizro0c7'),
  ('Levin', '+62 812-8357-2698', 'levi17nc8'),
  ('Novan & partner', '+62 851-2193-1773', 'novayqqz9'),
  ('Alika', '+62 821-3644-2194', 'alik11pt10'),
  ('Aurel', '+62 858-8533-2962', 'aure11vr11'),
  ('Ary', '+62 858-8458-1074', 'ary1f0ox12'),
  ('Marcel', '+62 817-0863-187', 'marcx18713'),
  ('Yashifa Yasmine', '+44 7538 224492', 'yashjtdn14'),
  ('Salsa', '0895614769621', 'sals1bf515'),
  ('Diana', '+62 812-8802-1913', 'dian13b416'),
  ('Afiifah', '+62 819-4574-5714', 'afii9kgr17'),
  ('Dhia', '+62 813-7259-3549', 'dhia19mt18'),
  ('Akil & partner', '+62 853-8538-3387', 'akilp5fk19'),
  ('Satria', '+62 821-2346-8324', 'satru6ww20'),
  ('Makarima & keluarga', '+62 856-4274-1326', 'maka6iha21'),
  ('Hanum & keluarga', '+62 852-2671-6234', 'hanuiu4q22'),
  ('Imma & partner', '+62 877-3961-0654', 'imma4i8v23'),
  ('Naila & keluarga', '+62 851-7684-6804', 'nails1ai24'),
  ('Ellen & keluarga', '+62 857-4256-8510', 'elleb9qj25'),
  ('Arih & pasangan', '+62 856-0152-6836', 'arih2hhk26'),
  ('Lia & keluarga', '+62 858-9011-8088', 'liakgvbz27'),
  ('Lilis & keluarga', '+62 858-7606-0260', 'lilibude28'),
  ('Desita Ayu', '+62 851-5677-7113', 'desiwmav29'),
  ('Vina Dina', '+62 857-4222-7444', 'vinae8k430'),
  ('Noviantika Rahma', '+62 813-3984-5786', 'novijxwe31'),
  ('Dea', '+62 857-9279-7958', 'dea1gwwx32'),
  ('Diani 🤍', '+62 815-1744-1909', 'dian2qqa33'),
  ('Aprilia', '+62 856-0088-0930', 'apriefv834'),
  ('Hilda', '+62 858-3065-0591', 'hild15ii35'),
  ('Mba Renny & Suami', '+62 895-4216-93203', 'mbartw3f36'),
  ('Ikhtiar', '+62 857-8666-5630', 'ikhtcppo37'),
  ('Mak Uwo dan Keluarga', '+6282161337541', 'makug68w38'),
  ('Bang Gilang dan Keluarga', '+62 812-7787-1396', 'bangoh7339'),
  ('Riki', '+62 823-8436-2761', 'riki1ilf40'),
  ('Ni Mela dan Keluarga', '+62 851-7102-2506', 'nime2h6241'),
  ('Om Ujang dan Nte Yul', '+62 813-2060-1060', 'omujb6oe42'),
  ('Etek dan Apak', '‪+62 821‑7182‑8620‬', 'etekydu443'),
  ('Uncle dan Nte Rini', '‪+62 895‑2985‑4263‬', 'unclffqp44'),
  ('Ni Eni dan Keluarga', '‪+62 812‑7040‑9208', 'nienene645'),
  ('Bang Epi dan Keluarga', '+62 852-7255-8010', 'bang6rzt46'),
  ('Bang Edo dan Kak Shelly', '+62 812-7787-4409', 'bangcr6k47'),
  ('Ryan', '+62 812-7669-1260', 'ryan1ix148'),
  ('Ben and partner', '+62 822-9963-9229', 'benacdg849'),
  ('Rafif and partner', '+62 811-808-025', 'rafib0fv50'),
  ('Rafif and partner', '+62 823-3133-2625', 'rafib0fv51'),
  ('Refi and partner', '+62 823-1826-1710', 'refitaha52'),
  ('Syauqi and partner', '+62 856-9257-3803', 'syau15uo53'),
  ('Hayyun and partner', '+62 851-5775-6269', 'hayykbq854'),
  ('Habib & keluarga', '+62 822-8655-3325', 'habibup955'),
  ('Ajo & partner', '+62 812-6728-3793', 'ajopowvz56'),
  ('Roma & partner', '+62 822-8251-7294', 'romae1qd57'),
  ('Ica & Juned', '+62 812-7594-8842', 'icajcf3w58'),
  ('Della & keluarga', '+62 852-6443-8853', 'dellpz7t59'),
  ('Dwieka & partner', '+62 812-6755-0409', 'dwiesq4j60'),
  ('Harif & keluarga', '+62 822-8390-4833', 'harisoe461'),
  ('Fadly & partner', '+62 821-7321-5920', 'fadlkdy762'),
  ('Nesti & Arif', '+62 813-1579-3297', 'nestyqs663'),
  ('Ibes & partner', '+62 823-8600-6995', 'ibes1jgk64'),
  ('Rina & partner', '+62 812-8696-8642', 'rinah78765'),
  ('Any & keluarga', '+62 821-1662-4112', 'anyk68w566'),
  ('Uut & keluarga', '+62 811-664-165', 'uutk50jg67'),
  ('Gege & partner', '+62 821-1093-8696', 'gege58h168'),
  ('Wankawan KBM EP 2016 (Pasukan Api Padam)', '', 'wankngov69'),
  ('Adit & partner', '+62 812-2155-8336', 'aditygp070'),
  ('Fajrin & keluarga', '+62 821-6909-1772', 'fajr7yjc71'),
  ('Izi & partner', '085335640019', 'izip6o7772'),
  ('Jonathan & partner', '+62 811-864-800', 'jonahiyi73'),
  ('Ucup & partner', '+62 822-7689-4447', 'ucupgl4174'),
  ('Awir & keluarga', '+62 877-8303-3921', 'awirzcxm75'),
  ('Thao & partner', '‪+62 812‑1404‑4078‬', 'thaocai776'),
  ('Gerry & partner', '‪+62 859‑2060‑5003‬', 'gerrrs5x77'),
  ('Eldi & keluarga', '‪+62 812‑8744‑1712‬', 'eldijbs678'),
  ('Reza & partner', '‪+62 812‑8534‑8395‬', 'reza8swz79'),
  ('Daffa & partner', '‪+62 818‑755‑080‬', 'dafflyxt80'),
  ('Sespa & partner', '+62 812-7410-7638', 'sespydme81'),
  ('Andesky & keluarga', '‪+62 822‑8639‑5137‬', 'andeq1dk82'),
  ('Nicky & partner', '‪+62 895‑6026‑56857‬', 'nickdm1k83'),
  ('Rizad & partner', '‪+62 856‑1198‑112‬', 'rizaysze84'),
  ('Kiki', '+62 812-6671-8572', 'kiki1e4i85'),
  ('Rian', '+62 821-8535-2352', 'rian1il686'),
  ('Bella & partner', '‪+62 813‑7472‑5296‬', 'bell6m1h87'),
  ('Benny & Angie', '+62 812-8888-7107', 'bennr9fr88'),
  ('Irfan & keluarga', '+62 813-1879-2287', 'irfaw29i89'),
  ('Stefani & partner', '', 'stef6wmy90'),
  ('Danang & keluarga', '+62 812-7112-759', 'dana7vke91'),
  ('Manda & partner', '081278508611', 'mand9tk992'),
  ('Dhoni & keluarga', '082123358870', 'dhonv3wz93'),
  ('Rania & partner', '‪+62 822‑6101‑0159‬', 'ranigjql94'),
  ('Risyam & partner', '082148547812', 'risy2q0a95'),
  ('Jay & partner', '085172067529', 'jaypttqs96'),
  ('Hansen & partner', '085171158204', 'hans30vi97'),
  ('Iman & partner', '081249650691', 'imane3s198'),
  ('Ardan & partner', '‪‪+62 859‑2424‑6191‬', 'ardae0tq99'),
  ('Reza & partner', '‪+62 812‑1919‑6672‬', 'reza8swz0'),
  ('Hans & partner', '‪+62 821‑2395‑9062‬', 'hansuvw61'),
  ('Faqih & partner', '‪+62 818‑0701‑8731‬', 'faqitxes2'),
  ('Anay & partner', '087810111945', 'anayxd2o3'),
  ('Bang Abby & partner', '+62 821-7092-7456', 'bangxlnx4'),
  ('Da Amaik & partner', '+62 811-3224-6557', 'daam4nxf5'),
  ('Da Iyan', '+62 813-8669-5966', 'daiykxdl6'),
  ('Da Beny & keluarga', '+62 812-7035-3409', 'dabed5kj7'),
  ('Irene & partner', '+62 823-7085-9914', 'irenlf148'),
  ('Da Yogi & keluarga', '+62 812-6711-609', 'dayokqco9'),
  ('Gresela & partner', '+62 822-7324-3919', 'gresb5qe10'),
  ('Azizah & partner', '+62 822-8360-1990', 'azizao3p11'),
  ('Kak Marsha & keluarga', '+62 823-8539-5407', 'kakmw40j12'),
  ('Riska & partner', '+62 822-8820-4779', 'riskwebd13'),
  ('Vera & partner', '+62 812-7514-8667', 'verabpe114'),
  ('Pasukan Emosian Pada Masanya', '', 'pasu4w9y15'),
  ('Mima & partner', '+62 823-6969-5826', 'mimae5r616'),
  ('Jacky & partner', '+62 821-6621-6688', 'jackj87o17'),
  ('Nur Hidayat & partner', '+62 812-6231-2757', 'nurheqln18'),
  ('Arin & partner', '+62 812-6890-9689', 'arin2s1a19'),
  ('Voni & partner', '+62 813-8082-5033', 'voni10pt20'),
  ('Refni & partner', '+62 878-4845-2324', 'refnp5ij21'),
  ('Tiwi & partner', '+62 812-9814-1398', 'tiwi4yme22'),
  ('Bang Rangga & partner', '+62 878-2352-1615', 'bangj3yr23'),
  ('Filza & partner', '+62 899-8828-288', 'filzij0w24'),
  ('Raan & partner', '+62 853-5262-1014', 'raan2wz325'),
  ('Agung & Cut Putri Nabila', '+62 853-9099-8075', 'agun6hgf26'),
  ('Laju & partner', '+62 813-6232-6599', 'lajuhw5e27'),
  ('Munawar & partner', '+62 811-6877-775', 'muna1ada28'),
  ('Rifqan & partner', '+62 823-6644-4671', 'rifqqznr29'),
  ('Cika & partner', '+62 852-6020-5558', 'cika5ulu30'),
  ('Nurul & partner', '‪+62 822‑4166‑4371‬', 'nuruz35v31'),
  ('Mimi & partner', '‪+62 811‑6800‑812‬', 'mimiw7tt32'),
  ('Anggi & partner', '‪+62 813‑6401‑3838‬', 'anggo7ad33'),
  ('Ayi & partner', '‪+62 821‑6555‑4471‬', 'ayiproad34'),
  ('Muslim & partner', '‪+62 852‑7786‑5703‬', 'musl7chb35'),
  ('IPS nya SMANTIG 14', '', 'ipsndo3u36'),
  ('Harry & partner', '+62 811-2204-397', 'harrf4lg37'),
  ('Kimul & partner', '+62 823-0440-2389', 'kimudurd38'),
  ('Mulki & partner', '+62 821-9999-0507', 'mulkyzgm39'),
  ('Syawal & partner', '+62 852-7329-6183', 'syaw9f7r40'),
  ('Keluarga SMANTIG ♂️ 34', '', 'kelu97z241')
) AS g(name, phone, code)
ON CONFLICT (customer_id, code) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone;

-- Verifikasi hasil:
SELECT id, slug, couple_names, owner_id FROM public.customers WHERE slug = 'rima-noval';
SELECT COUNT(*) AS total_tamu_rima_noval FROM public.guests WHERE customer_id = (SELECT id FROM public.customers WHERE slug = 'rima-noval');
