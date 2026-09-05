<?php
// _komponen.php — pustaka komponen tampilan untuk isi materi.
//
// Kenapa ada berkas ini:
// Editor materi sengaja MEMBUANG semua HTML mentah (lihat _markdown.php) supaya
// isi materi tidak bisa dipakai menyisipkan skrip. Konsekuensinya, admin tidak
// bisa menempel <div class="...">. Jadi bentuk-bentuk kartu premium dibangun
// di sini sebagai fungsi PHP, lalu dipanggil oleh penanda ::: di markdown.
// Hasilnya: admin menulis teks biasa, yang keluar kartu rapi, dan tidak ada
// jalan untuk menyuntik HTML.
//
// Semua kelas di sini kelas Tailwind yang SUDAH dikompilasi ke tw.css
// (lihat tw/tailwind.config.js). Tidak ada CDN, tidak ada build di server.

declare(strict_types=1);

/**
 * Escape lokal. Sengaja tidak memakai e() dari _boot.php supaya berkas ini
 * bisa dipakai halaman mandiri (cetak.php) tanpa urutan require tertentu.
 */
function komp_e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

/**
 * Ikon SVG inline. Bukan dari CDN — supaya ikon tetap muncul walau jaringan
 * pembeli memblokir domain luar, dan tidak ada permintaan tambahan yang
 * memperlambat halaman.
 */
function komp_ikon(string $nama, string $kelas = 'h-[18px] w-[18px]'): string
{
    $p = [
        'tips'    => '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>',
        'awas'    => '<path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
        'insight' => '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/>',
        'cek'     => '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
        'target'  => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
        'kutip'   => '<path d="M7 7h4v4H7a4 4 0 0 0 4 4v2a6 6 0 0 1-6-6V7Zm10 0h4v4h-4a4 4 0 0 0 4 4v2a6 6 0 0 1-6-6V7Z"/>',
        'panah'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'salin'   => '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
        'jam'     => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'api'     => '<path d="M12 22a5 5 0 0 0 5-5c0-2.5-2.5-4.5-5-8-2.5 3.5-5 5.5-5 8a5 5 0 0 0 5 5Z"/>',
        'silang'  => '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
        'buku'    => '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
        'kotak'   => '<rect x="3" y="3" width="18" height="18" rx="4"/>',
        'terminal'=> '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="m7 10 2.5 2L7 14M12.5 14h4"/>',
        'daftar'  => '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
        'cetak'   => '<path d="M6 9V3h12v6M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
        // Perisai: dipakai kartu "Aman dikerjakan". Bentuk perisai dipilih
        // karena artinya kebaca lintas budaya tanpa perlu teks pendamping.
        'perisai' => '<path d="M12 22s8-3.5 8-10V5.5l-8-3-8 3V12c0 6.5 8 10 8 10Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
        // Bendera: penanda "kamu sudah sampai di sini" untuk kartu titik periksa.
        'bendera' => '<path d="M4 21V4M4 4h11l-1.5 4L15 12H4"/>',
        // Kompas: kartu opsional/pendalaman — untuk yang mau menjelajah lebih jauh.
        'kompas'  => '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z"/>',
    ];
    $d = $p[$nama] ?? $p['panah'];
    return '<svg class="' . $kelas . '" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
         . ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
         . ' aria-hidden="true" focusable="false">' . $d . '</svg>';
}

/**
 * Garis cahaya setipis 1px di tepi atas kartu.
 * Ini detail kecil yang paling membedakan panel mahal dari kotak abu-abu:
 * kedalaman datang dari cahaya, bukan dari bayangan hitam.
 */
function komp_kilau(string $warna = 'via-kd-accent/40'): string
{
    return '<span aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 h-px '
         . 'bg-gradient-to-r from-transparent ' . $warna . ' to-transparent"></span>';
}

