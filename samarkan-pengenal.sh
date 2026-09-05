#!/usr/bin/env bash
# samarkan-pengenal.sh — ganti pengenal hosting NYATA di berkas yang ikut git
# dengan placeholder generik.
#
# Kenapa perlu, padahal sandinya sudah tidak ada:
#   - Nama akun cPanel/FTP adalah USERNAME login (port 2083, FTP, SSH). Di repo
#     publik itu jadi separuh kredensial yang diserahkan gratis. Sandi = rahasia;
#     nama akun = "tidak untuk disebar" — dan repo publik jelas menyebarnya.
#   - pasang.php / setup.php / admin_setelan.php DIKIRIM KE PEMBELI. Placeholder
#     yang menyebut domain dan user DB pemilik asli itu bug produk, bukan cuma
#     soal keamanan: pembeli bingung harus mengisi apa.
#
# Skrip diagnosa tetap berfungsi setelah disamarkan, karena nilai aslinya dibaca
# dari berkas .cpanel / .ftp saat dijalankan — bukan dari teks skripnya.
#
# Yang TIDAK disamarkan: domain juraganprompt.biz.id di skrip cek live. Itu
# alamat situs publik yang memang bisa dibuka siapa saja, dan skrip cek butuh
# alamat sebenarnya supaya masih berguna.
#
# PENTING: skrip ini MENGECUALIKAN DIRINYA SENDIRI dari daftar berkas. Tanpa itu
# dia menimpa pola pencariannya sendiri pada jalan pertama (nama akun di dalam
# kodenya ikut berubah jadi placeholder), lalu jalan kedua tidak melakukan
# apa-apa dan tampak seolah semuanya sudah bersih.
set -uo pipefail
cd "$(dirname "$0")"

DIRI="samarkan-pengenal.sh"
BERKAS=$(git ls-files | grep -v "^${DIRI}$")

# Pasangan: pola -> pengganti. Urutan penting — yang paling panjang dulu, supaya
# pola gabungan (nama akun + akhiran DB) tidak tersambar aturan pendek.
ganti() {
  local pola="$1" baru="$2"; shift 2
  for f in "$@"; do
    [ -f "$f" ] || continue
    if grep -q -F "$pola" "$f" 2>/dev/null; then
      sed -i "s|$(printf '%s' "$pola" | sed 's/[.[\*^$]/\\&/g')|$baru|g" "$f"
      echo "  $f"
    fi
  done
}

# Pengenal yang disamarkan dibaca dari berkas kredensial yang TIDAK ikut git,
# bukan ditulis di sini. Alasannya sama dengan alasan skrip ini ada: repo ini
# publik, dan menuliskan nama akun cPanel di dalamnya sama saja dengan
# membatalkan pekerjaan skripnya sendiri.
AKUN=""
[ -f .cpanel ] && AKUN=$(tr -d '\r\n' < .cpanel | cut -d: -f1)
[ -n "${1:-}" ] && AKUN="$1"      # bisa juga: bash samarkan-pengenal.sh namaakun
DOM="juraganprompt.biz.id"

if [ -z "$AKUN" ]; then
  echo "Tidak tahu nama akun yang harus disamarkan."
  echo "Pakai: bash samarkan-pengenal.sh <namaakun>   (atau sediakan berkas .cpanel)"
  exit 1
fi

echo "== nama akun FTP/email =="
ganti "deploy@${DOM}" "deploy@domainmu.com" $BERKAS
ganti "admin@${DOM}" "admin@domainmu.com" $BERKAS

echo "== pengenal database (prefix cPanel) =="
ganti "${AKUN}_juraganprompt" "akunmu_namadb" $BERKAS
ganti "${AKUN}_adminDB" "akunmu_userdb" $BERKAS
ganti "${AKUN}_" "akunmu_" $BERKAS

echo "== nama akun cPanel =="
ganti "/home/${AKUN}" "/home/akunmu" $BERKAS
ganti "~${AKUN}" "~akunmu" $BERKAS
ganti "${AKUN}" "akunmu" $BERKAS

echo
echo "== sisa pengenal di berkas yang diversikan (harus kosong) =="
echo "$BERKAS" | tr '\n' '\0' | xargs -0 grep -lE "${AKUN}|admin@${DOM}|deploy@${DOM}" 2>/dev/null
echo "-- selesai --"
