# Script untuk membuat PDF Tutorial Resmi Joyever RSVP Dashboard (Pristine Typography)
$ErrorActionPreference = "Stop"

$workspaceDir = "C:\Users\MSI\Downloads\wedding-admin"
$logoPath = Join-Path $workspaceDir "src\assets\logo-joyever-clean.png"

if (Test-Path $logoPath) {
    $logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
    $logoBase64 = [Convert]::ToBase64String($logoBytes)
    $logoSrc = "data:image/png;base64,$logoBase64"
} else {
    $logoSrc = ""
}

$htmlContent = @"
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Panduan Penggunaan RSVP Dashboard Joyever</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=JetBrains+Mono:wght@500;700&display=swap');

  @page {
    size: A4 portrait;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a333c;
    background-color: #faf6ee;
    line-height: 1.45;
    font-size: 11.5px;
  }

  .page {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    padding: 18mm 20mm 16mm 20mm;
    margin: 0 auto;
    page-break-after: always;
    position: relative;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* PAGE 1: COVER */
  .page-cover {
    background: #0f3b47;
    color: #ffffff;
    padding: 24mm 22mm;
    justify-content: space-between;
  }

  .cover-border-box {
    border: 1px solid rgba(222, 212, 190, 0.35);
    height: 100%;
    padding: 28mm 20mm 20mm 20mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    background: radial-gradient(circle at top right, rgba(23, 75, 89, 0.45) 0%, rgba(15, 59, 71, 0) 65%);
  }

  .cover-logo {
    height: 48px;
    width: auto;
    object-contain: contain;
    margin-bottom: 25px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
  }

  .cover-badge {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(222, 212, 190, 0.15);
    border: 1px solid rgba(222, 212, 190, 0.4);
    color: #ded4be;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .cover-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 34px;
    font-weight: 700;
    line-height: 1.2;
    color: #fffdf9;
    margin-bottom: 16px;
  }

  .cover-subtitle {
    font-size: 14px;
    color: #c9d8dc;
    max-width: 480px;
    line-height: 1.6;
    margin-bottom: 30px;
  }

  .cover-highlight-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: 20px;
  }

  .cover-highlight-card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(222, 212, 190, 0.25);
    padding: 12px 14px;
    border-radius: 12px;
  }

  .cover-highlight-card h4 {
    font-size: 11px;
    color: #f0ebd9;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .cover-highlight-card p {
    font-size: 9.5px;
    color: #a4c2cb;
    line-height: 1.4;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(222, 212, 190, 0.25);
    padding-top: 16px;
    font-size: 10.5px;
    color: #ded4be;
    font-weight: 600;
  }

  /* INNER PAGES HEADER & FOOTER */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 10px;
    border-bottom: 1.5px solid #ded4be;
    margin-bottom: 14px;
  }

  .page-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chapter-pill {
    background: #0f3b47;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    padding: 3px 9px;
    border-radius: 6px;
  }

  .page-header-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 16px;
    font-weight: 700;
    color: #0e2c34;
  }

  .page-header-right {
    font-size: 9.5px;
    color: #5e7d87;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .page-footer {
    position: absolute;
    bottom: 10mm;
    left: 20mm;
    right: 20mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px solid #ded4be;
    font-size: 9px;
    color: #5e7d87;
  }

  .page-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* CARD & CONTENT BLOCKS */
  .intro-box {
    background: #faf6ee;
    border: 1px solid #ded4be;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 11px;
    color: #2c464e;
    line-height: 1.5;
  }

  .intro-box strong {
    color: #0f3b47;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e2dac9;
    border-radius: 12px;
    padding: 12px 14px;
    box-shadow: 0 1px 3px rgba(15, 59, 71, 0.04);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f0ebd9;
  }

  .badge-step {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0f3b47;
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    shrink: 0;
  }

  .card-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #0e2c34;
  }

  .card-subtitle {
    font-size: 9.5px;
    color: #5e7d87;
    margin-left: auto;
    font-weight: 600;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .subcard {
    background: #faf6ee;
    border: 1px solid #ded4be;
    border-radius: 8px;
    padding: 9px 11px;
  }

  .subcard h4 {
    font-size: 11px;
    font-weight: 700;
    color: #0f3b47;
    margin-bottom: 3px;
  }

  .subcard p {
    font-size: 10px;
    color: #43636d;
    line-height: 1.4;
  }

  /* UI MOCKUPS */
  .ui-mockup {
    background: #faf6ee;
    border: 1px solid #d5c8ad;
    border-radius: 10px;
    padding: 10px 12px;
    margin: 6px 0;
  }

  .ui-input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }

  .ui-input {
    background: #ffffff;
    border: 1px solid #ded4be;
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 10px;
    color: #0e2c34;
    flex: 1;
  }

  .ui-btn {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-align: center;
  }

  .ui-btn-primary {
    background: #0f3b47;
    color: #ffffff;
  }

  .ui-btn-wa {
    background: #059669;
    color: #ffffff;
  }

  .ui-btn-secondary {
    background: #f0ebd9;
    border: 1px solid #ded4be;
    color: #0f3b47;
  }

  .tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }

  .tag-green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .tag-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .tag-rose { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
  .tag-teal { background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }

  .notice-tip {
    background: #f0ebd9;
    border-left: 3.5px solid #0f3b47;
    padding: 8px 12px;
    border-radius: 0 8px 8px 0;
    font-size: 10px;
    color: #2c464e;
    line-height: 1.45;
  }

  .notice-tip strong {
    color: #0f3b47;
  }

  ul.check-list {
    list-style: none;
    padding-left: 0;
  }

  ul.check-list li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 5px;
    font-size: 10.5px;
    color: #2c464e;
    line-height: 1.4;
  }

  ul.check-list li::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #059669;
  }

  .timeline-step {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 8px 10px;
    background: #faf6ee;
    border: 1px solid #ded4be;
    border-radius: 8px;
  }

  .timeline-badge {
    background: #0f3b47;
    color: #ded4be;
    font-size: 9.5px;
    font-weight: 800;
    padding: 3px 7px;
    border-radius: 6px;
    white-space: nowrap;
    shrink: 0;
  }