/** Kelas dasar kartu, dipakai berulang supaya semua kartu sekeluarga. */
function komp_kartu_kelas(string $tambahan = ''): string
{
    return trim('kd-kartu relative overflow-hidden rounded-kd border border-white/[.07] '
        . 'bg-kd-soft/60 shadow-kd ' . $tambahan);
}

/**
 * Kartu panggilan (callout) — dari penanda ::: di markdown.
 * Tiap jenis punya warna sendiri supaya pembaca menangkap nadanya sebelum
 * membaca satu kata pun: kuning = awas, hijau = hasil, biru = tips.
 */
function komp_callout(string $jenis, string $judul, string $isi_html): string
{
    $peta = [
        'tips'    => ['tips',    'Tips',                 'text-kd-accent',   'via-kd-accent/40',   'bg-kd-accent/[.06]'],
        'awas'    => ['awas',    'Hati-hati',            'text-amber-300',   'via-amber-300/40',   'bg-amber-400/[.06]'],
        'insight' => ['insight', 'Yang jarang dibahas',  'text-violet-300',  'via-violet-300/40',  'bg-violet-400/[.06]'],
        'hasil'   => ['target',  'Hasil akhirnya',       'text-emerald-300', 'via-emerald-300/40', 'bg-emerald-400/[.06]'],
        'cerita'  => ['kutip',   'Cerita nyata',         'text-kd-fg2',      'via-white/25',       'bg-white/[.03]'],
        'catat'   => ['buku',    'Catat ini',            'text-sky-300',     'via-sky-300/40',     'bg-sky-400/[.06]'],
        'salah'   => ['silang',  'Cara yang salah',      'text-rose-300',    'via-rose-300/40',    'bg-rose-400/[.06]'],
        'waktu'   => ['jam',     'Perkiraan waktu',      'text-kd-accent3',  'via-kd-accent3/40',  'bg-kd-accent/[.05]'],
        // Tiga jenis di bawah ini menjawab rasa takut pembaca gaptek secara
        // langsung — bukan hiasan, tapi alat:
        //  aman     = batas kerusakan. "Apa yang bisa berubah, apa yang TIDAK
        //             bisa disentuh, dan cara membatalkannya." Ini penenang
        //             paling ampuh untuk orang yang takut merusak laptopnya.
        //  periksa  = titik periksa biner. Pembaca tahu pasti dia sudah benar
        //             sebelum lanjut, jadi kesalahan tidak menumpuk diam-diam.
        //  opsional = pendalaman yang boleh dilewati. Pembaca mahir melihat
        //             kedalaman, pembaca baru melihat izin untuk melewati.
        'aman'    => ['perisai', 'Aman dikerjakan',      'text-teal-300',    'via-teal-300/40',    'bg-teal-400/[.06]'],
        'periksa' => ['bendera', 'Titik periksa',        'text-lime-300',    'via-lime-300/40',    'bg-lime-400/[.06]'],
        'opsional'=> ['kompas',  'Opsional — boleh dilewati', 'text-kd-muted', 'via-white/20',     'bg-white/[.02]'],
    ];
    [$ikon, $judul_bawaan, $warna, $kilau, $latar] = $peta[$jenis] ?? $peta['tips'];
    $judul = trim($judul) !== '' ? trim($judul) : $judul_bawaan;

    return '<div class="' . komp_kartu_kelas('kd-callout my-7 ' . $latar) . '">'
         . komp_kilau($kilau)
         . '<div class="flex gap-3.5 p-5 sm:p-6">'
         . '<span class="' . $warna . ' mt-0.5 shrink-0">' . komp_ikon($ikon, 'h-5 w-5') . '</span>'
         . '<div class="min-w-0 flex-1">'
         . '<p class="m-0 mb-1.5 text-[12.5px] font-semibold uppercase tracking-[.08em] ' . $warna . '">'
         . komp_e($judul) . '</p>'
         . '<div class="kd-callout-isi">' . $isi_html . '</div>'
         . '</div></div></div>';
}

