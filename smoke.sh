#!/usr/bin/env bash
# smoke.sh — uji end-to-end app PHP lewat HTTP nyata.
# Pakai: bash smoke.sh http://localhost:8813
set -u
BASE="${1:-http://localhost:8813}"
W="C:/Users/user/AppData/Local/Temp/kdphp"
rm -rf "$W"; mkdir -p "$W"
J="$W/j.txt"; O="$W/o.html"
LULUS=0; GAGAL=0
TS="$(date +%s)"
EMAIL="smoke$TS@contoh.id"
PASS="PasswordKuat1"

# Kredensial admin disimpan di luar $W supaya smoke bisa dijalankan berulang
# tanpa perlu menghapus tabel: setup.php hanya membuat admin sekali.
ADMINFILE="C:/Users/user/AppData/Local/Temp/kdphp_admin.txt"
if [ -s "$ADMINFILE" ]; then
  ADMIN="$(cat "$ADMINFILE")"
  SETUP_BARU=0
else
  ADMIN="admin$TS@contoh.id"
  SETUP_BARU=1
fi

# curl native Windows: pakai path bergaya C:/...
# CATATAN: jangan pakai -X POST bersama -L. -X memaksa metode tetap POST saat
# mengikuti redirect, sehingga POST terkirim ulang ke halaman tujuan dan ditolak
# CSRF (419). Cukup pakai --data-urlencode; curl otomatis POST lalu GET saat 302.
c() { curl -sS --max-time 45 -b "$J" -c "$J" "$@"; }