</style>
</head>
<body>

<!-- ==================== HALAMAN 1: COVER ==================== -->
<div class="page page-cover">
  <div class="cover-border-box">
    <div>
      <img src="$logoSrc" alt="Joyever" class="cover-logo">
      <div class="cover-badge">Panduan Resmi Calon Pengantin</div>
      <h1 class="cover-title">Panduan Penggunaan<br>RSVP Dashboard</h1>
      <p class="cover-subtitle">
        Kelola daftar tamu, sebar undangan personal via WhatsApp, dan pantau konfirmasi kehadiran secara rapi, cepat, dan otomatis.
      </p>

      <div class="cover-highlight-grid">
        <div class="cover-highlight-card">
          <h4>Tautan Personal</h4>
          <p>Tamu disambut nama khusus di cover undangan digital Anda.</p>
        </div>
        <div class="cover-highlight-card">
          <h4>Kirim WA Otomatis</h4>
          <p>Kirim pesan personal ke tamu hanya dengan satu sentuhan.</p>
        </div>
        <div class="cover-highlight-card">
          <h4>Rekap Porsi Akurat</h4>
          <p>Hitung total porsi fisik katering tanpa perlu mencatat manual.</p>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <span>Joyever Wedding Management System</span>
      <span>Edisi Panduan 2026</span>
    </div>
  </div>
</div>

