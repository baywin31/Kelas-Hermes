<?php
// _blok.php — pecah markdown materi jadi BLOK yang bisa diedit satu per satu.
//
// Kenapa perlu dipecah:
// Mode "edit langsung" membiarkan admin mengklik satu paragraf di halaman
// materi lalu mengubahnya di tempat. Yang dikirim balik ke server hanya
// paragraf itu — bukan seluruh materi. Bedanya besar:
//
//   - Kalau seluruh dokumen dikirim ulang tiap kali, satu bug konversi di satu
//     tempat merusak SEMUA bagian lain yang tidak disentuh.
//   - Dengan blok, kerusakan paling buruk hanya sebatas blok yang diedit, dan
//     blok lain tetap byte-per-byte seperti aslinya.
//
// Aturan pemecahan di sini WAJIB mengikuti _markdown.php, bukan spek Markdown
// umum. Contoh paling penting: di _markdown.php satu baris teks = satu <p>,
// jadi dua baris teks berurutan adalah DUA blok, bukan satu paragraf panjang.
declare(strict_types=1);

/**
 * Pecah markdown jadi daftar blok. Baris kosong dibuang (dia pemisah, bukan
 * isi). Setiap blok adalah string markdown yang berdiri sendiri.
 *
 * @return list<array{md:string,jenis:string}>
 */
function md_pecah_blok(string $md): array
{
    $md    = str_replace("\r\n", "\n", $md);
    $baris = explode("\n", $md);
    $n     = count($baris);
    $blok  = [];
    $i     = 0;

    $tambah = static function (array &$blok, string $isi, string $jenis): void {
        $isi = rtrim($isi, "\n");
        if (trim($isi) !== '') {
            $blok[] = ['md' => $isi, 'jenis' => $jenis];
        }
    };

    while ($i < $n) {
        $t = trim($baris[$i]);

        if ($t === '') {
            $i++;
            continue;
        }

        // Blok kode ``` ... ``` — isinya diambil apa adanya, termasuk baris
        // kosong di dalamnya.
        if (str_starts_with($t, '```')) {
            $buf = [$baris[$i]];
            $i++;
            while ($i < $n) {
                $buf[] = $baris[$i];
                $tutup = trim($baris[$i]) === '```';
                $i++;
                if ($tutup) break;
            }
            $tambah($blok, implode("\n", $buf), 'kode');
            continue;
        }

        // Kartu ::: jenis Judul ... :::
        if (preg_match('/^:::[ \t]*[a-z]+/', $t)) {
            $buf = [$baris[$i]];
            $i++;
            while ($i < $n) {
                $buf[] = $baris[$i];
                $tutup = trim($baris[$i]) === ':::';
                $i++;
                if ($tutup) break;
            }
            $tambah($blok, implode("\n", $buf), 'kartu');
            continue;
        }

        // Tabel: baris "|" yang diikuti baris pemisah |---|---|
        if ($t[0] === '|' && $i + 1 < $n && preg_match('/^\|[\s:|-]+\|$/', trim($baris[$i + 1]))) {
            $buf = [];
            while ($i < $n) {
                $x = trim($baris[$i]);
                if ($x === '' || $x[0] !== '|') break;
                $buf[] = $x;
                $i++;
            }
            $tambah($blok, implode("\n", $buf), 'tabel');
            continue;
        }

        // Heading. "##" dan "###" dipisah jenisnya karena tampilannya beda
        // jauh: "##" jadi kartu section, "###" jadi sub-kartu.
        if (preg_match('/^(#{1,4})\s+/', $t, $m)) {
            $lv = strlen($m[1]);
            $tambah($blok, $t, $lv <= 2 ? 'judul' : ($lv === 3 ? 'sub' : 'judul4'));
            $i++;
            continue;
        }

        // Video satu baris
        if (preg_match('/^@video\s+\S+/i', $t)) {
            $tambah($blok, $t, 'video');
            $i++;
            continue;
        }

        // Gambar sendirian di satu baris
        if (preg_match('/^!\[[^\]]*\]\([^)\s]+\)$/', $t)) {
            $tambah($blok, $t, 'gambar');
            $i++;
            continue;
        }

        // Garis pemisah
        if (preg_match('/^(-{3,}|\*{3,})$/', $t)) {
            $tambah($blok, $t, 'garis');
            $i++;
            continue;
        }

        // Kutipan
        if (str_starts_with($t, '> ') || $t === '>') {
            $buf = [];
            while ($i < $n && (str_starts_with(trim($baris[$i]), '> ') || trim($baris[$i]) === '>')) {
                $buf[] = trim($baris[$i]);
                $i++;
            }
            $tambah($blok, implode("\n", $buf), 'kutipan');
            continue;
        }

        // Checklist — WAJIB diperiksa sebelum daftar biasa, karena "- [ ]"
        // juga cocok dengan pola "- ".
        if (preg_match('/^[-*]\s+\[[ xX]\]\s/', $t)) {
            $buf = [];
            while ($i < $n && preg_match('/^[-*]\s+\[[ xX]\]\s/', trim($baris[$i]))) {
                $buf[] = trim($baris[$i]);
                $i++;
            }
            $tambah($blok, implode("\n", $buf), 'ceklis');
            continue;
        }

        // Daftar bernomor
        if (preg_match('/^\d+\.\s/', $t)) {
            $buf = [];
            while ($i < $n && preg_match('/^\d+\.\s/', trim($baris[$i]))) {
                $buf[] = trim($baris[$i]);
                $i++;
            }
            $tambah($blok, implode("\n", $buf), 'ol');
            continue;
        }

        // Daftar biasa
        if (preg_match('/^[-*]\s/', $t)) {
            $buf = [];
            while ($i < $n && preg_match('/^[-*]\s/', trim($baris[$i]))
                   && !preg_match('/^[-*]\s+\[[ xX]\]\s/', trim($baris[$i]))) {
                $buf[] = trim($baris[$i]);
                $i++;
            }
            $tambah($blok, implode("\n", $buf), 'ul');
            continue;
        }

        // Paragraf: satu baris = satu blok, sama seperti _markdown.php.
        $tambah($blok, $t, 'paragraf');
        $i++;
    }

    return $blok;
}

