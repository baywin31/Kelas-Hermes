<?php
// _uji_bandingrender.php — HANYA UJI LOKAL. Bandingkan HTML hasil md_to_html()
// dari dua markdown: yang asli di database dan yang dikirim balik oleh editor
// visual.
//
// Kenapa perbandingan HTML, bukan teks markdown: perbedaan seperti
// "|---|---|" vs "| --- | --- |" atau "```text" vs "```" TIDAK MENGUBAH APA PUN
// yang dilihat pembaca. Yang wajib identik adalah hasil akhirnya. Uji teks
// mentah bagus untuk mendeteksi masalah, tapi keputusan lulus/gagal harus
// diambil dari HTML — kalau tidak, editor ditolak karena beda spasi.
//
// Dipanggil oleh uji-setia-materi.js lewat POST: md_a dan md_b.
declare(strict_types=1);
require __DIR__ . '/_boot.php';
require __DIR__ . '/_markdown.php';

header('Content-Type: text/plain; charset=utf-8');

$a = (string)($_POST['md_a'] ?? '');
$b = (string)($_POST['md_b'] ?? '');

// Normalisasi yang tidak mengubah tampilan: spasi antar tag dan spasi ganda.
$norm = static function (string $html): string {
    $html = preg_replace('/>\s+</', '><', $html) ?? $html;
    $html = preg_replace('/\s+/', ' ', $html) ?? $html;
    return trim($html);
};

$ha = $norm(md_to_html($a));
$hb = $norm(md_to_html($b));

echo 'sama: ' . ($ha === $hb ? 'YA' : 'TIDAK') . "\n";
echo 'panjang_a: ' . strlen($ha) . "\n";
echo 'panjang_b: ' . strlen($hb) . "\n";

if ($ha !== $hb) {
    // Tunjukkan potongan pertama yang berbeda, supaya penyebabnya kelihatan
    // tanpa harus menebak.
    $n = min(strlen($ha), strlen($hb));
    $i = 0;
    while ($i < $n && $ha[$i] === $hb[$i]) {
        $i++;
    }
    $mulai = max(0, $i - 90);
    echo "beda_pada: $i\n";
    echo 'a: ...' . substr($ha, $mulai, 260) . "\n";
    echo 'b: ...' . substr($hb, $mulai, 260) . "\n";
}