<!-- ==================== HALAMAN 2: LOGIN & NAVIGASI ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">01</span>
      <h2 class="page-header-title">Memulai & Masuk ke Dashboard</h2>
    </div>
    <div class="page-header-right">Joyever RSVP Dashboard</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Dashboard RSVP Joyever dapat diakses melalui browser di HP maupun laptop Anda. Sistem ini memudahkan Anda memantau konfirmasi tamu secara langsung dari database tanpa spreadsheet manual.
    </div>

    <!-- Card 1: Cara Login -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">Langkah Masuk (Login)</h3>
        <span class="card-subtitle">Layar Autentikasi</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; margin-bottom: 8px;">
        Gunakan alamat email dan kata sandi yang telah didaftarkan untuk pernikahan Anda.
      </p>

      <div class="ui-mockup">
        <div style="font-size: 9.5px; font-weight: 700; color: #0f3b47; margin-bottom: 6px;">Form Masuk Pengantin</div>
        <div class="ui-input-row">
          <input class="ui-input" type="text" value="Alamat Email (misal: pengantin@wedding.com)" readonly>
        </div>
        <div class="ui-input-row">
          <input class="ui-input" type="password" value="••••••••" readonly>
        </div>
        <div style="margin-top: 4px;">
          <span class="ui-btn ui-btn-primary" style="width: 100%;">Masuk ke Dashboard</span>
        </div>
      </div>

      <ul class="check-list" style="margin-top: 8px;">
        <li><strong>Sesi Tersimpan Otomatis:</strong> Setelah berhasil masuk, sesi akun tersimpan di perangkat Anda sehingga Anda tidak perlu mengetik ulang setiap kali membuka dashboard.</li>
        <li><strong>Aman di Ponsel:</strong> Tampilan dashboard telah dioptimalkan khusus untuk layar ponsel (Safari iPhone & Chrome Android).</li>
      </ul>
    </div>

    <!-- Card 2: Mengenal Menu Navigasi -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Mengenal Tab Menu Utama</h3>
        <span class="card-subtitle">Bilah Menu Bawah / Atas</span>
      </div>

      <div class="grid-2">
        <div class="subcard">
          <h4>Ringkasan</h4>
          <p>Pantau total porsi fisik tamu yang akan hadir, grafik kehadiran berwarna, dan ucapan doa restu terbaru secara instan.</p>
        </div>
        <div class="subcard">
          <h4>Tautan Tamu</h4>
          <p>Tempat utama menambah nama tamu, mengatur jatah kuota pax, dan mengirim undangan personal langsung via WhatsApp.</p>
        </div>
        <div class="subcard">
          <h4>Daftar Tamu</h4>
          <p>Cari nama tamu tertentu, baca isi doa restu secara lengkap, dan unduh data ke Excel/CSV untuk katering.</p>
        </div>
        <div class="subcard">
          <h4>Manajemen Meja (Add-on)</h4>
          <p>Atur penempatan nomor meja dan kapasitas kursi jika acara Anda menggunakan konsep <em>allocated seating</em>.</p>
        </div>
      </div>
    </div>

    <div class="notice-tip">
      <strong>Tips Keluar (Logout):</strong> Ikon pintu keluar di pojok kanan atas dapat Anda gunakan jika ingin berpindah perangkat. Data tamu yang sudah Anda input tetap aman tersimpan di cloud.
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 2</span>
  </div>
</div>

