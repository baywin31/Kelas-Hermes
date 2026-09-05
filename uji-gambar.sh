#!/usr/bin/env bash
# uji-gambar.sh — uji sintaks gambar ![...](...) di mode PHP lewat HTTP nyata.
# Yang dipastikan: URL berbahaya ditolak, gambar di baris sendiri jadi
# <figure> dengan keterangan, gambar di tengah kalimat tetap <img> biasa,
# alt selalu ada, sintaks gambar TIDAK ikut jadi tautan biasa, dan hasil
# pencarian tidak menampilkan URL panjang.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
J=$T/ug-jar.txt
PHP=C:/Users/user/tools/php83/php.exe
L=0; G=0
ok(){ echo "OK   $1"; L=$((L+1)); }
bad(){ echo "BAD  $1"; G=$((G+1)); }

echo "### 1. Saringan URL gambar"
cat > "$T/ug-url.php" <<'EOF'
<?php
require 'C:/Users/user/apps/karyawan-digital-php/_markdown.php';
$kasus = [
  'https://i.imgur.com/abc.png'        => 'https://i.imgur.com/abc.png',
  'http://situs.com/a.jpg'             => 'http://situs.com/a.jpg',
  'gambar/langkah-1.png'               => 'gambar/langkah-1.png',
  '/member/gambar/x.webp'              => '/member/gambar/x.webp',
  'javascript:alert(1)'                => '',
  'JavaScript:alert(1)'                => '',
  'data:image/svg+xml;base64,PHN2Zz48' => '',
  'vbscript:msgbox'                    => '',
  '//jahat.com/a.png'                  => '',
  'a.png" onerror="alert(1)'           => '',
  'a.png><script>'                     => '',
  ''                                   => '',
];
$g = 0;
foreach ($kasus as $in => $harap) {
  $dapat = img_url_ok((string)$in);
  $tanda = $dapat === $harap ? 'OK ' : 'BAD';
  if ($dapat !== $harap) $g++;
  printf("   %s  %-38s -> '%s'\n", $tanda, mb_substr((string)$in, 0, 38), $dapat);
}
echo $g === 0 ? "SEMUA_URL_OK\n" : "ADA_GAGAL\n";
EOF
"$PHP" -c C:/Users/user/tools/php83/php.ini "$T/ug-url.php" > "$T/ug-url.txt" 2>&1
sed -n '/^   /p' "$T/ug-url.txt"
grep -q "SEMUA_URL_OK" "$T/ug-url.txt" && ok "saringan URL benar semua" || bad "ada URL yang salah disaring"

echo
echo "### 2. Render: figure, img, alt, dan bukan-tautan"
cat > "$T/ug-render.php" <<'EOF'
<?php
require 'C:/Users/user/apps/karyawan-digital-php/_markdown.php';
echo "--- A baris sendiri ---\n";
echo md_to_html("Teks.\n\n![Tangkapan layar setup](https://i.imgur.com/abc.png)\n\nLanjut."), "\n";
echo "--- B tanpa keterangan ---\n";
echo md_to_html("![](gambar/x.png)"), "\n";
echo "--- C di tengah kalimat ---\n";
echo md_to_html("Klik ikon ![ikon gir](gambar/gir.png) lalu simpan."), "\n";
echo "--- D url jahat ---\n";
echo md_to_html("![x](javascript:alert(1))"), "\n";
echo "--- E alt berisi html ---\n";
echo md_to_html('![<script>alert(1)</script>](gambar/a.png)'), "\n";
echo "--- F kutipan pencarian ---\n";
echo md_excerpt("Awal. ![Tangkapan layar setup](https://i.imgur.com/panjang-sekali-namanya.png) Akhir."), "\n";
echo "--- G tautan biasa masih jalan ---\n";
echo md_to_html("[situs](https://contoh.com)"), "\n";
EOF
"$PHP" -c C:/Users/user/tools/php83/php.ini "$T/ug-render.php" > "$T/ug-render.txt" 2>&1
A=$(sed -n '/--- A/,/--- B/p' "$T/ug-render.txt")
echo "$A" | grep -q '<figure class="gambar">' && ok "baris sendiri jadi <figure>" || bad "figure tidak terbentuk"
echo "$A" | grep -q '<figcaption class="small muted">Tangkapan layar setup</figcaption>' \
  && ok "keterangan tampil di bawah gambar" || bad "figcaption hilang"
echo "$A" | grep -q 'alt="Tangkapan layar setup"' && ok "alt terisi" || bad "alt kosong"
echo "$A" | grep -q 'loading="lazy"' && ok "lazy-load aktif" || bad "tanpa lazy-load"
echo "$A" | grep -q '<a href="https://i.imgur.com/abc.png"' && bad "gambar malah jadi tautan" || ok "gambar TIDAK jadi tautan biasa"

Bb=$(sed -n '/--- B/,/--- C/p' "$T/ug-render.txt")
echo "$Bb" | grep -q 'alt=""' && ok "tanpa keterangan: alt tetap ada (kosong)" || bad "alt tidak ditulis"
echo "$Bb" | grep -q '<figcaption' && bad "figcaption kosong ikut dicetak" || ok "tanpa keterangan: figcaption tidak dicetak"