ok()   { LULUS=$((LULUS+1)); echo "OK   $1"; }
bad()  { GAGAL=$((GAGAL+1)); echo "GAGAL $1"; }
cek()  { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1: dapat $2, harusnya $3"; fi }
punya(){ if grep -q "$2" "$O"; then ok "$1"; else bad "$1 (teks '$2' tidak ada)"; fi }
kode() { c -o "$O" -w '%{http_code}' "$@"; }

# Ambil nilai token CSRF dari halaman terakhir.
csrf() { grep -oE 'name="csrf" value="[a-f0-9]+"' "$O" | head -1 | grep -oE '[a-f0-9]{32}'; }

# Kosongkan rate limit dulu (endpoint hanya aktif di localhost/127.0.0.1:8813).
# curl native Windows menolak -o /dev/null (error 23), jadi tulis ke berkas nyata.
curl -sS --max-time 20 -o "$W/bersih.txt" "$BASE/_uji_bersih.php" 2>/dev/null || true

echo "### 1. Instalasi"
if [ "$SETUP_BARU" = "1" ]; then
  S=$(kode "$BASE/setup.php"); cek "buka setup" "$S" "200"
  T=$(csrf)
  S=$(kode "$BASE/setup.php" \
    --data-urlencode "csrf=$T" --data-urlencode "nama=Owner" \
    --data-urlencode "email=$ADMIN" --data-urlencode "password=AdminKuat123")
  cek "jalankan setup" "$S" "200"
  punya "tabel users dibuat" "tabel users"
  punya "materi ter-seed" "materi awal"
  punya "admin dibuat" "admin dibuat"
  printf '%s' "$ADMIN" > "$ADMINFILE"
else
  ok "setup sudah pernah jalan, admin dipakai ulang: $ADMIN"
fi

echo
echo "### 2. Login admin + generate kode"
S=$(kode "$BASE/login.php"); T=$(csrf)
S=$(kode "$BASE/login.php" --data-urlencode "csrf=$T" \
  --data-urlencode "email=$ADMIN" --data-urlencode "password=AdminKuat123" -L)
cek "login admin" "$S" "200"
punya "nav admin muncul" 'href="admin.php"'

S=$(kode "$BASE/admin.php"); cek "buka panel admin" "$S" "200"
punya "judul panel admin" "Panel Admin"

S=$(kode "$BASE/admin_kode.php"); cek "buka kelola kode" "$S" "200"
T=$(csrf)
S=$(kode "$BASE/admin_kode.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=buat" --data-urlencode "jumlah=3" --data-urlencode "batch=smoke")
cek "generate 3 kode" "$S" "200"
KODE=$(grep -oE 'HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}' "$O" | head -1)
if [ -n "$KODE" ]; then ok "kode terbaca: $KODE"; else bad "kode tidak terbaca"; fi

S=$(kode "$BASE/admin_kode_csv.php?status=belum")
cek "unduh CSV" "$S" "200"
punya "CSV berisi header" "kode,status,batch"

# Admin keluar supaya sesi member bersih.
kode "$BASE/logout.php" -L >/dev/null

echo
echo "### 3. Alur member"
S=$(kode "$BASE/dashboard.php" -L); cek "dashboard tanpa login diarahkan" "$S" "200"
punya "diarahkan ke login" "Masuk"

S=$(kode "$BASE/redeem.php"); T=$(csrf)
S=$(kode "$BASE/redeem.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=cek" --data-urlencode "kode=HRMS-XXXX-XXXX-XXXX")
cek "kode ngawur ditolak" "$S" "400"

T=$(csrf)
S=$(kode "$BASE/redeem.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=cek" --data-urlencode "kode=$KODE")
cek "kode valid diterima" "$S" "200"
punya "lanjut ke form akun" "Buat akunmu"

T=$(csrf)
S=$(kode "$BASE/redeem.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=daftar" --data-urlencode "kode=$KODE" \
  --data-urlencode "nama=Budi Smoke" --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS" --data-urlencode "password2=$PASS" -L)
cek "daftar + auto-login" "$S" "200"
punya "sapaan nama" "Halo, Budi Smoke"
punya "tombol Telegram" "Join Komunitas Telegram"
punya "daftar Bagian" "Materi kelas"
punya "progres" "dari 4 Bagian selesai"

echo
echo "### 4. Urutan dashboard sesuai PRD"
P_SAPA=$(grep -bo "Halo, Budi Smoke" "$O" | head -1 | cut -d: -f1)
P_TELE=$(grep -bo "Join Komunitas Telegram" "$O" | head -1 | cut -d: -f1)
P_MAT=$(grep -bo "Materi kelas" "$O" | head -1 | cut -d: -f1)
P_PROG=$(grep -bo "Progres belajar" "$O" | head -1 | cut -d: -f1)
if [ "$P_SAPA" -lt "$P_TELE" ] 2>/dev/null; then ok "sapaan sebelum Telegram"; else bad "urutan sapaan/Telegram"; fi
if [ "$P_TELE" -lt "$P_MAT" ] 2>/dev/null; then ok "Telegram sebelum daftar Bagian"; else bad "urutan Telegram/Bagian"; fi
if [ "$P_MAT" -lt "$P_PROG" ] 2>/dev/null; then ok "Bagian sebelum progres"; else bad "urutan Bagian/progres"; fi

echo
echo "### 5. Baca materi, tandai selesai, catatan"
S=$(kode "$BASE/materi.php?b=1"); cek "buka Bagian 1" "$S" "200"
punya "markdown ter-render" "<h2"
T=$(csrf)

S=$(kode "$BASE/materi.php?b=1" --data-urlencode "csrf=$T" \
  --data-urlencode "status=selesai" -L)
cek "tandai selesai" "$S" "200"

S=$(kode "$BASE/dashboard.php"); punya "progres naik jadi 1" "<strong>1</strong> dari 4 Bagian selesai"

S=$(kode "$BASE/materi.php?b=1"); T=$(csrf)
S=$(kode "$BASE/catatan_simpan.php" --data-urlencode "csrf=$T" \
  --data-urlencode "bagian=1" --data-urlencode "isi=catatan uji $TS")
cek "simpan catatan" "$S" "200"
punya "respons ok" "ok"

S=$(kode "$BASE/materi.php?b=1"); punya "catatan persist" "catatan uji $TS"

echo
echo "### 6. Cari, cetak, FAQ, batas akses"
S=$(kode "$BASE/cari.php?q=hermes"); cek "cari materi" "$S" "200"
S=$(kode "$BASE/cetak.php?b=1");    cek "versi cetak" "$S" "200"
S=$(kode "$BASE/faq.php");          cek "halaman FAQ" "$S" "200"
S=$(kode "$BASE/admin.php");        cek "member ditolak di admin" "$S" "403"
S=$(kode "$BASE/admin_kode.php");   cek "member ditolak di kelola kode" "$S" "403"

echo
echo "### 7. Kode tidak bisa dipakai dua kali"
kode "$BASE/logout.php" -L >/dev/null
S=$(kode "$BASE/redeem.php"); T=$(csrf)
S=$(kode "$BASE/redeem.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=cek" --data-urlencode "kode=$KODE")
cek "kode terpakai ditolak" "$S" "400"
punya "alasan sudah dipakai" "sudah dipakai"

echo
echo "### 8. Login ulang member"
S=$(kode "$BASE/login.php"); T=$(csrf)
S=$(kode "$BASE/login.php" --data-urlencode "csrf=$T" \
  --data-urlencode "email=$EMAIL" --data-urlencode "password=$PASS" -L)
cek "member login ulang" "$S" "200"
punya "progres tetap tersimpan" "<strong>1</strong> dari 4 Bagian selesai"

echo
echo "### 9. CSRF wajib"
# Sesi sedang login; POST dengan token ngawur ke endpoint yang butuh CSRF.
S=$(kode "$BASE/catatan_simpan.php" --data-urlencode "csrf=ngawur" \
  --data-urlencode "bagian=1" --data-urlencode "isi=harusnya gagal")
cek "POST tanpa CSRF valid ditolak" "$S" "403"

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
echo "$KODE" > "$W/kode.txt"
echo "$EMAIL" > "$W/email.txt"
echo "$ADMIN" > "$W/admin.txt"
[ "$GAGAL" -eq 0 ]