<!-- ==================== HALAMAN 3: TAUTAN TAMU & WA ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">02</span>
      <h2 class="page-header-title">Mengundang Tamu via WhatsApp</h2>
    </div>
    <div class="page-header-right">Tab Tautan Tamu</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Tab <strong>"Tautan Tamu"</strong> adalah pusat aktivitas Anda dalam menyebarkan undangan. Di sinilah tautan personal dibuat dan dikirim ke keluarga maupun rekan Anda.
    </div>

    <!-- Langkah 1: Input Tamu -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">Tempel & Tambah Nama Tamu</h3>
      </div>

      <p style="font-size: 10px; color: #43636d; margin-bottom: 6px;">
        Anda dapat menambahkan tamu satu per satu atau menyalin puluhan nama sekaligus dari Excel/WhatsApp:
      </p>

      <div class="ui-mockup">
        <div class="ui-input-row">
          <input class="ui-input" style="flex: 2;" value="Budi & Keluarga" readonly>
          <input class="ui-input" style="flex: 1.5;" value="08123456789" readonly>
          <input class="ui-input" style="flex: 1;" value="2 Tamu" readonly>
          <span class="ui-btn ui-btn-primary">+ Tambah Tamu</span>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 6px;">
        <div class="subcard">
          <h4>Fitur Tempel Banyak Sekaligus</h4>
          <p>Klik tombol <strong>"Tempel Banyak Sekaligus"</strong> di atas. Salin daftar nama dari WhatsApp/Excel dengan format: <em>Nama, Nomor HP, Jatah Tamu</em>. Puluhan tautan akan dibuat dalam 1 detik.</p>
        </div>
        <div class="subcard">
          <h4>Jatah Tamu (Pax)</h4>
          <p>Tentukan kuota pendamping yang boleh dibawa (1 hingga 6 orang). Tamu tidak akan bisa mengisi jumlah kehadiran melebihi batas jatah yang Anda tentukan.</p>
        </div>
      </div>
    </div>

    <!-- Langkah 2: Format & Filter -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Cek & Atur Tautan Undangan</h3>
      </div>

      <ul class="check-list">
        <li><strong>Format Tautan:</strong> Pilih <em>"Dengan Pesan"</em> (menyertakan redaksi pengantar santun) atau <em>"Tautan Saja"</em> (hanya mengirimkan link undangan).</li>
        <li><strong>Filter Status Undangan:</strong> Pantau siapa saja yang <span class="tag tag-amber">Belum Dibuka</span>, <span class="tag tag-teal">Sudah Dibuka</span>, atau <span class="tag tag-green">Sudah Konfirmasi</span>.</li>
        <li><strong>Salin Semua Tautan:</strong> Tombol di bilah atas untuk menyalin seluruh rekap nama beserta tautan masing-masing sekaligus.</li>
      </ul>
    </div>

    <!-- Langkah 3: Kirim WA -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">3</span>
        <h3 class="card-title">Kirim via WhatsApp & Ubah Template</h3>
      </div>

      <p style="font-size: 10px; color: #43636d; margin-bottom: 6px;">
        Tiap tamu memiliki tombol hijau <strong>"Kirim via WhatsApp"</strong>. Begitu disentuh, aplikasi WhatsApp otomatis terbuka dengan pesan personal yang siap kirim.
      </p>

      <div class="subcard">
        <h4>Kustomisasi Template Pesan WhatsApp</h4>
        <p>Klik tombol <strong>"Ubah Template Pesan WhatsApp"</strong> untuk menyesuaikan kata-kata. Anda dapat menyisipkan kode otomatis berikut:</p>
        <div style="margin-top: 4px; display: flex; gap: 6px;">
          <span class="tag tag-teal">{nama} : Nama Tamu</span>
          <span class="tag tag-teal">{tautan} : Link Khusus</span>
          <span class="tag tag-teal">{pax} : Jumlah Jatah</span>
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 3</span>
  </div>
</div>

<!-- ==================== HALAMAN 4: RINGKASAN KEHADIRAN ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">03</span>
      <h2 class="page-header-title">Memantau Jumlah Kehadiran</h2>
    </div>
    <div class="page-header-right">Tab Ringkasan</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Tab <strong>"Ringkasan"</strong> memberikan gambaran menyeluruh tentang respon para tamu. Data diperbarui secara otomatis setiap kali ada tamu yang mengirimkan konfirmasi kehadiran.
    </div>

    <!-- Stat Angka Tamu Hadir -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">Total Porsi Fisik yang Akan Hadir</h3>
        <span class="card-subtitle">Kalkulasi Otomatis</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Kotak angka besar di bagian atas tidak hanya menghitung jumlah tamu yang konfirmasi, melainkan menghitung <strong>total porsi katering fisik</strong> riil (termasuk pasangan atau keluarga yang mereka ajak).
      </p>

      <div class="grid-3">
        <div class="subcard" style="border-left: 3px solid #059669;">
          <h4 style="color: #059669;">Hadir (Pasti)</h4>
          <p>Tamu yang sudah memilih 'Hadir' beserta jumlah orang yang dipastikan ikut.</p>
        </div>
        <div class="subcard" style="border-left: 3px solid #d97706;">
          <h4 style="color: #d97706;">Belum Pasti</h4>
          <p>Tamu yang memilih opsi 'Ragu-ragu / Belum Pasti' karena jadwal belum cocok.</p>
        </div>
        <div class="subcard" style="border-left: 3px solid #e11d48;">
          <h4 style="color: #e11d48;">Tidak Hadir</h4>
          <p>Tamu yang berhalangan hadir namun tetap dapat mengirimkan doa restu.</p>
        </div>
      </div>
    </div>

    <!-- Visualisasi Grafik Kehadiran -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Grafik Warna Status Kehadiran</h3>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Bagan proporsi warna memudahkan Anda melihat rasio kehadiran dalam sekejap mata:
      </p>

      <div style="background: #faf6ee; border: 1px solid #ded4be; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
        <div style="height: 14px; display: flex; border-radius: 7px; overflow: hidden; margin-bottom: 6px;">
          <div style="background: #059669; width: 68%;"></div>
          <div style="background: #d97706; width: 18%;"></div>
          <div style="background: #e11d48; width: 14%;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; color: #0e2c34;">
          <span style="color: #059669;">Tamu Hadir: 68%</span>
          <span style="color: #d97706;">Belum Pasti: 18%</span>
          <span style="color: #e11d48;">Tidak Hadir: 14%</span>
        </div>
      </div>

      <p style="font-size: 10px; color: #5e7d87;">
        Grafik ini membantu Anda menentukan kapan harus mengunci pesanan katering dan suvenir bersama pihak vendor pernikahan.
      </p>
    </div>

    <!-- Doa & Ucapan Terbaru -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">3</span>
        <h3 class="card-title">Doa Restu & Pesan Terbaru</h3>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5;">
        Tiga ucapan dan doa hangat teranyar langsung muncul di bagian bawah tab Ringkasan. Untuk membaca seluruh ucapan dari semua tamu tanpa terkecuali, Anda dapat beralih ke tab <strong>"Daftar Tamu"</strong>.
      </p>
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 4</span>
  </div>