C=$(sed -n '/--- C/,/--- D/p' "$T/ug-render.txt")
echo "$C" | grep -q '<p>Klik ikon <img' && ok "gambar di tengah kalimat tetap di dalam paragraf" || bad "gambar inline memecah paragraf"
echo "$C" | grep -q '<figure' && bad "gambar inline malah dibungkus figure" || ok "gambar inline tanpa figure"

D=$(sed -n '/--- D/,/--- E/p' "$T/ug-render.txt")
echo "$D" | grep -q '<img' && bad "URL javascript: lolos jadi <img>" || ok "URL jahat tidak jadi gambar"
echo "$D" | grep -q 'javascript:alert' && ok "teksnya tetap terlihat supaya admin sadar" || bad "baris salah hilang tanpa jejak"

E=$(sed -n '/--- E/,/--- F/p' "$T/ug-render.txt")
echo "$E" | grep -q '<script>' && bad "script di alt tidak di-escape" || ok "alt berisi HTML di-escape"

F=$(sed -n '/--- F/,/--- G/p' "$T/ug-render.txt")
echo "$F" | grep -q 'panjang-sekali' && bad "kutipan pencarian memuat URL" || ok "kutipan pencarian bersih dari URL"
echo "$F" | grep -q 'Tangkapan layar setup' && ok "kutipan tetap memuat keterangan gambar" || bad "keterangan hilang dari kutipan"

Gg=$(sed -n '/--- G/,$p' "$T/ug-render.txt")
echo "$Gg" | grep -q '<a href="https://contoh.com"' && ok "tautan biasa tidak rusak" || bad "tautan biasa jadi rusak"

echo
echo "### 3. Tampil di halaman materi sungguhan (lewat login)"
curl -sS --max-time 20 -o "$T/ug-akun.txt" "$B/_uji_akun.php" >/dev/null 2>&1
curl -sS --max-time 20 -o "$T/ug-rr.txt"   "$B/_uji_ratereset.php" >/dev/null 2>&1
curl -sS --max-time 25 -o "$T/ug-set.txt" \
  "$B/_uji_setimg.php?b=3&u=https%3A%2F%2Fi.imgur.com%2Fabc.png&t=Tangkapan%20layar%20dashboard" 2>/dev/null
grep -q "OK Bagian 3" "$T/ug-set.txt" && ok "gambar disisipkan ke Bagian 3" || { bad "gagal menyisipkan"; cat "$T/ug-set.txt"; }

rm -f "$J"
curl -sS --max-time 20 -c "$J" -o "$T/ug-login.html" "$B/login.php" >/dev/null 2>&1
TOK=$(grep -oE 'name="csrf" value="[^"]+' "$T/ug-login.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$J" -c "$J" -o "$T/ug-post.html" \
  --data-urlencode "csrf=$TOK" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$J" -o "$T/ug-materi.html" "$B/materi.php?b=3" 2>/dev/null

grep -q '<figure class="gambar">' "$T/ug-materi.html" && ok "figure tampil di halaman materi" || bad "figure tidak sampai ke halaman"
grep -q 'src="https://i.imgur.com/abc.png"' "$T/ug-materi.html" && ok "src gambar benar" || bad "src salah/hilang"
grep -q 'Tangkapan layar dashboard' "$T/ug-materi.html" && ok "keterangan tampil" || bad "keterangan hilang"
grep -q '!\[' "$T/ug-materi.html" && bad "sintaks ![ masih terlihat mentah" || ok "sintaks gambar sudah jadi gambar"

echo
echo "### 4. CSS punya aturan gambar"
grep -q "figure.gambar" style.css && ok "aturan .isi-materi figure.gambar ada" || bad "CSS gambar hilang"
grep -q "height:auto" style.css && ok "tinggi mengikuti rasio (tidak gepeng)" || bad "tanpa height:auto"
sed -n '/@media print/,$p' style.css | grep -q "figure.gambar" \
  && ok "gambar diatur khusus saat cetak" || bad "gambar tidak diatur saat cetak"
sed -n '/@media print/,$p' style.css | grep -q "figure.gambar{display:none" \
  && bad "gambar malah disembunyikan saat cetak" || ok "gambar TETAP ikut tercetak"
grep -q "figure.gambar" cetak.php && ok "halaman cetak punya aturan gambar sendiri" || bad "halaman cetak tanpa aturan gambar"

echo
echo "### 5. Bersihkan bekas uji"
curl -sS --max-time 20 -o "$T/ug-bersih.txt" "$B/_uji_bersihvid.php?b=3" >/dev/null 2>&1
curl -sS --max-time 20 -o "$T/ug-b2.txt" "$B/_uji_bersihimg.php?b=3" 2>/dev/null
grep -q "dibersihkan" "$T/ug-b2.txt" && ok "Bagian 3 dipulihkan" || bad "gagal memulihkan Bagian 3"

echo
echo "-----"
echo "LULUS=$L GAGAL=$G"
[ "$G" = "0" ] || exit 1
