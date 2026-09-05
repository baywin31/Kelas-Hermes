#!/usr/bin/env bash
# uji-pasang.sh — uji pasang.php sungguhan di server lokal:
#   1. kunci salah -> 404
#   2. halaman terbuka & menemukan kandidat kredensial
#   3. kredensial salah -> pesan + saran, TIDAK menimpa _config.php
#   4. kredensial benar -> _config.php ditulis & app hidup
set -u
BASE="${1:-http://127.0.0.1:8813}"
W="C:/Users/user/AppData/Local/Temp/kd-pasang"; mkdir -p "$W"
D="C:/Users/user/apps/karyawan-digital-php"
LULUS=0; GAGAL=0
ok()  { echo "OK   $1"; LULUS=$((LULUS+1)); }
bad() { echo "GAGAL $1"; GAGAL=$((GAGAL+1)); }

# Simpan _config.php asli, pulihkan di akhir apa pun yang terjadi.
cp -f "$D/_config.php" "$W/_config.asli.php"
pulihkan() { cp -f "$W/_config.asli.php" "$D/_config.php"; }
trap pulihkan EXIT

echo "### 1. Gerbang kunci"
c=$(curl -sS -o "$W/g.html" -w '%{http_code}' --max-time 20 "$BASE/pasang.php?k=salah")
[ "$c" = "404" ] && ok "kunci salah ditolak (404)" || bad "kunci salah malah $c"
c=$(curl -sS -o "$W/p.html" -w '%{http_code}' --max-time 20 "$BASE/pasang.php?k=pasang2026")
[ "$c" = "200" ] && ok "kunci benar membuka halaman (200)" || bad "kunci benar malah $c"

echo
echo "### 2. Halaman memuat isi yang diharapkan"
grep -q "Pemasang Karyawan Digital" "$W/p.html" && ok "judul tampil" || bad "judul tidak tampil"
grep -q "Kandidat kredensial" "$W/p.html" && ok "bagian kandidat tampil" || bad "bagian kandidat hilang"
grep -q "Atau isi manual" "$W/p.html" && ok "form manual tampil" || bad "form manual hilang"
grep -qE "DB_HOST|DB_USER" "$W/p.html" && ok "label kolom DB tampil" || bad "label kolom DB hilang"
if grep -qE "_config\.(php|local\.php)" "$W/p.html"; then
  ok "menemukan berkas konfigurasi sebagai kandidat"
else
  bad "tidak menemukan kandidat apa pun"
fi
# Password tidak boleh muncul di halaman.
PW=$(grep -oE "DB_PASS\s*=\s*'[^']*'" "$W/_config.asli.php" | head -1 | cut -d"'" -f2)
if [ -n "$PW" ] && grep -qF "$PW" "$W/p.html"; then
  bad "password bocor ke halaman"
else
  ok "password tidak ditampilkan di halaman"
fi

echo
echo "### 3. Kredensial salah ditolak"
curl -sS --max-time 25 -o "$W/s.html" "$BASE/pasang.php" \
  --data-urlencode "k=pasang2026" --data-urlencode "aksi=pasang" \
  --data-urlencode "host=localhost" --data-urlencode "user=user_ngawur" \
  --data-urlencode "pass=salah" --data-urlencode "name=db_ngawur" >/dev/null
grep -q "Gagal tersambung" "$W/s.html" && ok "koneksi gagal dilaporkan" || bad "kegagalan tidak dilaporkan"
grep -qiE "Access denied|MySQL|Unknown database|refused" "$W/s.html" \
  && ok "pesan MySQL asli ikut ditampilkan" || bad "pesan MySQL tidak ditampilkan"
grep -qiE "Add User To Database|Create New Database|localhost" "$W/s.html" \
  && ok "memberi saran perbaikan" || bad "tidak memberi saran"
if diff -q "$D/_config.php" "$W/_config.asli.php" >/dev/null; then
  ok "_config.php TIDAK ditimpa saat kredensial salah"
else
  bad "_config.php tertimpa padahal kredensial salah"
fi

echo
echo "### 4. Kredensial benar dipasang"
# Ambil kredensial nyata dari _config.local.php (dipakai server uji lokal).
LH=$(grep -oE "DB_HOST\s*=\s*'[^']*'" "$D/_config.local.php" | head -1 | cut -d"'" -f2)
LU=$(grep -oE "DB_USER\s*=\s*'[^']*'" "$D/_config.local.php" | head -1 | cut -d"'" -f2)
LP=$(grep -oE "DB_PASS\s*=\s*'[^']*'" "$D/_config.local.php" | head -1 | cut -d"'" -f2)
LN=$(grep -oE "DB_NAME\s*=\s*'[^']*'" "$D/_config.local.php" | head -1 | cut -d"'" -f2)
curl -sS --max-time 30 -o "$W/b.html" "$BASE/pasang.php" \
  --data-urlencode "k=pasang2026" --data-urlencode "aksi=pasang" \
  --data-urlencode "host=$LH" --data-urlencode "user=$LU" \
  --data-urlencode "pass=$LP" --data-urlencode "name=$LN" >/dev/null
grep -q "sudah ditulis" "$W/b.html" && ok "_config.php dilaporkan tertulis" || bad "tidak melaporkan berhasil"
grep -q "Lanjut ke setup.php" "$W/b.html" && ok "tombol lanjut ke setup tampil" || bad "tombol lanjut hilang"
if grep -q "dibuat otomatis oleh pasang.php" "$D/_config.php"; then
  ok "_config.php benar-benar berubah di disk"
else
  bad "_config.php di disk tidak berubah"
fi
grep -q "const BASE_URL" "$D/_config.php" && ok "BASE_URL ikut ditulis" || bad "BASE_URL tidak ditulis"
c=$(curl -sS -o "$W/i.html" -w '%{http_code}' --max-time 25 "$BASE/index.php")
[ "$c" = "200" ] && ok "index.php hidup dengan config hasil pasang ($c)" || bad "index.php balas $c"
c=$(curl -sS -o "$W/l.html" -w '%{http_code}' --max-time 25 "$BASE/login.php")
[ "$c" = "200" ] && ok "login.php hidup ($c)" || bad "login.php balas $c"

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
[ "$GAGAL" -eq 0 ]