</div>

<!-- ==================== HALAMAN 5: DAFTAR TAMU & EKSPOR ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">04</span>
      <h2 class="page-header-title">Mengelola Data Tamu & Laporan</h2>
    </div>
    <div class="page-header-right">Tab Daftar Tamu</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Tab <strong>"Daftar Tamu"</strong> berfungsi sebagai buku tamu digital resmi Anda. Di sini Anda bisa memfilter tamu, membaca ucapan lengkap, serta mengunduh berkas laporan katering.
    </div>

    <!-- Pencarian & Filter Cepat -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">Pencarian Cepat & Filter Status</h3>
      </div>

      <p style="font-size: 10px; color: #43636d; margin-bottom: 6px;">
        Ketik nama tamu di kotak pencarian untuk melihat status konfirmasinya seketika:
      </p>

      <div class="ui-mockup">
        <div class="ui-input-row">
          <input class="ui-input" style="flex: 2;" value="Ketik nama tamu untuk mencari..." readonly>
          <span class="ui-btn ui-btn-secondary">Semua (120)</span>
          <span class="ui-btn ui-btn-secondary" style="color: #059669;">Hadir (85)</span>
          <span class="ui-btn ui-btn-secondary" style="color: #d97706;">Ragu (15)</span>
        </div>
      </div>
    </div>

    <!-- Membaca Pesan & Edit -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Panel Rincian Doa Restu & Sunting Data</h3>
      </div>

      <div class="grid-2">
        <div class="subcard">
          <h4>Baca Pesan Lengkap</h4>
          <p>Sentuh atau klik pada nama tamu mana saja di tabel untuk membuka panel samping. Anda dapat membaca doa restu panjang, melihat tanggal & jam pengisian RSVP, serta nomor kontak tamu.</p>
        </div>
        <div class="subcard">
          <h4>Koreksi Data Salah</h4>
          <p>Jika tamu salah mengisi jumlah orang atau berubah pikiran, Anda dapat menghapus entri RSVP tersebut dari panel rincian agar tamu dapat mengisi ulang dengan benar.</p>
        </div>
      </div>
    </div>

    <!-- Ekspor ke Excel / CSV -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">3</span>
        <h3 class="card-title">Ekspor ke Excel / File CSV</h3>
        <span class="card-subtitle">Untuk Katering & WO</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Vendor katering, hotel, maupun wedding organizer sering kali meminta data cetak rekap tamu. Anda dapat mengunduh data lengkap dalam format spreadsheet resmi.
      </p>

      <div class="subcard" style="background: #ecfdf5; border-color: #a7f3d0;">
        <h4 style="color: #047857;">Cara Mengunduh Laporan CSV:</h4>
        <ol style="padding-left: 16px; font-size: 10px; color: #065f46; line-height: 1.5;">
          <li>Klik tombol <strong>"Opsi"</strong> di pojok kanan atas tab Daftar Tamu.</li>
          <li>Pilih menu <strong>"Ekspor ke File CSV"</strong>.</li>
          <li>File akan langsung terunduh dan dapat dibuka di <strong>Microsoft Excel</strong>, <strong>Google Sheets</strong>, atau <strong>Numbers (Apple)</strong>.</li>
        </ol>
      </div>
    </div>

    <div class="notice-tip">
      <strong>Catatan Katering:</strong> Kolom 'Jumlah Tamu' di dalam file CSV mencatat angka porsi aktual yang dikonfirmasi tamu, sehingga tim dapur katering bisa mempersiapkan porsi secara presisi.
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 5</span>
  </div>
