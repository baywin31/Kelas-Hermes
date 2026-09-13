#!/usr/bin/env bash
# uji-skill.sh — uji fitur unduhan skill dari sisi member.
#
# Kenapa harus lewat HTTP, bukan langsung memanggil fungsi PHP: yang paling
# mudah rusak senyap adalah header unduhan + hak akses tier. Keduanya hanya
# terlihat kalau diuji sebagai pengguna sungguhan (login, klik, terima berkas).
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813

lulus=0; gagal=0
ok()   { echo "  LULUS  $1"; lulus=$((lulus+1)); }
no()   { echo "  GAGAL  $1"; gagal=$((gagal+1)); }

echo "=== 1. Halaman wajib login ==="
KODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$B/skill.php")
[ "$KODE" = "302" ] && ok "skill.php tanpa login → 302" || no "skill.php tanpa login → $KODE (harus 302)"

KODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$B/unduh.php?id=1")
[ "$KODE" = "302" ] && ok "unduh.php tanpa login → 302" || no "unduh.php tanpa login → $KODE (harus 302)"

echo
echo "=== 2. Login member ==="
# Akun uji dipastikan ada dulu (password direset). Tanpa langkah ini, uji
# melaporkan \"302\" dan \"paket bocor\" padahal penyebabnya cuma belum login —
# pesan yang menyesatkan dan menghabiskan waktu.
curl -sS --max-time 20 "$B/_uji_akun.php" -o "$T/sk-akun.txt"
grep -q "verify: OK" "$T/sk-akun.txt" && ok "akun uji siap" || no "akun uji tidak siap"

rm -f "$T/cj.txt"
TOKEN=$(curl -sS -c "$T/cj.txt" --max-time 20 "$B/login.php" \
  | grep -oE 'name="csrf" value="[^"]+"' | head -1 | sed 's/.*value="//;s/"//')
if [ -z "$TOKEN" ]; then no "csrf login tidak terbaca"; else ok "csrf login terbaca"; fi

curl -sS -b "$T/cj.txt" -c "$T/cj.txt" -L -o "$T/lg.html" --max-time 25 \
  --data-urlencode "csrf=$TOKEN" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php"

grep -q 'Dashboard' "$T/lg.html" && ok "login member berhasil" || no "login member gagal"

echo
echo "=== 3. Halaman Modul Skill ==="
KODE=$(curl -sS -b "$T/cj.txt" -o "$T/sk.html" -w "%{http_code}" --max-time 25 "$B/skill.php")
[ "$KODE" = "200" ] && ok "skill.php → 200" || no "skill.php → $KODE"

grep -q "Modul Skill" "$T/sk.html" && ok "judul halaman tampil" || no "judul halaman tidak ada"
N_BTN=$(grep -c 'unduh.php?id=' "$T/sk.html")
[ "$N_BTN" -ge 1 ] && ok "tombol unduh muncul ($N_BTN)" || no "tombol unduh tidak ada"
grep -q "Hermes Agent" "$T/sk.html" && ok "paket hermes-agent tampil" || no "paket hermes-agent tidak tampil"
grep -q "Zip ·" "$T/sk.html" && ok "ukuran berkas tampil" || no "ukuran berkas tidak tampil"

echo
echo "=== 4. Unduh berkas benar-benar terkirim ==="
ID=$(grep -oE 'unduh\.php\?id=[0-9]+' "$T/sk.html" | head -1 | grep -oE '[0-9]+')
[ -n "$ID" ] && ok "id paket terbaca ($ID)" || no "id paket tidak terbaca"

