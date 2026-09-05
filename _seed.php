<?php
// _seed.php — materi awal 4 Bagian, FAQ, dan quick links.
//
// Isi tiap Bagian ditulis nowdoc (<<<'MD') supaya markdown-nya kebaca apa
// adanya di berkas ini: tidak ada \n dan tidak ada tanda kutip yang perlu
// dilolosi. Admin boleh menimpanya dari panel; seed memakai INSERT IGNORE
// sehingga materi yang sudah diedit TIDAK pernah ditimpa pembaruan.

declare(strict_types=1);

function seed_md_1(): string
{
    return <<<'MD'
:::cerita Jam 11 malam, dan kamu masih di depan laptop
Kerjaannya sebenarnya sederhana: rapikan 40 baris data, salin ke format lain, kirim. Cuma itu. Tapi sudah tiga jam.

Bukan karena susah. Karena membosankan, jadi kamu bolak-balik buka HP, kehilangan tempat, mulai lagi dari atas. Besok kerjaan yang sama datang lagi. Minggu depan juga.

Yang bikin capek bukan pekerjaannya. Yang bikin capek adalah tahu bahwa ini akan terulang.
:::

## Masalahnya bukan kamu kurang rajin

Selama ini solusi yang ditawarkan ke kamu cuma dua: kerja lebih cepat, atau bayar orang. Yang pertama ada batasnya — kamu manusia. Yang kedua butuh uang yang belum ada.

Ada pilihan ketiga yang jarang dibahas ke orang non-IT, karena orang IT-nya sendiri sibuk memakainya diam-diam: **kamu bisa punya satu "karyawan" yang mengerjakan bagian membosankan itu, dan dia tidak pernah minta libur.**

:::salah Yang bikin orang gagal di percobaan pertama
Mereka membuka AI, mengetik "bantu kerjaan saya", lalu kecewa karena jawabannya ngawur.

Itu bukan salah AI-nya. Itu seperti menyewa asisten, lalu bilang "kerja" tanpa menjelaskan kerja apa. Bagian 2 nanti khusus soal ini.
:::

## Kenapa harus Hermes, bukan chat AI biasa

Chat AI biasa hanya bisa **ngomong**. Kamu tanya, dia jawab, kamu yang mengerjakan.

Hermes bisa **mengerjakan**. Dia membaca file di komputermu, menulis file baru, menjalankan perintah, membuka web, dan melaporkan hasilnya.

| | Chat AI biasa | Hermes Agent |
|---|---|---|
| Baca file di laptopmu | tidak bisa | bisa |
| Menyimpan hasil jadi file | kamu salin manual | dia yang tulis |
| Ingat cara kerjamu | lupa tiap sesi baru | disimpan permanen |
| Kerja terjadwal sendiri | tidak ada | ada |

Bedanya seperti punya penasihat versus punya karyawan. Penasihat memberi saran. Karyawan menyelesaikan.

:::waktu Bagian ini butuh berapa lama
Sekitar 30–45 menit kalau lancar. Kalau tersangkut di satu langkah, jangan lanjut ke langkah berikutnya — perbaiki dulu yang macet. Melompat justru bikin lebih lama.
:::

## Langkah 1 — Pasang Hermes

Tonton dulu videonya kalau kamu lebih cepat paham dari melihat daripada membaca. Semua yang ada di video juga ditulis di bawahnya, jadi tidak ada yang terlewat kalau kamu memilih membaca saja.

@video https://youtube.com/shorts/3on5-_oqsGs Tutorial Install Hermes Agent

Buka dokumentasi resminya dan ikuti langkah untuk sistem operasi yang kamu pakai (Windows, Mac, atau Linux). Jangan lompat-lompat; kerjakan urut dari atas.

:::tips Kalau kamu belum pernah pakai terminal
Terminal itu jendela hitam tempat kamu mengetik perintah. Kelihatan menakutkan, padahal cuma kotak teks.

Yang perlu kamu tahu hari ini cuma satu hal: **ketik perintahnya, tekan Enter, baca yang keluar.** Itu saja. Tidak ada tombol yang bisa merusak komputer di situ.
:::

## Langkah 2 — Sambungkan SATU model dulu

Ini bagian yang paling sering bikin orang menyerah, dan penyebabnya hampir selalu sama: mereka menyambungkan tiga model sekaligus supaya "sekalian".

:::awas Satu model dulu. Serius.
Kalau kamu pasang tiga dan salah satunya salah, error-nya muncul tanpa memberi tahu yang mana. Kamu akan menghabiskan satu jam menebak.

Satu model, uji, jalan. Baru tambah yang kedua. Yang kedua butuh dua menit karena kamu sudah tahu polanya.
:::

Sesudah tersambung, uji dengan perintah paling sederhana yang bisa kamu pikirkan:

```bash
# minta dia melakukan satu hal kecil yang bisa kamu periksa sendiri
# contoh: menampilkan isi folder tempat kamu berada sekarang
```

:::aman Sebelum menekan Enter — apa yang bisa dan tidak bisa berubah
**Yang bisa berubah:** hanya folder tempat kamu menjalankan perintahnya.

**Yang TIDAK bisa disentuh:** foto, WhatsApp, dokumen, Windows, dan apa pun di luar folder itu. Dia tidak punya jalan ke sana.

**Paling buruk yang bisa terjadi:** perintahnya gagal dan muncul tulisan merah. Tidak ada yang rusak.

**Cara menghentikan apa pun yang sedang jalan:** tekan `Ctrl` + `C`. Itu tombol berhenti. Selalu berhasil.
:::

Kalau dia menjawab dan hasilnya masuk akal, kamu sudah selesai dengan bagian tersulit.

:::periksa Kamu sudah benar kalau…
Kamu bisa melihat jawaban Hermes di layar, dan isinya nyambung dengan yang kamu minta — bukan tulisan merah.

Belum kelihatan? Turun dulu ke tabel error di bawah sebelum lanjut. Jangan diteruskan sambil berharap nanti beres sendiri; kesalahan kecil di sini menumpuk jadi kebingungan besar di Bagian 2.
:::

## Langkah 3 — Simpan yang sudah jalan

Begitu berhasil, catat di mana file konfigurasinya berada. Tulis di kolom catatan bawah halaman ini — bukan di kepala.

Alasannya praktis: enam bulan lagi kamu ganti laptop, dan kamu tidak akan ingat apa pun. Yang punya catatan selesai dalam 10 menit. Yang tidak, mulai dari nol lagi.

### Tiga error yang paling sering muncul

Kolom kiri ditulis persis seperti yang muncul di layarmu. Cocokkan tulisannya, jangan menebak — dan kalau punyamu di luar daftar ini, tanya di grup; jangan diam sendiri sampai bosan lalu berhenti.

| Yang kamu lihat di layar | Sekali tindakan, beres |
|---|---|
| `Unknown provider` | Nama provider di konfigurasi tidak sama persis dengan yang dipakai model. Bandingkan huruf per huruf, termasuk besar-kecilnya, lalu **restart** — perubahan tidak berlaku sebelum itu. |
| Menjawab, tapi hasilnya kosong | Kunci API kedaluwarsa atau kuota habis. Cek di halaman penyedia model, bukan di Hermes. |
| `command not found` | Hermes belum masuk PATH, atau terminal belum ditutup-buka sejak dipasang. Tutup terminal, buka lagi, ulangi. |

Kalau kamu kena salah satunya, itu bukan tanda kamu tidak bisa. Tiga baris di tabel ini datang dari orang-orang yang sekarang sudah jalan.

:::insight Yang jarang diberitahu orang
Kamu tidak perlu mengerti cara kerja model AI-nya untuk memakainya, sama seperti kamu tidak perlu mengerti mesin injeksi untuk menyetir.

Yang perlu kamu kuasai cuma **cara memberi perintah yang jelas** — dan itu keahlian bahasa, bukan keahlian teknis. Justru orang non-IT sering lebih cepat mahir di sini, karena tidak sok tahu.
:::

:::hasil Yang kamu pegang setelah Bagian ini
Satu Hermes yang hidup di komputermu sendiri, tersambung ke satu model, sudah terbukti bisa menjalankan perintah, dan konfigurasinya tercatat.

Belum menghasilkan uang. Tapi mulai Bagian 2, tiap pekerjaan berulang yang kamu serahkan ke dia adalah jam yang kembali ke kamu.
:::

## Checklist sebelum lanjut

Jangan lanjut ke Bagian 2 sebelum keempatnya tercentang. Bukan aturan formalitas — Bagian 2 mengandalkan semua ini sudah jalan.

- [ ] Hermes menjawab satu perintah sederhana
- [ ] Satu model tersambung, tanpa error
- [ ] Saya tahu letak file konfigurasi
- [ ] Sudah saya tulis di kolom catatan bawah

Macet lebih dari 10 menit? Berhenti, screenshot layarnya, kirim ke admin lewat tombol WhatsApp di bawah. Macet 10 menit itu normal dan hampir semua orang mengalaminya. Macet sejam berarti ada yang kurang jelas di tulisanku, bukan di kepalamu.
MD;
}
function seed_md_2(): string
{
    return <<<'MD'
:::cerita Dua orang, alat yang sama, hasil yang beda jauh
Orang pertama mengetik: "tolong perbaiki laporan ini." Dapat sesuatu yang umum, tidak cocok, dia benahi sendiri 40 menit. Kesimpulannya: "AI-nya belum pintar."

Orang kedua mengetik: "Dari file laporan.csv, buat ringkasan 5 poin untuk atasan saya yang tidak suka angka detail. Tulis dalam bahasa Indonesia, maksimal 2 baris per poin. Simpan sebagai ringkasan.md." Dapat hasil yang langsung dia kirim.

Alatnya sama persis. Yang beda cuma satu: orang kedua menyebutkan **hasil akhir yang dia mau**.
:::

## Kenapa Bagian ini yang paling menentukan

Orang berhenti bukan di pemasangan. Mereka berhenti di minggu kedua, waktu alatnya sudah jalan tapi mereka tidak tahu mau dipakai apa — lalu pelan-pelan lupa.

Yang membedakan orang yang tetap memakai: mereka punya **ritme**. Bukan trik rahasia, bukan prompt sakti. Cuma pola tiga langkah yang diulang.

:::hasil Yang kamu bisa setelah Bagian ini
Satu pekerjaan mingguan yang biasanya makan 2 jam, selesai dalam satu perintah yang bisa kamu pakai ulang selamanya.
:::

## Pola tiga langkah

### 1. Sebut hasil akhirnya, bukan caranya

Ini kesalahan nomor satu, dan sangat manusiawi: kita terbiasa memberi instruksi ke orang yang sudah paham konteksnya.

| Perintah lemah | Perintah kuat |
|---|---|
| "rapikan datanya" | "urutkan berdasarkan tanggal, buang baris kosong, simpan jadi rapi.csv" |
| "buat konten" | "buat 3 caption Instagram untuk warung kopi, gaya santai, di bawah 150 karakter" |
| "perbaiki kodenya" | "kodenya error di baris 12, tulis pesan errornya, perbaiki, lalu jalankan untuk buktikan" |

Perhatikan pola kolom kanan: **apa yang jadi, untuk siapa, bentuknya bagaimana, disimpan di mana.** Empat hal itu saja sudah mengubah hasil secara drastis.

### 2. Minta dia buktikan

Kalimat "sudah selesai" itu belum bukti. Yang bukti adalah keluaran yang bisa kamu lihat.

:::tips Satu kalimat yang mengubah segalanya
Tambahkan di akhir perintahmu: **"jalankan dan tunjukkan hasilnya."**

Ini memaksa dia benar-benar mengeksekusi, bukan cuma mengarang bahwa dia sudah mengerjakan. Ini kebiasaan paling murah yang bisa kamu bangun hari ini.
:::

### 3. Perbaiki satu hal per putaran

Kalau hasilnya belum pas, sebut **satu** yang salah, bukan lima sekaligus.

Alasannya bukan soal kesopanan. Kalau kamu menumpuk lima koreksi, dia akan mengorbankan sebagian untuk memenuhi sebagian lain, dan kamu tidak tahu koreksi mana yang berhasil. Satu per satu justru lebih cepat sampai.

## Yang bikin hasil jelek

- **Terlalu umum** — "buat lebih bagus". Bagus menurut siapa? Sebut ukurannya: lebih pendek, lebih formal, lebih banyak angka.
- **Tidak menyebut format** — kalau kamu butuh tabel dan tidak bilang, kamu dapat paragraf.
- **Tidak memberi contoh padahal gaya itu penting.** Kalau tulisannya harus terdengar seperti kamu, tempelkan satu tulisanmu sebagai contoh. Ini yang paling sering dilupakan dan efeknya paling besar.
- **Menyerah di percobaan pertama.** Percobaan pertama hampir selalu 70% jadi. Yang membedakan hasil bagus dan hasil biasa itu putaran kedua dan ketiga — yang cuma butuh dua menit.

:::insight Perintah yang bagus itu aset, bukan sekali pakai
Kebanyakan orang mengetik perintah, dapat hasil, tutup, besok mengetik ulang dari nol.

Yang paham: begitu satu perintah menghasilkan sesuatu yang bagus, **simpan perintahnya.** Itu jadi cetakan yang dipakai berkali-kali. Di Bagian 3 kita ubah cetakan itu jadi skill supaya kamu tidak perlu menempel apa pun lagi.
:::

:::awas Jangan langsung menyuruh dia menyentuh pekerjaan penting
Untuk pekerjaan yang tidak boleh rusak, minta dia mengerjakan salinannya dulu, bukan file aslinya.

Bukan karena dia sering salah — tapi karena kepercayaan itu dibangun dari hasil yang terbukti, bukan dari harapan. Setelah 5–10 kali benar, kamu akan tahu sendiri mana yang bisa dilepas.
:::

## Latihan — kerjakan sekarang, jangan nanti

Ambil satu pekerjaan yang kamu ulang **setiap minggu**. Yang membosankan, yang kamu tunda-tunda.

:::aman Pakai salinan, bukan file aslinya
**Yang bisa berubah:** salinan yang kamu buat khusus untuk latihan ini.

**Yang TIDAK boleh kamu pertaruhkan:** file kerja aslinya. Salin dulu ke folder terpisah — sepuluh detik, dan sesudahnya tidak ada yang bisa hilang.

**Cara membatalkan:** hapus folder latihannya. File aslimu tidak pernah tersentuh.
:::

- [ ] Tulis satu perintah yang menyebut hasil akhirnya, formatnya, dan di mana disimpan
- [ ] Tambahkan "jalankan dan tunjukkan hasilnya"
- [ ] Perbaiki tiga putaran, satu koreksi per putaran
- [ ] Simpan perintah versi terakhir di kolom catatan bawah

:::periksa Kamu sudah selesai Bagian ini kalau…
Kamu punya satu perintah tersimpan yang, kalau ditempel ulang minggu depan, langsung memberi hasil yang sama tanpa kamu memikirkan apa pun lagi.

Kalau masih harus dibetulkan tiap kali dipakai, perintahnya belum cukup spesifik — kembali ke tabel "perintah lemah vs kuat" di atas.
:::

Kalau selesai, kamu baru saja memindahkan satu pekerjaan mingguan dari daftar tugasmu. Itu bukan latihan — itu sudah hasil.
MD;
}
function seed_md_3(): string
{
    return <<<'MD'
:::cerita Percakapan yang terjadi 30 kali
"Ingat ya, proyek ini pakai MySQL, bukan SQLite."
"Ingat ya, kalau deploy jangan lupa hapus file installer."
"Ingat ya, nulisnya pakai bahasa Indonesia santai."

Tiap sesi baru, kamu mengetik ulang tiga hal itu. Tiap hari. Lima menit sekali, tiga puluh kali sebulan — dua setengah jam hanya untuk mengulang kalimat yang sama.

Ini masalah yang paling gampang diselesaikan, dan paling sering dibiarkan.
:::

## Tiga hal yang orang sering tukar-tukar

Ketiganya terdengar mirip, tapi fungsinya beda. Salah tempat = tidak jalan, dan kamu akan menyalahkan alatnya.

| | Isinya | Contoh |
|---|---|---|
| **Memory** | fakta yang tetap benar | "proyek ini pakai MySQL, bukan SQLite" |
| **Skill** | urutan langkah yang sudah terbukti | "cara deploy ke hosting lewat FTP" |
| **Cron** | pekerjaan terjadwal | "tiap pagi jam 7 rangkum email masuk" |

Cara paling gampang membedakan: **Memory itu apa yang benar. Skill itu bagaimana caranya. Cron itu kapan dikerjakan.**

## Memory — untuk yang masih benar bulan depan

:::awas Ini yang paling sering salah
Progres pekerjaan **bukan** memory. "Sudah selesai Bagian 3" itu basi besok pagi.

Memory itu untuk hal yang masih benar bulan depan: nomor WhatsApp bisnismu, nama database, cara kamu suka ditulisi. Kalau sebulan lagi sudah tidak berlaku, jangan disimpan di sana.
:::

Ada satu jebakan lagi yang tidak kelihatan: **tulis memory sebagai fakta, jangan sebagai perintah.**

- Tulis: "User suka jawaban singkat" ✓
- Jangan: "Selalu jawab singkat" ✗

Kalimat perintah akan dibaca ulang tiap sesi sebagai instruksi baru, dan bisa menabrak apa yang kamu minta hari itu. Kalimat fakta cuma jadi informasi.

:::opsional Kenapa memory harus fakta, bukan perintah
Kalau kamu penasaran mekanismenya: isi memory ditempelkan ke awal tiap sesi baru sebagai konteks. Kalimat berbentuk perintah ("Selalu jawab singkat") jadi tidak bisa dibedakan dari permintaanmu hari itu — jadi kalau hari ini kamu justru minta penjelasan panjang, dua instruksi itu bertabrakan dan yang lama sering menang.

Kalimat fakta tidak pernah bertabrakan, karena tidak menyuruh apa pun. Kalau kamu cuma mau aturan praktisnya, cukup pakai contoh di atas — tidak ada yang hilang.
:::

## Skill — resep yang kamu buat setelah berhasil

:::insight Urutannya sering dibalik, dan itu penyebab skill gagal
Orang membuat skill **sebelum** pernah berhasil mengerjakannya manual. Isinya jadi karangan: langkah yang kelihatan benar tapi belum pernah diuji.

Urutan yang benar: kerjakan manual sampai berhasil → baru tulis jadi skill → uji dengan menyuruh dia menjalankannya tanpa penjelasan tambahan.

Skill itu **catatan kemenangan**, bukan rencana.
:::

Cara menguji skill-mu benar: buka sesi baru, suruh dia mengerjakan hal itu, jangan beri petunjuk apa pun. Kalau jalan, skill-mu benar. Kalau dia bertanya-tanya, ada langkah yang kamu lupa tulis.

## Cron — jangan dipasang sebelum terbukti

```bash
# Perintah cron harus lengkap dan berdiri sendiri.
# Cron jalan tanpa konteks obrolan: tidak ada "seperti tadi",
# tidak ada "file yang kita bahas". Semua harus disebut penuh.
```

:::awas Aturan yang tidak boleh dilanggar
Jalankan perintahnya **manual** dulu, minimal sekali, dan pastikan hasilnya benar.

Cron yang salah tidak memberi tahu kamu. Dia gagal diam-diam, tiap hari, sampai suatu hari kamu butuh hasilnya dan baru sadar sudah tiga minggu tidak ada apa-apa.
:::

:::periksa Cron-mu boleh dinyalakan kalau…
Perintah yang sama sudah kamu jalankan manual dan hasilnya kamu lihat sendiri benar. Bukan "seharusnya benar" — benar-benar kamu lihat.
:::

## Urutan membangun yang saya sarankan

Jangan pasang ketiganya sekaligus di hari pertama. Naik satu tangga per minggu; tiap tangga membuat tangga berikutnya lebih mudah.

1. **Minggu ini** — isi Memory dengan 3–5 fakta tetap tentang caramu bekerja.
2. **Minggu depan** — ubah satu pekerjaan dari Bagian 2 jadi Skill, lalu uji di sesi baru.
3. **Minggu ketiga** — pasang satu Cron, untuk pekerjaan yang sudah terbukti jalan manual.

:::hasil Setelah tiga minggu
Kamu tidak lagi menjelaskan konteks tiap pagi. Pekerjaan berulang punya resepnya sendiri. Dan ada satu pekerjaan yang selesai sebelum kamu bangun.

Di titik ini alatnya berubah sifat: dari sesuatu yang kamu pakai, jadi sesuatu yang bekerja untukmu.
:::

## Checklist Bagian ini

- [ ] Saya tahu bedanya Memory, Skill, dan Cron
- [ ] Memory saya berisi fakta tetap, bukan progres pekerjaan
- [ ] Memory saya ditulis sebagai fakta, bukan perintah
- [ ] Satu pekerjaan dari Bagian 2 sudah jadi Skill
- [ ] Skill itu sudah saya uji di sesi baru tanpa memberi petunjuk
MD;
}
function seed_md_4(): string
{
    return <<<'MD'
:::cerita Folder bernama "hasil-final-fix-2"
Kamu sudah bikin sesuatu yang bagus. Jalan di laptopmu, kamu bangga.

Lalu ada yang tanya, "boleh lihat?" dan kamu bingung. Kirim file zip? Screenshot? Suruh dia install dulu?

Akhirnya kamu kirim screenshot. Dia bilang "keren", percakapan selesai, dan karyamu tetap tinggal di folder di laptopmu. Berbulan-bulan.

Jarak antara "sudah jadi" dan "bisa dipakai orang" itu satu tautan. Bagian ini soal tautan itu.
:::

## Kenapa banyak orang mandek di sini

Karena tiga pertanyaan yang tidak pernah dijawab dengan jelas ke orang non-IT: taruh di mana, berapa biayanya, dan aman tidak.

Kita selesaikan ketiganya sekarang.

## Pilih tempat menaruhnya

| Pilihan | Biaya | Cocok untuk | Kelemahan |
|---|---|---|---|
| **Hosting biasa (PHP)** | paling murah | web dengan login sederhana, jualan produk digital | tidak bisa bahasa selain PHP |
| **VPS** | sedang | apa pun, bebas | kamu yang urus keamanan & pembaruan |
| **Statis** | gratis | halaman jualan, portofolio | tidak bisa menyimpan data rahasia |

:::tips Kalau kamu masih bingung, ambil yang pertama
Hosting PHP biasa. Harganya seperti dua kali makan siang per bulan, tidak ada yang perlu kamu rawat, dan bisa dipakai jualan produk digital dengan login.

Naik ke VPS nanti saja, kalau memang sudah terasa sempit. Jangan bayar kerumitan yang belum kamu butuhkan.
:::

:::awas Ini bagian yang jangan sampai salah
Sesuatu yang harus dijaga — kode akses, password, kunci API — **tidak boleh** ditaruh di halaman statis.

Alasannya: isi halaman statis bisa dibaca siapa pun yang menekan "lihat sumber halaman". Ini bukan risiko kecil yang bisa ditunda; ini yang bikin produk digital orang dibagikan gratis tanpa dia tahu.

Kalau ada yang harus dirahasiakan, harus ada server yang memeriksanya. Itu batas yang jelas.
:::

## Sebelum dibagikan ke pembeli — lima uji wajib

Lakukan urut. Yang nomor dua paling sering dilewati dan paling mahal akibatnya.

1. **Coba dari nol sebagai pembeli.** Akun baru, browser yang belum pernah login. Bukan akunmu sendiri yang sudah masuk — kamu tidak akan melihat masalah yang dilihat pembeli.
2. **Buka halaman yang seharusnya terkunci, tanpa login.** Harus ditolak. Kalau terbuka, semua sistem penjualanmu tidak ada artinya.
3. **Buka di HP.** Mayoritas pembeli Indonesia membuka dari HP. Kalau tombolnya tidak kelihatan di layar kecil, itu bukan masalah kecil — itu kehilangan penjualan.
4. **Hapus file installer dan skrip sekali-pakai.** Apa pun yang bisa mengubah data tanpa login tidak boleh menginap di server, walaupun namanya susah ditebak.
5. **Pastikan pembeli tahu cara menghubungimu.** Tombol WhatsApp atau grup. Pembeli yang tersangkut dan tidak bisa bertanya akan minta uangnya kembali.

:::insight Yang membuat pembeli merasa produkmu mahal
Bukan fiturnya. Yang terasa mahal itu **tidak ada yang membingungkan.**

Pembeli tidak menghitung berapa fitur yang kamu buat. Dia mengingat satu momen: waktu dia bingung dan tidak ada yang menuntun. Satu momen itu yang menentukan dia merekomendasikan produkmu atau diam saja.

Jadi uang paling besar sebenarnya ada di kalimat petunjuk, bukan di fitur tambahan.
:::

## Bagian tersulit bukan membuat

Membuat itu sekali. Merawat itu terus-menerus, dan tidak ada yang memuji kamu untuk itu.

Yang menolong: catat tiap perubahan. Tanggal, apa yang diubah, kenapa. Tiga baris saja.

```text
2026-09-05  tambah tombol WhatsApp  (pembeli sering nyangkut di halaman redeem)
2026-09-06  perbaiki blok kode      (tampil sebagai teks aneh di HP)
```

Sebulan kemudian, waktu ada yang rusak, catatan ini yang memberitahu kamu apa yang terakhir berubah. Tanpa itu kamu menebak, dan menebak itu memakan sore hari.

:::hasil Yang kamu punya setelah menyelesaikan kelas ini
Hermes yang jalan. Ritme kerja yang menghasilkan. Skill dan Memory yang membuatmu tidak mengulang. Dan sekarang, cara mengubah hasil kerja jadi sesuatu yang bisa dibuka — dan dibeli — orang lain.

Empat Bagian, dan yang berubah bukan cuma alatnya. Kamu tidak lagi menukar waktu dengan hasil satu per satu.
:::

## Checklist terakhir

- [ ] Sudah pilih tempat menaruh hasil kerja
- [ ] Sudah coba dari nol sebagai pembeli, dengan akun baru
- [ ] Halaman terkunci sudah diuji tanpa login, dan ditolak
- [ ] Sudah dibuka di HP dan semua tombol kelihatan
- [ ] File installer & skrip sekali-pakai sudah dihapus dari server
- [ ] Pembeli punya cara menghubungi saya
- [ ] Catatan versi sudah dimulai

:::periksa Produkmu siap dijual kalau…
Ada satu tautan yang bisa kamu kirim ke orang asing, dan dia bisa membuka, membayar, masuk, dan memakainya tanpa kamu perlu menjelaskan apa pun lewat chat.

Kalau masih perlu kamu tuntun manual, tandanya bukan produkmu gagal — cuma ada satu momen bingung yang belum ditutup. Cari momennya, tutup dengan satu kalimat petunjuk.
:::
MD;
}