</div>

<!-- ==================== HALAMAN 6: MANAJEMEN MEJA & KATEGORI ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">05</span>
      <h2 class="page-header-title">Fitur Tambahan: Manajemen Meja & Kategori</h2>
    </div>
    <div class="page-header-right">Fitur Pilihan (Add-on)</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Jika paket undangan Anda dilengkapi fitur <strong>Manajemen Meja</strong> atau <strong>Kategori Tamu</strong>, panduan ini akan membantu Anda menata penempatan duduk dan membedakan tamu kehormatan.
    </div>

    <!-- Manajemen Meja -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">Penataan Meja Duduk (Manajemen Meja)</h3>
        <span class="card-subtitle">Tab Manajemen Meja</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Cocok untuk resepsi berkonsep <em>sit-down dinner</em>, pesta <em>round table</em>, atau ruangan VIP keluarga.
      </p>

      <div class="grid-3">
        <div class="subcard">
          <h4>1. Buat Meja Baru</h4>
          <p>Tentukan nama/kode meja (misal: "MEJA 01", "MEJA VIP KELUARGA"), pilih bentuk (Bundar/Persegi), dan kapasitas kursi (misal: 8 kursi).</p>
        </div>
        <div class="subcard">
          <h4>2. Tempatkan Tamu</h4>
          <p>Pilih nama tamu dari daftar untuk ditempatkan ke meja tersebut. Sistem otomatis menghitung total jatah tamu agar kursi tidak melebihi kapasitas.</p>
        </div>
        <div class="subcard">
          <h4>3. Pantau Kapasitas</h4>
          <p>Setiap kartu meja memiliki indikator keterisian kursi: warna hijau jika masih tersedia, dan merah jika kapasitas kursi sudah penuh.</p>
        </div>
      </div>

      <div style="margin-top: 8px;">
        <span class="tag tag-teal">Informasi di Undangan Tamu:</span>
        <span style="font-size: 9.5px; color: #5e7d87; margin-left: 4px;">
          Tamu yang sudah ditentukan mejanya akan melihat nomor meja mereka langsung pada kartu masuk digital (Access Card) di undangan.
        </span>
      </div>
    </div>

    <!-- Kategori Tamu -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Pengelompokan Kategori Tamu</h3>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Fitur kategori memudahkan Anda memilah tamu prioritas saat input nama di tab Tautan Tamu:
      </p>

      <div class="grid-3">
        <div class="subcard" style="border-top: 3px solid #64748b;">
          <h4>Reguler</h4>
          <p>Kategori umum untuk sahabat, rekan kerja, dan kenalan pengantin.</p>
        </div>
        <div class="subcard" style="border-top: 3px solid #d97706;">
          <h4 style="color: #b45309;">VIP (Khusus)</h4>
          <p>Keluarga besar, kerabat dekat, dan tamu kehormatan kedua mempelai.</p>
        </div>
        <div class="subcard" style="border-top: 3px solid #0f3b47;">
          <h4 style="color: #0f3b47;">VVIP (Utama)</h4>
          <p>Pejabat, pimpinan instansi, tokoh masyarakat, atau sesepuh keluarga.</p>
        </div>
      </div>

      <ul class="check-list" style="margin-top: 8px;">
        <li>Lencana VIP/VVIP akan tampil di samping nama tamu pada daftar, membantu tim penerima tamu (usher) memprioritaskan penyambutan.</li>
      </ul>
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 6</span>
  </div>
</div>

