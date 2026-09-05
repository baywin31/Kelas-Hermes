#!/usr/bin/env bash
# uji-video.sh — uji embed video di mode PHP lewat HTTP sungguhan.
# Yang dipastikan: iframe dipasang, host dipaku ke youtube-nocookie,
# ID diambil benar dari SEMUA bentuk tautan, tautan jahat ditolak,
# shorts jadi tegak, dan video tidak ikut tercetak.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
J="$T/uv-cookie.txt"
lulus=0; gagal=0
ok(){ echo "OK   $1"; lulus=$((lulus+1)); }
bad(){ echo "BAD  $1"; gagal=$((gagal+1)); }

echo "### 1. Fungsi yt_id: semua bentuk tautan"
cat > "$T/uv-id.php" <<'PHP'
<?php
require 'C:/Users/user/apps/karyawan-digital-php/_markdown.php';
$uji = [
  'https://youtube.com/shorts/3on5-_oqsGs?feature=share' => '3on5-_oqsGs',
  'https://www.youtube.com/watch?v=3on5-_oqsGs'          => '3on5-_oqsGs',
  'https://youtu.be/3on5-_oqsGs'                         => '3on5-_oqsGs',
  'https://www.youtube.com/embed/3on5-_oqsGs'            => '3on5-_oqsGs',
  '3on5-_oqsGs'                                          => '3on5-_oqsGs',
  'https://vimeo.com/12345'                              => '',
  'javascript:alert(1)'                                  => '',
  'https://evil.com/youtube.com/shorts/AAAAAAAAAAA'      => '',
  'https://m.youtube.com/watch?v=3on5-_oqsGs'            => '3on5-_oqsGs',
  'https://www.youtube.com/watch?feature=x&v=3on5-_oqsGs' => '3on5-_oqsGs',
];
foreach ($uji as $in => $harap) {
  $dapat = yt_id($in);
  echo ($dapat === $harap ? 'OK  ' : 'BAD ') . str_pad(substr($in, 0, 46), 48)
     . "-> '" . $dapat . "'" . ($dapat === $harap ? '' : " (harap '$harap')") . "\n";
}
PHP
C:/Users/user/tools/php83/php.exe "$T/uv-id.php" > "$T/uv-id.txt" 2>&1
sed 's/^/   /' "$T/uv-id.txt"
if grep -q "^BAD" "$T/uv-id.txt"; then bad "ada bentuk tautan yang salah dibaca"
else ok "semua bentuk tautan dibaca benar"; fi

echo
echo "### 2. Login sebagai member lalu buka Bagian 1"
rm -f "$J"
curl -sS --max-time 20 -c "$J" -o "$T/uv-login.html" "$B/login.php" >/dev/null 2>&1
# Nama field CSRF di app ini 'csrf', bukan '_csrf'.
TOK=$(grep -oE 'name="csrf" value="[^"]+' "$T/uv-login.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$J" -c "$J" -o "$T/uv-post.html" \
  --data-urlencode "csrf=$TOK" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$J" -o "$T/uv-materi.html" "$B/materi.php?b=1" 2>/dev/null
grep -q "Kenalan dan Setup" "$T/uv-materi.html" \
  && ok "halaman Bagian 1 terbuka" || { bad "gagal buka materi (login gagal?)"; }

echo
echo "### 3. Iframe benar-benar terpasang"
grep -q '<iframe' "$T/uv-materi.html" && ok "ada tag iframe" || bad "tidak ada iframe"
grep -q 'youtube-nocookie.com/embed/3on5-_oqsGs' "$T/uv-materi.html" \
  && ok "host dipaku ke youtube-nocookie + ID benar" || bad "src iframe salah"
grep -q 'class="video-embed tegak"' "$T/uv-materi.html" \
  && ok "shorts dipasang tegak (9:16)" || bad "shorts tidak dapat kelas tegak"
grep -q 'loading="lazy"' "$T/uv-materi.html" \
  && ok "lazy-load aktif (halaman tidak melambat)" || bad "tanpa lazy-load"
grep -q 'allowfullscreen' "$T/uv-materi.html" \
  && ok "bisa layar penuh" || bad "tidak bisa fullscreen"
grep -q 'Buka video ini di YouTube' "$T/uv-materi.html" \
  && ok "ada tautan cadangan ke YouTube" || bad "tautan cadangan hilang"
grep -q 'title="Tutorial Install Hermes Agent"' "$T/uv-materi.html" \
  && ok "judul video terpasang di iframe" || bad "judul iframe kosong"

echo
echo "### 4. Baris @video tidak muncul sebagai teks mentah"
grep -q '@video' "$T/uv-materi.html" \
  && bad "penanda @video masih terbaca pengunjung" \
  || ok "penanda @video sudah jadi video"

echo
echo "### 5. Daftar isi tidak tercemar baris video"
grep -c 'class="l3"\|href="#apa-yang' "$T/uv-materi.html" >/dev/null
grep -q 'href="#video\|>@video<' "$T/uv-materi.html" \
  && bad "baris video masuk daftar isi" || ok "daftar isi bersih"

echo
echo "### 6. CSS punya aturan video"
curl -sS --max-time 20 -o "$T/uv-css.txt" "$B/style.css" 2>/dev/null
grep -q '\.video-embed' "$T/uv-css.txt" && ok "kelas .video-embed ada" || bad ".video-embed tidak ada"
grep -q 'aspect-ratio:9/16' "$T/uv-css.txt" && ok "rasio tegak 9:16 ada" || bad "rasio tegak tidak ada"
grep -A 2 '@media print' "$T/uv-css.txt" | grep -q 'video-embed' \
  && ok "video disembunyikan saat cetak" || bad "video ikut tercetak"

echo
echo "### 7. Versi cetak tetap bersih"
curl -sS --max-time 20 -b "$J" -o "$T/uv-cetak.html" "$B/cetak.php?b=1" 2>/dev/null
grep -q "Kenalan dan Setup" "$T/uv-cetak.html" && ok "halaman cetak terbuka" || bad "halaman cetak gagal"

echo
echo "### 8. Pencarian tidak menampilkan URL panjang"
curl -sS --max-time 20 -b "$J" -o "$T/uv-cari.html" "$B/cari.php?q=Hermes" 2>/dev/null
grep -q "youtube.com/shorts" "$T/uv-cari.html" \
  && bad "URL video bocor ke kutipan pencarian" || ok "kutipan pencarian bersih"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
