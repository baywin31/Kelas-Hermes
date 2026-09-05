#!/usr/bin/env bash
# uji-ratelimit.sh — bukti nyata bahwa perbaikan rate limit bekerja:
#   1. 14 kode salah berturut-turut masih boleh mencoba (batas baru 15)
#   2. percobaan ke-16 diblokir
#   3. tombol admin "Buka semua blokir" mengembalikan akses
#   4. kode BENAR mereset hitungan, jadi salah ketik sebelumnya tidak mengunci
set -u
BASE="${1:-http://127.0.0.1:8813}"
W="C:/Users/user/AppData/Local/Temp/kd-rl"; mkdir -p "$W"
LULUS=0; GAGAL=0
ok()  { echo "OK   $1"; LULUS=$((LULUS+1)); }
bad() { echo "GAGAL $1"; GAGAL=$((GAGAL+1)); }
tok() { grep -oE 'name="csrf" value="[a-f0-9]+"' "$1" | head -1 | grep -oE '[a-f0-9]{32}'; }

# Bersihkan hitungan dulu supaya hasil deterministik, dan pastikan akun demo
# ada (uji-portable.sh menghapus tabel, jadi jangan asumsikan admin sudah ada).
curl -sS --max-time 25 -o "$W/demo0.txt" "$BASE/_uji_demo.php" >/dev/null
curl -sS --max-time 20 -o "$W/b.txt" "$BASE/_uji_bersih.php" >/dev/null

# Satu percobaan dengan kode salah yang FORMATNYA benar (biar yang diuji
# memang jalur "kode tidak ditemukan", bukan penolakan format).
coba_kode() {
  local J="$W/j.txt"
  curl -sS --max-time 20 -c "$J" -o "$W/r.html" "$BASE/redeem.php"
  local T; T=$(tok "$W/r.html")
  curl -sS --max-time 20 -b "$J" -c "$J" -o "$W/r2.html" -w '%{http_code}' "$BASE/redeem.php" \
    --data-urlencode "csrf=$T" --data-urlencode "aksi=cek" \
    --data-urlencode "kode=HRMS-ZZZZ-ZZZZ-ZZZZ"
}

echo "### 1. Batas baru 15 percobaan"
KE14=$(for i in $(seq 1 14); do coba_kode "$i" >/dev/null; done; coba_kode X)
if grep -q "tidak ditemukan" "$W/r2.html"; then
  ok "percobaan ke-15 masih memberi pesan 'kode tidak ditemukan' (belum diblokir)"
else
  bad "percobaan ke-15 sudah diblokir, batas belum naik"
fi

echo
echo "### 2. Percobaan berikutnya diblokir"
coba_kode Y >/dev/null; coba_kode Z >/dev/null
if grep -q "Terlalu banyak percobaan" "$W/r2.html"; then
  ok "blokir aktif setelah melewati batas"
else
  bad "blokir tidak aktif padahal batas terlewat"
fi
if grep -q "Tanya Admin" "$W/r2.html"; then
  ok "pesan blokir menyertakan jalan keluar (Tanya Admin)"
else
  bad "pesan blokir tidak menyebut Tanya Admin"
fi

echo
echo "### 3. Tombol admin membuka blokir"
JA="$W/ja.txt"; rm -f "$JA"
curl -sS --max-time 20 -c "$JA" -o "$W/l.html" "$BASE/login.php"
TL=$(tok "$W/l.html")
curl -sS --max-time 20 -b "$JA" -c "$JA" -L -o "$W/dash.html" "$BASE/login.php" \
  --data-urlencode "csrf=$TL" --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" >/dev/null
curl -sS --max-time 20 -b "$JA" -c "$JA" -o "$W/adm.html" "$BASE/admin.php"
TA=$(tok "$W/adm.html")
curl -sS --max-time 20 -b "$JA" -c "$JA" -o "$W/adm2.html" "$BASE/admin.php" \
  --data-urlencode "csrf=$TA" --data-urlencode "aksi=buka_blokir" >/dev/null
if grep -q "Blokir percobaan dibuka" "$W/adm2.html"; then
  ok "admin bisa membuka blokir dari panel"
else
  bad "tombol buka blokir tidak memberi konfirmasi"
fi

echo
echo "### 4. Setelah dibuka, redeem bisa dipakai lagi"
coba_kode Q >/dev/null
if grep -q "tidak ditemukan" "$W/r2.html"; then
  ok "percobaan diterima kembali setelah blokir dibuka"
else
  bad "masih diblokir setelah admin membuka"
fi

echo
echo "### 5. Kode BENAR mereset hitungan"
curl -sS --max-time 20 -o "$W/b.txt" "$BASE/_uji_bersih.php" >/dev/null
for i in $(seq 1 10); do coba_kode "$i" >/dev/null; done
# Ambil satu kode demo yang belum dipakai.
curl -sS --max-time 25 -o "$W/demo.txt" "$BASE/_uji_demo.php"
KODE=$(grep -oE 'HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}' "$W/demo.txt" | head -1)
JR="$W/jr.txt"; rm -f "$JR"
curl -sS --max-time 20 -c "$JR" -o "$W/r3.html" "$BASE/redeem.php"
T3=$(tok "$W/r3.html")
curl -sS --max-time 20 -b "$JR" -c "$JR" -o "$W/r4.html" "$BASE/redeem.php" \
  --data-urlencode "csrf=$T3" --data-urlencode "aksi=cek" --data-urlencode "kode=$KODE" >/dev/null
if grep -qiE "nama|password" "$W/r4.html"; then
  ok "kode benar ($KODE) lolos ke form buat akun walau sudah 10x salah"
else
  bad "kode benar tidak lolos ke tahap buat akun"
fi
for i in $(seq 1 10); do coba_kode "$i" >/dev/null; done
if grep -q "tidak ditemukan" "$W/r2.html"; then
  ok "hitungan benar-benar direset setelah kode benar (10x lagi masih boleh)"
else
  bad "hitungan tidak direset setelah kode benar"
fi

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
[ "$GAGAL" -eq 0 ]
