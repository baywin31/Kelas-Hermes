#!/usr/bin/env bash
# uji-dashboard-lazy.sh — pastikan penggantian tampilan TIDAK menghilangkan
# apa pun dari dashboard.
#
# Kenapa perlu: berkas dashboard ditulis ulang seluruhnya. Yang paling
# berbahaya bukan tampilan jelek, tapi TOMBOL atau TAUTAN yang hilang tanpa
# disadari. Uji ini menghitung setiap tombol, tautan, dan alur aksi yang ada
# di versi lama, lalu memastikan semuanya masih ada.
set -u
cd "$(dirname "$0")"

LULUS=0; GAGAL=0
ok(){ LULUS=$((LULUS+1)); printf '  OK    %s\n' "$1"; }
no(){ GAGAL=$((GAGAL+1)); printf ' GAGAL  %s\n' "$1"; }
harus(){ # harus <nama> <pola>
  if grep -qF "$2" dashboard.php; then ok "$1"; else no "$1 (tidak ketemu: $2)"; fi
}

echo "=== 1. SINTAKS PHP ==="
for F in dashboard.php _theme.php; do
  if C:/Users/user/tools/php83/php.exe -c C:/Users/user/tools/php83/php.ini -l "$F" >/dev/null 2>&1; then
    ok "sintaks $F"
  else
    no "sintaks $F"; C:/Users/user/tools/php83/php.exe -c C:/Users/user/tools/php83/php.ini -l "$F" 2>&1 | head -3
  fi
done

echo
echo "=== 2. TOMBOL & TAUTAN LAMA MASIH ADA ==="
harus "tombol Telegram"        'btn btn-tele blok'
harus "tautan Komunitas"       'Join Komunitas Telegram'
harus "kode upgrade"           'redeem.php?upgrade=1'
harus "tombol Upgrade VIP"     '⭐ Upgrade ke VIP'
harus "tombol Buka tiap Bagian" 'materi.php?b='
harus "form tandai selesai"    'Tandai selesai'
harus "batal selesai"          '✓ Selesai'
harus "medan CSRF"             'csrf_field()'
harus "modul skill"            'skill.php'
harus "cari materi"            'cari.php'
harus "FAQ"                    'faq.php'
harus "tanya admin"            'tanya.php'
harus "tautan penting"         'Tautan penting'
harus "progres belajar lama"   'bar-dalam'
harus "daftar Bagian"          'Materi kelas'
harus "lencana Materi Baru"    'Materi Baru'
harus "penanda terkunci"       'Khusus Premium'
harus "teks terkunci"          'Terkunci'

echo
echo "=== 3. URUTAN WAJIB PRD MASIH BENAR ==="
# sapaan -> telegram -> daftar bagian -> progres
p_sapa=$(grep -n '1. SAPAAN' dashboard.php | head -1 | cut -d: -f1)
p_tele=$(grep -n '2. TOMBOL TELEGRAM' dashboard.php | head -1 | cut -d: -f1)
p_bagi=$(grep -n '3. DAFTAR BAGIAN' dashboard.php | head -1 | cut -d: -f1)
p_prog=$(grep -n '4. PROGRES' dashboard.php | head -1 | cut -d: -f1)
if [ -n "$p_sapa" ] && [ -n "$p_tele" ] && [ -n "$p_bagi" ] && [ -n "$p_prog" ] \
   && [ "$p_sapa" -lt "$p_tele" ] && [ "$p_tele" -lt "$p_bagi" ] && [ "$p_bagi" -lt "$p_prog" ]; then
  ok "urutan sapaan < telegram < daftar < progres  ($p_sapa<$p_tele<$p_bagi<$p_prog)"
else
  no "urutan PRD berubah"
fi

echo
echo "=== 4. MATERI TIDAK DISENTUH ==="
if [ -d cadangan ]; then
  J=$(ls cadangan/materi_cadangan_* 2>/dev/null | wc -l | tr -d ' ')
  [ "$J" -gt 0 ] && ok "cadangan materi utuh ($J berkas)" || no "cadangan materi hilang"
fi
# Isi materi ada di DATABASE, bukan di berkas. Yang harus tidak berubah adalah
# mesin yang membacanya (_progress.php) dan yang merendernya (_markdown.php,
# _komponen.php). materi.php boleh berubah tampilannya — isi materi tidak
# lewat berkas itu. Isi materi sendiri diperiksa terpisah oleh uji-isi.sh.
if git diff --quiet -- _progress.php _markdown.php _komponen.php 2>/dev/null; then
  ok "mesin materi (_progress/_markdown/_komponen) tidak berubah"
else
  no "mesin materi berubah"
  git diff --stat -- _progress.php _markdown.php _komponen.php | tail -3
fi
# Perubahan pada materi.php hanya boleh soal TAMPILAN (kelas/warna), bukan isi.
if git diff --quiet -- materi.php 2>/dev/null; then
  ok "materi.php tidak berubah sama sekali"
else
  GANTI=$(git diff -U0 -- materi.php | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -cE 'lz-vip|style=|class=' || true)
  TOTAL=$(git diff -U0 -- materi.php | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | wc -l | tr -d ' ')
  if [ "$GANTI" = "$TOTAL" ]; then
    ok "perubahan materi.php hanya soal tampilan ($TOTAL baris)"
  else
    no "materi.php berubah di luar tampilan ($((TOTAL-GANTI)) baris)"
    git diff -U0 -- materi.php | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE 'lz-vip|style=|class=' | head -4
  fi
fi

echo
echo "=== 5. LAPISAN TAMPILAN TERPASANG ==="
grep -q 'gaya-lazy.css' _theme.php && ok "gaya-lazy.css dimuat" || no "gaya-lazy.css tidak dimuat"
grep -q 'prefers-color-scheme' gaya-lazy.css && ok "tema ikut setelan sistem" || no "tidak ada prefers-color-scheme"
if grep -q 'tampilan-v2.css' _theme.php && grep -q 'tw.css' _theme.php; then
  ok "lapisan lama tetap ada"
else
  no "lapisan lama hilang"
fi

echo
echo "=== 6. WIDGET DIPASANG ==="
for W in lz-grid lz-lanjut lz-batang lz-cincin lz-rentetan lz-aktivitas; do
  if grep -q "$W" dashboard.php && grep -q "$W" gaya-lazy.css; then ok "widget $W"; else no "widget $W"; fi
done

echo
echo "=== 7. TIDAK ADA JAVASCRIPT BARU ==="
if grep -q '<script' dashboard.php; then no "dashboard.php menambah <script>"; else ok "dashboard.php tanpa <script> baru"; fi
# Hitung fungsi PHP yang dideklarasikan di dashboard.php.
J=$(grep -cE '^function ' dashboard.php)
J=${J:-0}
if [ "$J" -eq 0 ]; then ok "tidak ada fungsi baru"; else no "ada $J fungsi baru di dashboard.php"; fi

echo
echo "==================================================="
echo "LULUS: $LULUS   GAGAL: $GAGAL"
echo "==================================================="
[ "$GAGAL" -eq 0 ] || exit 1