<!-- ==================== HALAMAN 7: QR CHECK-IN & FILTER ACARA ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">06</span>
      <h2 class="page-header-title">Fitur Tambahan: QR Check-in & Filter Acara</h2>
    </div>
    <div class="page-header-right">Fitur Pilihan (Add-on)</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Dua fitur pelengkap ini memberikan kendali penuh pada alur kedatangan tamu di lokasi acara serta pemisahan sesi kehadiran bagi tamu khusus.
    </div>

    <!-- QR Check-in & Entrance Pass -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">1</span>
        <h3 class="card-title">QR Check-in & Kartu Masuk Digital (Entrance Pass)</h3>
        <span class="card-subtitle">Buku Tamu Digital Hari-H</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Menggantikan buku tamu kertas tradisional dengan sistem pemindaian kode QR yang cepat, elegan, dan bebas antrean panjang di meja penerima tamu.
      </p>

      <div class="grid-2">
        <div class="subcard">
          <h4>Bagi Tamu Undangan:</h4>
          <ul class="check-list" style="font-size: 9.5px;">
            <li>Setiap tautan undangan memuat <strong>Kartu Masuk Digital (Access Pass)</strong> berisikan QR Code unik, nama tamu, jatah orang, dan nomor meja.</li>
            <li>Tamu cukup memperlihatkan layar HP kepada petugas penerima tamu saat tiba di lobi resepsi.</li>
          </ul>
        </div>
        <div class="subcard">
          <h4>Bagi Petugas (Usher / WO):</h4>
          <ul class="check-list" style="font-size: 9.5px;">
            <li>Petugas memindai QR tamu menggunakan kamera smartphone melalui aplikasi Check-In Joyever.</li>
            <li>Sistem memverifikasi keaslian undangan, mencatat jam kehadiran, serta memantau pengambilan suvenir secara otomatis.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Filter Acara (Akad / Resepsi) -->
    <div class="card">
      <div class="card-header">
        <span class="badge-step">2</span>
        <h3 class="card-title">Filter Acara (Akad Saja / Resepsi Saja / Keduanya)</h3>
        <span class="card-subtitle">Pemisahan Sesi Undangan</span>
      </div>

      <p style="font-size: 10.5px; color: #43636d; line-height: 1.5; margin-bottom: 8px;">
        Sangat berguna jika Anda menggelar Akad/Pemberkatan yang bersifat sakral dan terbatas untuk keluarga, sementara Resepsi terbuka untuk seluruh kolega.
      </p>

      <div class="subcard" style="margin-bottom: 8px;">
        <h4>3 Pilihan Target Acara:</h4>
        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <span class="tag tag-teal">Keduanya (Standar)</span>
          <span class="tag tag-amber">Akad Saja</span>
          <span class="tag tag-green">Resepsi Saja</span>
        </div>
      </div>

      <ul class="check-list">
        <li><strong>Tampilan Menyesuaikan Otomatis:</strong> Jika tamu disetel ke <em>"Resepsi Saja"</em>, saat membuka undangan website hanya informasi Resepsi yang muncul (informasi Akad disembunyikan sepenuhnya).</li>
        <li><strong>RSVP Sesuai Sesi:</strong> Formulir kehadiran tamu otomatis berubah menyesuaikan acara yang boleh mereka konfirmasi, tanpa membingungkan tamu.</li>
        <li><strong>Elegan & Santun:</strong> Tidak ada label kaku seperti "Anda hanya diundang di...", undangan tampil natural seperti undangan utuh pada umumnya.</li>
      </ul>
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 7</span>
  </div>
</div>

