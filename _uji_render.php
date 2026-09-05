<?php
// _uji_render.php — HANYA UJI LOKAL. Cetak HTML hasil md_to_html() dari contoh
// markdown, supaya bisa dilihat apakah kartu, callout, tabel, checklist, dan
// tombol salin benar-benar terbentuk. Berkas berawalan _uji_ tidak ikut paket.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';

header('Content-Type: text/plain; charset=utf-8');

$md = "## Bagian pertama\n\nParagraf biasa dengan **tebal** dan `kode`.\n\n"
    . ":::tips Coba dulu\nIni isi callout dengan daftar:\n\n- satu\n- dua\n:::\n\n"
    . "### Sub bagian\n\n1. langkah satu\n2. langkah dua\n\n"
    . "- [ ] belum dikerjakan\n- [x] sudah dikerjakan\n\n"
    . "| Kolom | Isi |\n|---|---|\n| a | b |\n| c | d |\n\n"
    . "```bash\necho halo\n```\n\n"
    . "## Bagian kedua\n\nPenutup.\n";

echo md_to_html($md);
echo "\n\n===== MODE DATAR (cetak) =====\n\n";
echo md_to_html($md, false);