function seed_bagian(): array
{
    return [
        [
            'urutan'  => 1,
            'judul'   => 'Kenalan dan Setup Hermes Agent',
            'ringkas' => 'Dari nol sampai Hermes benar-benar jalan di komputermu — walau kamu bukan orang IT.',
            'isi_md'  => seed_md_1(),
        ],
        [
            'urutan'  => 2,
            'judul'   => 'Alur Kerja Harian',
            'ringkas' => 'Cara nyuruh yang bikin hasilnya benar dari percobaan pertama.',
            'isi_md'  => seed_md_2(),
        ],
        [
            'urutan'  => 3,
            'judul'   => 'Skill, Memory, dan Otomasi',
            'ringkas' => 'Berhenti menjelaskan ulang hal yang sama tiap hari.',
            'isi_md'  => seed_md_3(),
        ],
        [
            'urutan'  => 4,
            'judul'   => 'Produksi & Distribusi Hasil',
            'ringkas' => 'Dari folder di laptop sendiri jadi tautan yang bisa dibuka pembeli.',
            'isi_md'  => seed_md_4(),
        ],
    ];
}

/** Masukkan materi awal kalau slot urutannya belum ada. */
function seed_materi(array &$log): void
{
    $st = db()->prepare('INSERT IGNORE INTO ' . t('content') . '
        (urutan, judul, ringkas, isi_md, updated_at) VALUES (?, ?, ?, ?, NOW())');
    $n = 0;
    foreach (seed_bagian() as $b) {
        $st->execute([$b['urutan'], $b['judul'], $b['ringkas'], $b['isi_md']]);
        $n += $st->rowCount();
    }
    $log[] = ['ok', "materi awal ($n Bagian baru ditambahkan)"];
}

function seed_faq_md(): string
{
    return "## Kode saya tidak diterima\n\nPastikan formatnya `HRMS-XXXX-XXXX-XXXX`. Huruf besar/kecil tidak masalah — tanda hubung dirapikan otomatis. Kode hanya bisa dipakai **satu kali**; kalau sudah pernah dipakai, gunakan menu Masuk, bukan Redeem.\n\n## Saya lupa password\n\nBuka halaman Masuk, klik \"Lupa password\". Kalau email tidak masuk dalam 10 menit, hubungi admin lewat Telegram.\n\n## Bisa dibuka di HP?\n\nBisa. Semua halaman menyesuaikan layar ponsel.\n\n## Materinya bisa diunduh?\n\nSetiap Bagian punya tombol Cetak yang membuka tampilan bersih — dari situ pilih \"Simpan sebagai PDF\".\n\n## Akses saya berlaku berapa lama?\n\nSeumur hidup untuk kelas ini, termasuk materi yang ditambahkan kemudian.\n";
}

function seed_links_json(): string
{
    return json_encode([
        ['judul' => 'Grup Telegram',       'url' => TELEGRAM_URL,                    'ket' => 'Tanya-jawab & pengumuman'],
        ['judul' => 'Dokumentasi Hermes',  'url' => 'https://hermes-agent.nousresearch.com/docs', 'ket' => 'Rujukan resmi'],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