/**
 * Pembuka kartu section. Setiap heading ## memulai kartunya sendiri —
 * inilah "card view per section": pembaca melihat batas yang jelas antar
 * gagasan, bukan satu dinding teks panjang.
 *
 * Nomor urut dicetak besar dan redup di kiri. Fungsinya bukan hiasan:
 * pembaca gaptek jadi tahu ini langkah ke berapa dari berapa, dan tangkapan
 * layar satu section pun tetap terlihat sebagai bagian dari sesuatu yang
 * tersusun rapi.
 */
function komp_section_buka(int $no, string $id, string $judul_html): string
{
    $nomor = str_pad((string)$no, 2, '0', STR_PAD_LEFT);
    return '<section class="' . komp_kartu_kelas('kd-sec group my-8 transition-shadow duration-300 hover:shadow-kd-lift') . '">'
         . komp_kilau()
         . '<div class="flex items-start gap-4 border-b border-white/[.06] bg-white/[.02] px-5 py-4 sm:px-7 sm:py-5">'
         . '<span aria-hidden="true" class="mt-0.5 select-none font-mono text-[22px] font-semibold leading-none '
         . 'text-kd-accent/35 transition-colors duration-300 group-hover:text-kd-accent/70 sm:text-[26px]">'
         . $nomor . '</span>'
         . '<h2 id="' . komp_e($id) . '" class="kd-sec-judul m-0 flex-1 text-[19px] font-semibold leading-snug '
         . 'text-kd-fg sm:text-[22px]">' . $judul_html . '</h2>'
         . '</div>'
         . '<div class="kd-sec-isi px-5 py-5 sm:px-7 sm:py-6">';
}

function komp_section_tutup(): string
{
    return '</div></section>';
}

/**
 * Sub-kartu untuk heading ###. Lebih tenang dari section: cuma garis aksen
 * di kiri, supaya hierarkinya kebaca tanpa membuat halaman jadi tumpukan
 * kotak di dalam kotak.
 */
function komp_sub_buka(string $id, string $judul_html): string
{
    return '<div class="kd-sub my-6 rounded-r-kd border-l-2 border-kd-accent/35 bg-white/[.02] py-1 pl-4 sm:pl-5">'
         . '<h3 id="' . komp_e($id) . '" class="kd-sub-judul m-0 mb-2 mt-3 flex items-center gap-2 text-[16px] '
         . 'font-semibold text-kd-fg sm:text-[17px]">'
         . '<span class="text-kd-accent/70">' . komp_ikon('panah', 'h-4 w-4') . '</span>'
         . '<span>' . $judul_html . '</span></h3>'
         . '<div class="kd-sub-isi pb-3">';
}

function komp_sub_tutup(): string
{
    return '</div></div>';
}

/**
 * Blok kode dengan bilah judul + tombol salin.
 * Tombol salin itu yang paling terasa untuk pembaca gaptek: perintah panjang
 * tidak perlu diketik ulang, jadi tidak ada salah ketik yang bikin frustrasi.
 * JS-nya vanilla, satu fungsi, dipasang sekali di _theme.php.
 */
function komp_kode(string $bahasa, string $kode): string
{
    $bahasa = preg_match('/^[a-zA-Z0-9_-]{0,20}$/', $bahasa) ? $bahasa : '';
    $label  = $bahasa !== '' ? $bahasa : 'teks';

    return '<div class="' . komp_kartu_kelas('kd-kode my-6 bg-black/40') . '">'
         . komp_kilau('via-white/20')
         . '<div class="flex items-center gap-2 border-b border-white/[.07] bg-white/[.03] px-4 py-2">'
         . '<span class="text-kd-muted2">' . komp_ikon('terminal', 'h-4 w-4') . '</span>'
         . '<span class="flex-1 font-mono text-[11.5px] uppercase tracking-[.08em] text-kd-muted">'
         . komp_e($label) . '</span>'
         . '<button type="button" class="kd-salin inline-flex items-center gap-1.5 rounded-md border '
         . 'border-white/10 px-2 py-1 font-mono text-[11.5px] text-kd-fg2 transition-colors '
         . 'hover:border-kd-accent/40 hover:text-kd-accent focus-visible:outline focus-visible:outline-2 '
         . 'focus-visible:outline-offset-2 focus-visible:outline-kd-accent">'
         . komp_ikon('salin', 'h-3.5 w-3.5') . '<span>Salin</span></button>'
         . '</div>'
         . '<pre class="m-0 overflow-x-auto px-4 py-3.5"><code>' . komp_e($kode) . '</code></pre>'
         . '</div>';
}