/** Gabung kembali daftar blok jadi markdown utuh. */
function md_gabung_blok(array $blok): string
{
    $isi = [];
    foreach ($blok as $b) {
        $s = is_array($b) ? (string)($b['md'] ?? '') : (string)$b;
        $s = rtrim($s, "\n");
        if (trim($s) !== '') {
            $isi[] = $s;
        }
    }
    return implode("\n\n", $isi) . "\n";
}

/**
 * Contoh isi untuk blok baru. Dipakai tombol "+" di mode edit langsung.
 * Isinya sengaja berupa contoh yang sudah jadi, bukan teks kosong: admin
 * tinggal menimpa, dan kalau dia bingung dia tetap melihat bentuk yang benar.
 */
function md_blok_contoh(string $jenis): string
{
    $peta = [
        'paragraf' => 'Tulis paragrafmu di sini.',
        'judul'    => '## Judul bagian baru',
        'sub'      => '### Sub bagian baru',
        'kartu'    => ":::tips Judul kartu\nIsi kartunya di sini.\n:::",
        'ceklis'   => "- [ ] Hal pertama yang harus dicek\n- [ ] Hal kedua",
        'ul'       => "- Poin pertama\n- Poin kedua",
        'ol'       => "1. Langkah pertama\n2. Langkah kedua",
        'tabel'    => "| Yang kamu lihat | Tindakannya |\n|---|---|\n| gejala pertama | perbaikannya |",
        'kode'     => "```bash\n# tulis perintahnya di sini\n```",
        'video'    => '@video https://youtu.be/XXXXXXXXXXX Judul video',
        'gambar'   => '![Keterangan gambar](https://contoh.com/gambar.png)',
        'garis'    => '---',
        'kutipan'  => '> Tulis kutipannya di sini.',
    ];
    return $peta[$jenis] ?? $peta['paragraf'];
}

/**
 * Render satu blok jadi HTML, dibungkus penanda supaya bisa diklik.
 *
 * Heading tidak dibungkus di sini: dia ikut kartu section/sub yang dibuka
 * materi_html_edit(), dan membungkusnya lagi akan memecah tata letak kartu.
 */
function blok_html(array $b, int $i): string
{
    $md    = (string)$b['md'];
    $jenis = (string)$b['jenis'];
    $isi   = md_to_html($md, true);

    return '<div class="kd-blok" data-blok="' . $i . '" data-jenis="' . komp_e($jenis) . '">'
         . $isi
         . '</div>';
}

/**
 * Render seluruh materi untuk MODE EDIT: sama persis tampilannya dengan mode
 * baca, tapi setiap blok dapat penanda data-blok.
 *
 * Pengelompokan kartu section dilakukan di sini, bukan di md_to_html():
 * md_to_html() membuka kartu saat menemukan "##" dan menutupnya saat menemukan
 * "##" berikutnya. Kalau tiap blok dirender sendiri-sendiri lewat fungsi itu,
 * setiap kartu langsung tertutup di blok yang sama dan seluruh tata letak
 * hilang. Jadi heading ditangani di sini, sisanya diserahkan ke md_to_html().
 */
function materi_html_edit(array $blok): string
{
    $out    = [];
    $sec    = false;
    $sub    = false;
    $sec_no = 0;

    $tutup_sub = static function () use (&$out, &$sub): void {
        if ($sub) { $out[] = komp_sub_tutup(); $sub = false; }
    };
    $tutup_sec = static function () use (&$out, &$sec, $tutup_sub): void {
        $tutup_sub();
        if ($sec) { $out[] = komp_section_tutup(); $sec = false; }
    };

    foreach ($blok as $i => $b) {
        $md    = (string)$b['md'];
        $jenis = (string)$b['jenis'];
        $attr  = ' data-blok="' . $i . '" data-jenis="' . $jenis . '"';

        if ($jenis === 'judul' && preg_match('/^#{1,2}\s+(.*)$/', trim($md), $m)) {
            $tutup_sec();
            $out[] = komp_section_buka(++$sec_no, md_slug($m[1]), md_inline(komp_e($m[1])),
                                       'kd-blok', $attr);
            $sec = true;
            continue;
        }

        if ($jenis === 'sub' && preg_match('/^#{3}\s+(.*)$/', trim($md), $m)) {
            $tutup_sub();
            $out[] = komp_sub_buka(md_slug($m[1]), md_inline(komp_e($m[1])), 'kd-blok', $attr);
            $sub = true;
            continue;
        }

        $out[] = blok_html($b, (int)$i);
    }

    $tutup_sec();
    return implode("\n", $out);
}
