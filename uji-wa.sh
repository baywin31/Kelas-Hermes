#!/usr/bin/env bash
# uji-wa.sh — uji tombol WhatsApp sungguhan lewat HTTP di server lokal.
# Menguji: normalisasi nomor, tombol apung muncul/hilang, pesan terisi,
# validasi nomor ngawur, dan tombol hilang saat nomor dikosongkan.
set -u
BASE="${1:-http://127.0.0.1:8813}"
T="C:/Users/user/AppData/Local/Temp"
J="$T/kd-wa-jar.txt"
LULUS=0; GAGAL=0
ok()  { echo "OK   $1"; LULUS=$((LULUS+1)); }
bad() { echo "GAGAL $1"; GAGAL=$((GAGAL+1)); }

rm -f "$J"
curl -sS --max-time 25 -o "$T/wa-seed.txt" "$BASE/_uji_demo.php" >/dev/null 2>&1

# --- login admin
csrf=$(curl -sS --max-time 20 -c "$J" "$BASE/login.php" | grep -oE 'name="csrf" value="[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{16,}')
curl -sS --max-time 25 -b "$J" -c "$J" -o "$T/wa-login.html" \
  --data-urlencode "csrf=$csrf" --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" "$BASE/login.php" >/dev/null

setel() {  # $1 = nomor, $2 = pesan
  local c
  c=$(curl -sS --max-time 20 -b "$J" -c "$J" "$BASE/admin_setelan.php" \
      | grep -oE 'name="csrf" value="[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{16,}')
  curl -sS --max-time 25 -b "$J" -c "$J" -o "$T/wa-set.html" \
    --data-urlencode "csrf=$c" --data-urlencode "aksi=umum" \
    --data-urlencode "telegram_url=https://t.me/+contohlinkuji" \
    --data-urlencode "email_admin=admin@demo.id" \
    --data-urlencode "wa_nomor=$1" --data-urlencode "wa_pesan=$2" \
    "$BASE/admin_setelan.php" >/dev/null
}

echo "### 1. Nomor lokal 08xx dirapikan jadi 62xx"
setel "0812-3456-7890" ""
curl -sS --max-time 20 -b "$J" -o "$T/wa-tanya.html" "$BASE/tanya.php"
grep -q "wa.me/6281234567890" "$T/wa-tanya.html" \
  && ok "0812-3456-7890 -> wa.me/6281234567890" || bad "normalisasi 08xx gagal"

echo
echo "### 2. Tombol apung ada di semua halaman"
# login.php & redeem.php menolak sesi yang sudah masuk (redirect ke dashboard),
# jadi keduanya diambil tanpa cookie — persis seperti pengunjung baru.
for p in login.php redeem.php; do
  curl -sS --max-time 20 -o "$T/wa-p.html" "$BASE/$p"
  grep -q 'class="wa-apung"' "$T/wa-p.html" && ok "tombol apung di $p (tamu)" || bad "tombol apung hilang di $p"
done
for p in tanya.php dashboard.php; do
  curl -sS --max-time 20 -b "$J" -o "$T/wa-p.html" "$BASE/$p"
  grep -q 'class="wa-apung"' "$T/wa-p.html" && ok "tombol apung di $p" || bad "tombol apung hilang di $p"
done

echo
echo "### 3. Pesan pembuka terisi otomatis"
grep -q "text=Halo%20admin" "$T/wa-tanya.html" && ok "pesan default terisi" || bad "pesan tidak terisi"
# Yang login di skrip ini admin, jadi yang dicari email admin — intinya
# identitas orang yang chat ikut terkirim, bukan nama tertentu.
grep -q "admin%40demo.id" "$T/wa-tanya.html" \
  && ok "identitas pengirim ikut di pesan Tanya Admin" || bad "identitas pengirim tidak ikut"

echo
echo "### 4. Halaman redeem punya jalan keluar WA"
curl -sS --max-time 20 -o "$T/wa-redeem.html" "$BASE/redeem.php"
grep -q "wa.me/" "$T/wa-redeem.html" && ok "redeem punya tautan WA" || bad "redeem tanpa tautan WA"

echo
echo "### 5. Nomor ngawur ditolak"
setel "abc" ""
# Simpan selalu membalas redirect; pesan flash baru terbaca di GET berikutnya.
curl -sS --max-time 20 -b "$J" -c "$J" -o "$T/wa-flash.html" "$BASE/admin_setelan.php"
grep -qE "tidak masuk akal" "$T/wa-flash.html" \
  && ok "nomor 'abc' ditolak dengan pesan jelas" || bad "nomor ngawur tidak ditolak"
# Nomor lama tidak boleh tertimpa oleh input yang ditolak.
curl -sS --max-time 20 -b "$J" -o "$T/wa-tetap.html" "$BASE/tanya.php"
grep -q "wa.me/6281234567890" "$T/wa-tetap.html" \
  && ok "nomor lama tetap utuh setelah input ditolak" || bad "nomor lama ikut rusak"

echo
echo "### 6. Nomor dikosongkan -> tombol hilang total"
setel "" ""
curl -sS --max-time 20 -b "$J" -o "$T/wa-kosong.html" "$BASE/tanya.php"
grep -q "wa-apung" "$T/wa-kosong.html" && bad "tombol masih ada padahal nomor kosong" \
  || ok "tombol WA hilang saat nomor kosong"
grep -q "Tanya di grup Telegram" "$T/wa-kosong.html" \
  && ok "tombol Telegram tetap jalan" || bad "Telegram ikut hilang"

echo
echo "### 7. Format 62xx langsung diterima"
setel "6289900112233" "Halo admin, saya mau tanya"
curl -sS --max-time 20 -b "$J" -o "$T/wa-62.html" "$BASE/tanya.php"
grep -q "wa.me/6289900112233" "$T/wa-62.html" && ok "6289900112233 diterima apa adanya" || bad "format 62xx gagal"

echo
echo "### 8. Tombol WA tidak ikut tercetak"
grep -q "wa-apung{display:none" "$T/wa-print.css" 2>/dev/null || \
  curl -sS --max-time 20 -o "$T/wa-print.css" "$BASE/style.css"
grep -A2 "@media print" "$T/wa-print.css" | grep -q "wa-apung" \
  && ok "wa-apung disembunyikan saat cetak" || bad "wa-apung ikut tercetak"

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
[ "$GAGAL" -eq 0 ]