/**
 * Satu baris checklist dari "- [ ] teks" / "- [x] teks".
 * Kotak centang digambar sendiri (bukan <input>) karena ini bacaan, bukan
 * formulir: tidak ada yang perlu dikirim ke server, dan bentuk statis begini
 * ikut tercetak benar di PDF.
 */
function komp_cek_item(bool $sudah, string $isi_html): string
{
    $kotak = $sudah
        ? '<span class="mt-0.5 shrink-0 text-emerald-300">' . komp_ikon('cek', 'h-[19px] w-[19px]') . '</span>'
        : '<span aria-hidden="true" class="mt-1 h-[17px] w-[17px] shrink-0 rounded-[5px] border border-white/25"></span>';
    $teks = $sudah ? 'text-kd-muted line-through decoration-white/25' : 'text-kd-fg2';

    return '<li class="kd-cek flex gap-3 py-1.5">' . $kotak
         . '<span class="' . $teks . '">' . $isi_html . '</span></li>';
}

/**
 * Perkiraan waktu baca, dihitung dari isi sebenarnya.
 * 200 kata/menit adalah angka konservatif untuk bacaan teknis berbahasa
 * Indonesia. Ditampilkan karena pembaca ingin tahu apakah punya cukup waktu
 * SEBELUM mulai — bukan sebagai hiasan.
 */
function komp_menit_baca(string $md): int
{
    $bersih = preg_replace('/```.*?```/s', ' ', $md) ?? $md;
    $bersih = preg_replace('/^@video\s+\S+.*$/mi', ' ', $bersih) ?? $bersih;
    $bersih = preg_replace('/!\[[^\]]*\]\([^)\s]+\)/', ' ', $bersih) ?? $bersih;
    $kata   = str_word_count(strip_tags($bersih), 0, 'áéíóúàèìòùâêîôûäëïöüçñÁÉÍÓÚ0123456789');
    return max(1, (int)ceil($kata / 200));
}

/**
 * Kerangka modul siap pakai ulang.
 *
 * Ini jawaban untuk "jadikan setiap modul jadi skeleton yang bisa saya pakai
 * ulang": admin menekan satu tombol, kerangkanya masuk ke editor, dia cuma
 * mengganti isi. Urutan kartunya bukan asal — mengikuti PAS: cerita masalah
 * dulu (Problem), akibat kalau dibiarkan (Agitate), baru langkahnya (Solution),
 * ditutup janji hasil + checklist.
 */
