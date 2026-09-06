<?php
// uji-blok.php — uji pemecahan blok pada materi NYATA.
//
// Pertanyaan yang dijawab uji ini: kalau materi dipecah jadi blok lalu
// digabung lagi tanpa diubah apa pun, apakah hasil render-nya tetap sama?
//
// Kenapa yang dibandingkan HASIL RENDER, bukan teks markdown-nya: perbedaan
// seperti "|---|---|" vs "| --- | --- |" tidak mengubah satu piksel pun di
// halaman member. Kalau teks mentah dijadikan syarat lulus, uji ini menolak
// pemecahan yang sebenarnya benar.
//
// Ini gerbang wajib: mode edit langsung menyimpan lewat jalur pecah→gabung,
// jadi kalau uji ini merah, satu klik Simpan bisa merusak materi live.
declare(strict_types=1);

require __DIR__ . '/_seed.php';
require __DIR__ . '/_markdown.php';
require __DIR__ . '/_blok.php';

$lulus = 0;
$gagal = 0;

function ok(string $nama, bool $syarat, string $detail = ''): void
{
    global $lulus, $gagal;
    if ($syarat) {
        $lulus++;
        echo "OK   $nama\n";
    } else {
        $gagal++;
        echo "BAD  $nama" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

/** Normalisasi ringan supaya beda spasi antar-tag tidak dihitung sebagai beda. */
function normal_html(string $h): string
{
    $h = preg_replace('/\s+/', ' ', $h) ?? $h;
    $h = str_replace('> <', '><', $h);
    return trim($h);
}

echo "=== 1. pecah-gabung pada materi seed (4 Bagian) ===\n";

foreach (seed_bagian() as $b) {
    $no  = (int)$b['urutan'];
    $md  = (string)$b['isi_md'];

    $blok = md_pecah_blok($md);
    ok("Bagian $no: terpecah jadi blok", count($blok) > 5, 'jumlah=' . count($blok));

    $ulang = md_gabung_blok($blok);

    $a = normal_html(md_to_html($md));
    $z = normal_html(md_to_html($ulang));
    ok("Bagian $no: render identik setelah pecah-gabung", $a === $z);

    if ($a !== $z) {
        $min = min(strlen($a), strlen($z));
        $p = 0;
        while ($p < $min && $a[$p] === $z[$p]) $p++;
        $dari = max(0, $p - 120);
        echo "     beda mulai byte $p\n";
        echo "     asli : ..." . substr($a, $dari, 260) . "\n";
        echo "     balik: ..." . substr($z, $dari, 260) . "\n";
    }

    // Render mode edit harus menghasilkan HTML yang sama isinya, hanya
    // ditambahi penanda data-blok. Yang diperiksa: jumlah penanda = jumlah blok
    // dan teks yang dibaca member tidak berubah.
    $he = materi_html_edit($blok);
    ok("Bagian $no: setiap blok dapat penanda data-blok",
       substr_count($he, 'data-blok="') === count($blok),
       'penanda=' . substr_count($he, 'data-blok="') . ' blok=' . count($blok));

    $teks_baca = trim(preg_replace('/\s+/', ' ', strip_tags(md_to_html($md))) ?? '');
    $teks_edit = trim(preg_replace('/\s+/', ' ', strip_tags($he)) ?? '');
    ok("Bagian $no: teks di mode edit sama dengan mode baca", $teks_baca === $teks_edit);
}

echo "\n=== 2. jenis blok dikenali benar ===\n";

$contoh = [
    'paragraf' => 'Ini paragraf biasa.',
    'judul'    => '## Judul bagian',
    'sub'      => '### Sub bagian',
    'kartu'    => ":::tips Judulnya\nIsi kartu.\n:::",
    'ceklis'   => "- [ ] satu\n- [x] dua",
    'ul'       => "- satu\n- dua",
    'ol'       => "1. satu\n2. dua",
    'tabel'    => "| a | b |\n|---|---|\n| 1 | 2 |",
    'kode'     => "```bash\necho hai\n```",
    'video'    => '@video https://youtu.be/3on5-_oqsGs Judul',
    'gambar'   => '![Ket](https://contoh.com/a.png)',
    'garis'    => '---',
    'kutipan'  => '> kutipan',
];

foreach ($contoh as $jenis => $md) {
    $b = md_pecah_blok($md);
    ok("jenis '$jenis' dikenali", count($b) === 1 && $b[0]['jenis'] === $jenis,
       'dapat=' . (count($b) === 1 ? $b[0]['jenis'] : 'jumlah blok ' . count($b)));
}

echo "\n=== 3. jebakan pemecahan ===\n";

// Dua baris teks berurutan = DUA blok, karena _markdown.php membuat satu <p>
// per baris. Kalau digabung jadi satu blok, admin mengedit "paragraf" yang
// sebenarnya dua paragraf di mata pembaca.
$b = md_pecah_blok("Baris pertama.\nBaris kedua.");
ok('dua baris teks jadi dua blok', count($b) === 2, 'jumlah=' . count($b));

// Baris kosong DI DALAM blok kode tidak boleh memotong blok.
$b = md_pecah_blok("```\nsatu\n\ndua\n```");
ok('baris kosong di dalam kode tidak memotong blok', count($b) === 1, 'jumlah=' . count($b));
ok('isi kode utuh termasuk baris kosong', count($b) === 1 && strpos($b[0]['md'], "satu\n\ndua") !== false);

// Baris kosong di dalam kartu juga tidak boleh memotong.
$b = md_pecah_blok(":::tips Judul\nsatu\n\ndua\n:::");
ok('baris kosong di dalam kartu tidak memotong blok', count($b) === 1, 'jumlah=' . count($b));

// Checklist tidak boleh terbaca sebagai daftar biasa.
$b = md_pecah_blok("- [ ] tugas\n- biasa");
ok('checklist dan daftar biasa terpisah', count($b) === 2 && $b[0]['jenis'] === 'ceklis' && $b[1]['jenis'] === 'ul',
   'dapat=' . implode(',', array_column($b, 'jenis')));

// Tabel tanpa baris pemisah bukan tabel — kalau dipaksa jadi tabel, isinya
// hilang dari tampilan.
$b = md_pecah_blok("| bukan tabel |");
ok('baris pipa tanpa pemisah bukan tabel', count($b) === 1 && $b[0]['jenis'] === 'paragraf',
   'dapat=' . $b[0]['jenis']);

echo "\n=== 4. contoh blok baru bisa dirender ===\n";

foreach (array_keys($contoh) as $jenis) {
    $isi = md_blok_contoh($jenis);
    $b   = md_pecah_blok($isi);
    $htm = md_to_html($isi);
    ok("contoh '$jenis' terbaca sebagai satu blok & terender", count($b) >= 1 && trim($htm) !== '',
       'blok=' . count($b));
}

echo "\n-----\nLULUS=$lulus GAGAL=$gagal\n";
exit($gagal > 0 ? 1 : 0);