<!-- ==================== HALAMAN 8: TIMELINE & TIPS ==================== -->
<div class="page">
  <div class="page-header">
    <div class="page-header-left">
      <span class="chapter-pill">07</span>
      <h2 class="page-header-title">Timeline & Tips Sukses Undangan Digital</h2>
    </div>
    <div class="page-header-right">Praktik Terbaik</div>
  </div>

  <div class="page-content">
    <div class="intro-box">
      Berikut adalah panduan alur waktu dan praktik terbaik yang kami susun agar seluruh proses pembagian undangan hingga hari-H berjalan lancar dan bebas stres.
    </div>

    <!-- Timeline Pelaksanaan -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Alur Waktu Pengelolaan (Timeline)</h3>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="timeline-step">
          <span class="timeline-badge">H-30 s/d H-21</span>
          <div>
            <strong style="font-size: 11px; color: #0f3b47;">Tahap Input & Penyebaran Utama</strong>
            <p style="font-size: 10px; color: #43636d; margin-top: 2px;">
              Input seluruh daftar tamu di tab Tautan Tamu. Manfaatkan fitur 'Tempel Banyak Sekaligus'. Mulai kirimkan pesan WhatsApp secara bertahap kepada keluarga, sahabat dekat, dan rekan kerja.
            </p>
          </div>
        </div>

        <div class="timeline-step">
          <span class="timeline-badge">H-14</span>
          <div>
            <strong style="font-size: 11px; color: #0f3b47;">Tahap Evaluasi Awal</strong>
            <p style="font-size: 10px; color: #43636d; margin-top: 2px;">
              Buka tab Ringkasan. Periksa persentase tamu yang sudah merespons. Di tab Tautan Tamu, gunakan filter status 'Belum Dibuka' untuk mengetahui tamu mana yang belum sempat melihat tautan Anda.
            </p>
          </div>
        </div>

        <div class="timeline-step">
          <span class="timeline-badge">H-7</span>
          <div>
            <strong style="font-size: 11px; color: #0f3b47;">Tahap Pengingat Ramah (Follow-up)</strong>
            <p style="font-size: 10px; color: #43636d; margin-top: 2px;">
              Cek daftar tamu yang berstatus 'Belum Pasti'. Sapa kembali mereka secara santun untuk menanyakan kepastian hadir agar Anda dapat segera mengunci jumlah pesanan katering gedung.
            </p>
          </div>
        </div>

        <div class="timeline-step">
          <span class="timeline-badge">H-3</span>
          <div>
            <strong style="font-size: 11px; color: #0f3b47;">Tahap Finalisasi Laporan</strong>
            <p style="font-size: 10px; color: #43636d; margin-top: 2px;">
              Unduh rekap final melalui tombol 'Ekspor ke File CSV' di tab Daftar Tamu. Cetak atau teruskan file ini kepada pihak katering, hotel, dan tim wedding organizer (WO) untuk panduan hari-H.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tiga Prinsip Kunci -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">3 Tips Kunci untuk Pengantin</h3>
      </div>

      <ul class="check-list">
        <li><strong>Selalu Gunakan Tautan Personal:</strong> Mengirimkan link umum tanpa parameter nama akan membuat cover undangan terasa kaku. Tautan khusus menghadirkan nama tamu di cover depan sehingga terasa jauh lebih dihargai.</li>
        <li><strong>Periksa Jatah Tamu (Pax):</strong> Sebelum menekan kirim WA, pastikan jatah tamu (1, 2, atau 4) sudah sesuai dengan alokasi yang Anda inginkan agar katering tidak membengkak di luar rencana.</li>
        <li><strong>Gunakan Fitur Meja Jika Acara Formal:</strong> Jika acara Anda menggunakan nomor meja, selesaikan penetapan meja di H-5 agar tamu tidak kebingungan mencari tempat duduk saat tiba di ballroom.</li>
      </ul>
    </div>
  </div>

  <div class="page-footer">
    <span>Panduan Penggunaan Dashboard</span>
    <span>Halaman 8</span>
  </div>
</div>

</body>
</html>
"@

$htmlPath = Join-Path $workspaceDir "Panduan_RSVP_Dashboard_Joyever.html"
$pdfPath = Join-Path $workspaceDir "Panduan_RSVP_Dashboard_Joyever.pdf"
$desktopPdfPath = "C:\Users\MSI\Downloads\Panduan_RSVP_Dashboard_Joyever.pdf"

[System.IO.File]::WriteAllText($htmlPath, $htmlContent, [System.Text.Encoding]::UTF8)

# Jalankan Chrome Headless
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (Test-Path $chromePath) {
    $cmd = "`"$chromePath`" --headless=new --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw --print-to-pdf=`"$pdfPath`" `"$htmlPath`""
    cmd /c $cmd
    Start-Sleep -Seconds 2
    
    if (Test-Path $pdfPath) {
        Copy-Item -Path $pdfPath -Destination $desktopPdfPath -Force
        $size = (Get-Item $pdfPath).Length
        Write-Host "PDF BERHASIL DICETAK! Ukuran: $size bytes"
        Write-Host "Lokasi PDF: $desktopPdfPath"
    }
}
