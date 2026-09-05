/* ============================================================
   Materi awal 4 Bagian + FAQ + tautan. Admin bisa menimpanya
   dari panel Admin → Materi (perubahan tersimpan di localStorage).
   ============================================================ */
(function () {
'use strict';

var B1 = [
'## Apa yang kita kerjakan di Bagian ini',
'',
'Di akhir Bagian 1, kamu punya Hermes yang jalan di komputer sendiri dan sudah bisa disuruh kerja.',
'',
'@video https://youtube.com/shorts/3on5-_oqsGs Tutorial Install Hermes Agent',
'',
'## Langkah',
'',
'1. Pasang Hermes Agent sesuai sistem operasimu.',
'2. Sambungkan satu model dulu — jangan langsung banyak, biar mudah melacak kalau ada error.',
'3. Uji dengan perintah sederhana, misalnya minta dia membaca sebuah file.',
'4. Simpan konfigurasi yang sudah jalan.',
'',
'## Kesalahan yang paling sering',
'',
'- **Provider salah nama.** Kalau muncul `Unknown provider`, isian nama provider di config tidak sama dengan yang dipakai model. Samakan dulu, baru restart.',
'- **Langsung pasang banyak model.** Kalau satu gagal, kamu tidak tahu yang mana. Satu-satu.',
'',
'> Catat setiap langkah yang berhasil di kolom catatan bawah. Nanti kepakai waktu setup di komputer lain.',
'',
'## Checklist sebelum lanjut',
'',
'- Hermes menjawab perintah sederhana',
'- Satu model tersambung dan tidak error',
'- Kamu tahu di mana file konfigurasi disimpan'
].join('\n');

var B2 = [
'## Inti Bagian ini',
'',
'Banyak orang berhenti di "bisa jalan" lalu bingung mau dipakai apa. Bagian ini soal ritme kerja.',
'',
'## Pola tiga langkah',
'',
'1. **Sebut hasil akhirnya, bukan caranya.** "Bikin ringkasan 5 poin dari file ini" lebih baik daripada "buka file, baca, terus tulis."',
'2. **Minta dia buktikan.** Suruh jalankan hasilnya. Kalau dia cuma bilang "sudah selesai" tanpa output, minta bukti.',
'3. **Perbaiki satu hal per putaran.** Jangan tumpuk lima koreksi sekaligus.',
'',
'## Yang bikin hasil jelek',
'',
'- Perintah terlalu umum: "perbaiki kodenya" — perbaiki apa?',
'- Tidak menyebut format keluaran yang diinginkan.',
'- Tidak memberi contoh saat gaya tulisan itu penting.',
'',
'## Latihan',
'',
'Ambil satu pekerjaan yang kamu ulang setiap minggu. Tulis satu perintah yang menghasilkannya, lalu perbaiki tiga kali sampai hasilnya bisa langsung dipakai.'
].join('\n');

var B3 = [
'## Kenapa ini penting',
'',
'Tanpa ini, setiap sesi kamu menjelaskan ulang hal yang sama. Dengan ini, agen ingat dan mengulanginya sendiri.',
'',
'## Tiga hal yang berbeda',
'',
'| Hal | Isinya | Contoh |',
'|---|---|---|',
'| Memory | fakta yang tetap | "proyek ini pakai MySQL, bukan SQLite" |',
'| Skill | urutan langkah yang terbukti | "cara deploy ke hosting lewat FTP" |',
'| Cron | pekerjaan terjadwal | "tiap pagi rangkum email masuk" |',
'',
'## Aturan praktis',
'',
'- Memory untuk hal yang masih benar bulan depan. Progres pekerjaan **bukan** memory.',
'- Skill dibuat setelah kamu berhasil sekali secara manual — bukan dikarang dulu.',
'- Cron baru dipasang setelah perintahnya terbukti jalan sekali secara manual.',
'',
'```bash',
'# contoh: jadwalkan ringkasan tiap pagi jam 7',
'# (tulis perintahnya lengkap, karena cron jalan tanpa konteks obrolan)',
'```',
'',
'## Latihan',
'',
'Salah satu langkah dari Bagian 2 tadi, ubah jadi skill. Uji dengan menyuruh agen menjalankannya tanpa penjelasan tambahan.'
].join('\n');

var B4 = [
'## Target Bagian ini',
'',
'Hasil kerjamu bisa dibuka orang lain lewat tautan, bukan cuma ada di folder sendiri.',
'',
'## Pilih tempat menaruhnya',
'',
'- **Hosting biasa (PHP)** — paling murah, cocok untuk web yang butuh login sederhana.',
'- **VPS** — bebas pakai bahasa apa pun, tapi kamu yang urus keamanan dan pembaruan.',
'- **Statis** — cepat dan gratis, tapi tidak bisa menyimpan data rahasia.',
'',
'> Aturan penting: sesuatu yang harus dijaga (kode akses, password) **tidak boleh** disimpan di halaman statis. Isinya bisa dibaca siapa pun dari sumber halaman.',
'',
'## Sebelum dibagikan ke pembeli',
'',
'1. Uji alur dari sisi pembeli, dari nol, dengan akun baru.',
'2. Cek halaman yang seharusnya terkunci — buka tanpa login, harus ditolak.',
'3. Pastikan halaman terbaca di layar ponsel.',
'4. Siapkan cara pembeli menghubungi kamu kalau tersangkut.',
'',
'## Penutup',
'',
'Bagian tersulit bukan membuat, tapi merawat. Simpan catatan versi dan apa yang berubah, supaya kamu tidak menebak-nebak sebulan kemudian.'
].join('\n');

var FAQ = [
'## Kode saya tidak diterima',
'',
'Pastikan formatnya `HRMS-XXXX-XXXX-XXXX`. Huruf besar/kecil tidak masalah — tanda hubung dirapikan otomatis. Kode hanya bisa dipakai **satu kali**; kalau sudah pernah dipakai, gunakan menu Masuk, bukan Redeem.',
'',
'## Saya lupa password',
'',
'Buka halaman Masuk, klik "Lupa password". Di mode HTML link pemulihan langsung tampil di layar (tidak lewat email), jadi kamu bisa ganti password saat itu juga.',
'',
'## Bisa dibuka di HP?',
'',
'Bisa. Semua halaman menyesuaikan layar ponsel.',
'',
'## Materinya bisa diunduh?',
'',
'Setiap Bagian punya tombol Cetak yang membuka tampilan bersih — dari situ pilih "Simpan sebagai PDF". Ada juga tombol cetak semua Bagian sekaligus.',
'',
'## Akses saya berlaku berapa lama?',
'',
'Seumur hidup untuk kelas ini, termasuk materi yang ditambahkan kemudian.'
].join('\n');

window.KD_SEED = {
  bagian: [
    { urutan: 1, judul: 'Kenalan dan Setup Hermes Agent',
      ringkas: 'Pasang Hermes, sambungkan model, dan pastikan semuanya jalan.', isi_md: B1 },
    { urutan: 2, judul: 'Alur Kerja Harian',
      ringkas: 'Pola pakai sehari-hari: dari minta sesuatu sampai hasilnya benar.', isi_md: B2 },
    { urutan: 3, judul: 'Skill, Memory, dan Otomasi',
      ringkas: 'Simpan cara kerja yang sudah terbukti supaya tidak mengulang dari nol.', isi_md: B3 },
    { urutan: 4, judul: 'Produksi & Distribusi Hasil',
      ringkas: 'Dari hasil di komputer sendiri jadi sesuatu yang bisa dipakai orang lain.', isi_md: B4 }
  ],
  faq_md: FAQ,
  setelan: {
    telegram_url: 'https://t.me/+contoh-grup-kelas',
    admin_kontak: 'https://t.me/darwin',
    // Nomor WhatsApp admin. Kosongkan kalau belum punya — tombol WA
    // otomatis tidak muncul, bukan jadi tautan rusak.
    wa_nomor: '',
    wa_pesan: '',
    links: [
      { judul: 'Grup Telegram', url: 'https://t.me/+contoh-grup-kelas', ket: 'Tanya-jawab & pengumuman' },
      { judul: 'Dokumentasi Hermes', url: 'https://hermes-agent.nousresearch.com/docs', ket: 'Rujukan resmi' }
    ]
  }
};
})();