if [ -n "$ID" ]; then
  curl -sS -b "$T/cj.txt" -D "$T/hd.txt" -o "$T/unduhan.zip" --max-time 60 "$B/unduh.php?id=$ID"

  grep -qi "Content-Type: application/zip" "$T/hd.txt" && ok "header Content-Type: application/zip" || no "Content-Type salah"
  grep -qi "Content-Disposition: attachment" "$T/hd.txt" && ok "header Content-Disposition: attachment" || no "Content-Disposition salah"

  UK=$(wc -c < "$T/unduhan.zip" | tr -d ' ')
  [ "$UK" -gt 1000 ] && ok "berkas terkirim ($UK B)" || no "berkas terlalu kecil ($UK B)"

  # Zip yang sah selalu diawali "PK". Ini penjaga paling murah terhadap
  # "notice PHP nyelip di depan berkas" yang bikin zip rusak di pembeli.
  KEPALA=$(head -c 2 "$T/unduhan.zip")
  [ "$KEPALA" = "PK" ] && ok "isi berkas arsip zip sah (PK)" || no "berkas bukan zip (diawali: $KEPALA)"

  # Nama unduhan harus nama paket, bukan nama berkas acak di server.
  grep -qi 'filename="[^"]*Hermes' "$T/hd.txt" && ok "nama unduhan ramah pembaca" || \
    { echo "     (nama: $(grep -i 'Content-Disposition' "$T/hd.txt" | head -1 | cut -c1-90))"; no "nama unduhan masih nama server"; }
fi

echo
echo "=== 5. Penghitung unduhan naik ==="
N1=$(grep -oE '[0-9]+× diunduh' "$T/sk.html" | head -1 | grep -oE '^[0-9]+')
curl -sS -b "$T/cj.txt" -o "$T/sk2.html" --max-time 25 "$B/skill.php"
N2=$(grep -oE '[0-9]+× diunduh' "$T/sk2.html" | head -1 | grep -oE '^[0-9]+')
[ "${N2:-0}" -gt "${N1:-0}" ] && ok "hitungan naik ($N1 → $N2)" || no "hitungan tidak naik ($N1 → $N2)"

echo
echo "=== 6. Proteksi folder unduhan/ ==="
# Catatan penting: server PHP bawaan (php -S) TIDAK membaca .htaccess sama
# sekali, jadi menguji 403 di sini akan selalu gagal walaupun hosting sudah
# aman. Yang bisa diperiksa lokal: berkas penolaknya ada dan isinya benar.
# Penolakan sungguhan diuji di hosting lewat cek-live-skill.sh.
if [ -f unduhan/.htaccess ]; then
  ok "unduhan/.htaccess ada"
  grep -q "Require all denied" unduhan/.htaccess && ok "aturan Require all denied ada" || no "aturan deny tidak ada"
  grep -q "Deny from all" unduhan/.htaccess && ok "aturan Deny from all ada (Apache lama)" || no "aturan deny lama tidak ada"
  grep -q "Options -Indexes" unduhan/.htaccess && ok "daftar folder dimatikan" || no "Options -Indexes hilang"
else
  no "unduhan/.htaccess TIDAK ada — paket bisa diambil langsung tanpa login"
fi

echo
echo "=== 7. Halaman admin kelola skill ==="
rm -f "$T/ca.txt"
TOKEN=$(curl -sS -c "$T/ca.txt" --max-time 20 "$B/login.php" \
  | grep -oE 'name="csrf" value="[^"]+"' | head -1 | sed 's/.*value="//;s/"//')
curl -sS -b "$T/ca.txt" -c "$T/ca.txt" -L -o /dev/null --max-time 25 \
  --data-urlencode "csrf=$TOKEN" --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php"
KODE=$(curl -sS -b "$T/ca.txt" -o "$T/as.html" -w "%{http_code}" --max-time 25 "$B/admin_skill.php")
[ "$KODE" = "200" ] && ok "admin_skill.php → 200" || no "admin_skill.php → $KODE"
grep -q "Tambah paket" "$T/as.html" && ok "form tambah paket ada" || no "form tambah paket tidak ada"
grep -q "berkas_ada" "$T/as.html" && ok "pilihan berkas yang sudah ada" || no "pilihan berkas tidak ada"
grep -q "Simpan perubahan" "$T/as.html" && ok "form ubah paket ada" || no "form ubah tidak ada"
grep -q "Hapus paket ini" "$T/as.html" && ok "tombol hapus ada" || no "tombol hapus tidak ada"

echo
echo "=== 8. admin_skill.php menolak non-admin ==="
K=$(curl -sS -b "$T/cj.txt" -o /dev/null -w "%{http_code}" --max-time 20 "$B/admin_skill.php")
[ "$K" = "403" ] && ok "member ditolak (403)" || no "member dapat $K (harus 403)"

echo
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