function komp_kerangka_modul(): string
{
    return <<<'MD'
:::cerita Judul cerita pembuka — satu momen yang pembaca kenali
Tulis kejadian nyata, 3–4 baris. Bukan teori. Sesuatu yang membuat pembaca
berpikir "ini gue banget".

Tutup dengan satu kalimat yang menamai rasa sakitnya.
:::

## Masalahnya bukan (dugaan yang salah)

Bantah dugaan umum yang bikin pembaca menyalahkan dirinya. Lalu tawarkan
pilihan ketiga yang belum pernah dia dengar.

:::salah Yang bikin orang gagal di percobaan pertama
Sebutkan kesalahan yang paling sering. Jelaskan kenapa itu wajar terjadi —
jangan bikin pembaca merasa bodoh.
:::

:::waktu Bagian ini butuh berapa lama
Sebut kisaran menit yang jujur, dan satu aturan: kalau macet, selesaikan
dulu yang macet sebelum lanjut.
:::

## Langkah 1 — (kata kerja + hasilnya)

Isi langkahnya. Kalau ada video, tempel satu baris:
@video https://youtube.com/shorts/XXXXXXXXXXX Judul video

:::tips Untuk yang belum pernah melakukan ini
Turunkan rasa takut. Jelaskan istilah teknis dengan satu perbandingan
sehari-hari.
:::

## Langkah 2 — (kata kerja + hasilnya)

:::aman Sebelum menekan Enter — apa yang bisa dan tidak bisa berubah
**Yang bisa berubah:** sebut folder atau berkasnya persis.
**Yang TIDAK bisa disentuh:** foto, WhatsApp, Windows, apa pun di luar folder itu.
**Paling buruk yang bisa terjadi:** sebut satu kemungkinan terburuk yang nyata.
**Cara membatalkan:** sebut satu tindakan pembatalan yang persis.
:::

:::awas Satu hal yang jangan dilanggar
Sebut risikonya dan akibat nyatanya, bukan cuma "hati-hati".
:::

```bash
# perintah contoh, dengan komentar yang menjelaskan kenapa
```

Yang muncul di layarmu kira-kira seperti ini:

```
tempel keluaran aslinya di sini, apa adanya
```

Nama pengguna dan nomor versinya akan berbeda dari punyaku — itu normal.

:::periksa Kamu sudah benar kalau…
Sebut satu hal yang bisa dia LIHAT di layarnya. Kalau belum kelihatan, suruh
dia ke tabel error di bawah dulu sebelum lanjut.
:::

### Kesalahan yang paling sering muncul

Kolom kiri ditulis PERSIS seperti yang muncul di layar — pembaca gaptek
mencocokkan tulisan, bukan membaca penjelasan.

| Yang kamu lihat di layar | Sekali tindakan, beres |
|---|---|
| `tempel pesan errornya persis` | tindakan perbaikannya |
| gejala kedua | tindakan perbaikannya |
| gejala ketiga | tindakan perbaikannya |

:::insight Yang jarang diberitahu orang
Satu wawasan yang mengubah cara pembaca melihat masalahnya. Ini kartu yang
paling sering di-screenshot orang — jangan diisi hal umum.
:::

:::opsional Kenapa cara ini bekerja
Penjelasan yang lebih dalam untuk yang penasaran. Kalau kamu cuma mau hasilnya,
lewati saja bagian ini — tidak ada yang hilang.
:::

:::hasil Yang kamu pegang setelah Bagian ini
Sebut hasil konkret yang dia punya sekarang, dan sambungkan ke Bagian
berikutnya.
:::

## Checklist sebelum lanjut

- [ ] Syarat pertama sudah terbukti jalan
- [ ] Syarat kedua sudah terbukti jalan
- [ ] Sudah dicatat di kolom catatan bawah

Kalau macet lebih dari 10 menit, berhenti dan kirim tangkapan layar ke admin.
Macet 10 menit itu normal; macet sejam berarti tulisanku yang kurang jelas.
MD;
}

/**
 * Satu keping data di bilah kepala materi (waktu baca, jumlah langkah, dll).
 * Bentuknya kecil dan monospace: memberi kesan instrumen ukur, bukan label
 * pemasaran — itu yang membuat halaman terasa serius.
 */
function komp_meta(string $ikon, string $teks): string
{
    return '<span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 '
         . 'bg-white/[.03] px-2.5 py-1 font-mono text-[11.5px] tracking-tight text-kd-muted">'
         . '<span class="text-kd-accent/70">' . komp_ikon($ikon, 'h-3.5 w-3.5') . '</span>'
         . komp_e($teks) . '</span>';
}
