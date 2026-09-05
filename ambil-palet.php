<?php
/**
 * ambil-palet.php — baca warna nyata dari gambar palet, bukan menebak dari
 * pandangan mata. Gambar palet biasanya berupa beberapa blok warna; kita
 * ambil sampel di grid lalu kelompokkan warna yang berdekatan.
 */
$berkas = $argv[1] ?? '';
if (!is_file($berkas)) { fwrite(STDERR, "berkas tidak ada\n"); exit(1); }

$im = imagecreatefrompng($berkas);
$w  = imagesx($im);
$h  = imagesy($im);

// Sampel grid 12 x 16 — cukup untuk menangkap blok warna sekecil 1/12 lebar.
$kolom = 12; $baris = 16;
$hitung = [];
for ($by = 0; $by < $baris; $by++) {
    for ($bx = 0; $bx < $kolom; $bx++) {
        $x = (int)(($bx + 0.5) * $w / $kolom);
        $y = (int)(($by + 0.5) * $h / $baris);
        $c = imagecolorat($im, $x, $y);
        $r = ($c >> 16) & 0xFF; $g = ($c >> 8) & 0xFF; $b = $c & 0xFF;
        // Bulatkan ke kelipatan 8 supaya gradasi halus tidak jadi ratusan warna.
        $kunci = sprintf('%02x%02x%02x', ($r >> 3) << 3, ($g >> 3) << 3, ($b >> 3) << 3);
        if (!isset($hitung[$kunci])) $hitung[$kunci] = ['n' => 0, 'r' => 0, 'g' => 0, 'b' => 0];
        $hitung[$kunci]['n']++;
        $hitung[$kunci]['r'] += $r;
        $hitung[$kunci]['g'] += $g;
        $hitung[$kunci]['b'] += $b;
    }
}

uasort($hitung, fn($a, $b) => $b['n'] <=> $a['n']);

echo "dimensi: {$w}x{$h}, total sampel: " . ($kolom * $baris) . "\n\n";
echo "warna dominan:\n";
$i = 0;
foreach ($hitung as $d) {
    $r = (int)round($d['r'] / $d['n']);
    $g = (int)round($d['g'] / $d['n']);
    $b = (int)round($d['b'] / $d['n']);
    $persen = round($d['n'] / ($kolom * $baris) * 100, 1);
    printf("  #%02X%02X%02X  rgb(%3d,%3d,%3d)  %5.1f%%\n", $r, $g, $b, $r, $g, $b, $persen);
    if (++$i >= 12) break;
}

// Sampel garis vertikal tengah — memperlihatkan urutan blok dari atas ke bawah.
echo "\nurutan vertikal (x tengah):\n";
$xt = (int)($w / 2); $last = '';
for ($y = 0; $y < $h; $y += max(1, (int)($h / 40))) {
    $c = imagecolorat($im, $xt, $y);
    $r = ($c >> 16) & 0xFF; $g = ($c >> 8) & 0xFF; $b = $c & 0xFF;
    $hex = sprintf('#%02X%02X%02X', $r, $g, $b);
    $kasar = sprintf('%02x%02x%02x', ($r >> 4) << 4, ($g >> 4) << 4, ($b >> 4) << 4);
    if ($kasar !== $last) {
        printf("  y=%5d  %s\n", $y, $hex);
        $last = $kasar;
    }
}
