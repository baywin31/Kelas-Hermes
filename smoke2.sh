#!/usr/bin/env bash
# smoke2.sh — uji lanjutan: race condition 1 kode = 1 akun, dan
# update materi dari panel admin tanpa deploy.
set -u
BASE="${1:-http://localhost:8813}"
W="C:/Users/user/AppData/Local/Temp/kdphp2"
rm -rf "$W"; mkdir -p "$W"
LULUS=0; GAGAL=0
TS="$(date +%s)"
ADMIN="$(cat 'C:/Users/user/AppData/Local/Temp/kdphp_admin.txt')"

ok()  { LULUS=$((LULUS+1)); echo "OK   $1"; }
bad() { GAGAL=$((GAGAL+1)); echo "GAGAL $1"; }
cek() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1: dapat $2, harusnya $3"; fi }
tok() { grep -oE 'name="csrf" value="[a-f0-9]+"' "$1" | head -1 | grep -oE '[a-f0-9]{32}'; }

curl -sS --max-time 20 -o "$W/bersih.txt" "$BASE/_uji_bersih.php"

# ---------- Sesi admin ----------
JA="$W/ja.txt"
a() { curl -sS --max-time 45 -b "$JA" -c "$JA" "$@"; }
a -o "$W/l.html" "$BASE/login.php" >/dev/null
T=$(tok "$W/l.html")
a -o "$W/ad.html" "$BASE/login.php" --data-urlencode "csrf=$T" \
  --data-urlencode "email=$ADMIN" --data-urlencode "password=AdminKuat123" -L >/dev/null

a -o "$W/k.html" "$BASE/admin_kode.php" >/dev/null
T=$(tok "$W/k.html")
a -o "$W/k2.html" "$BASE/admin_kode.php" --data-urlencode "csrf=$T" \
  --data-urlencode "aksi=buat" --data-urlencode "jumlah=1" --data-urlencode "batch=race$TS" >/dev/null
K=$(grep -oE 'HRMS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}' "$W/k2.html" | head -1)
if [ -n "$K" ]; then ok "kode untuk uji race: $K"; else bad "kode race gagal dibuat"; exit 1; fi

echo
echo "### Race condition: 4 pendaftaran paralel dengan kode yang sama"
# Tiap proses punya cookie jar sendiri, ambil token sendiri, lalu POST serentak.
for i in 1 2 3 4; do
  (
    JR="$W/jr$i.txt"
    curl -sS --max-time 45 -c "$JR" -b "$JR" -o "$W/r$i.html" "$BASE/redeem.php" >/dev/null
    TT=$(grep -oE 'name="csrf" value="[a-f0-9]+"' "$W/r$i.html" | head -1 | grep -oE '[a-f0-9]{32}')
    curl -sS --max-time 45 -c "$JR" -b "$JR" -o "$W/d$i.html" -w '%{http_code}' \
      "$BASE/redeem.php" \
      --data-urlencode "csrf=$TT" --data-urlencode "aksi=daftar" --data-urlencode "kode=$K" \
      --data-urlencode "nama=Race $i" --data-urlencode "email=race$TS-$i@contoh.id" \
      --data-urlencode "password=PasswordKuat1" --data-urlencode "password2=PasswordKuat1" \
      > "$W/s$i.txt"
  ) &
done
wait

SUKSES=0
for i in 1 2 3 4; do
  S=$(cat "$W/s$i.txt" 2>/dev/null || echo 0)
  # 303/302 = redirect ke dashboard (berhasil), 400 = ditolak
  if [ "$S" = "302" ] || [ "$S" = "303" ]; then SUKSES=$((SUKSES+1)); fi
  echo "   proses $i -> HTTP $S"
done
cek "tepat 1 pendaftaran berhasil" "$SUKSES" "1"

# Pastikan DB hanya punya 1 user dari batch ini.
a -o "$W/csv.csv" "$BASE/admin_kode_csv.php?q=race$TS" >/dev/null
BARIS=$(grep -c "race$TS" "$W/csv.csv" || true)
cek "kode tercatat sekali di CSV" "$BARIS" "1"
if grep -q "dipakai" "$W/csv.csv"; then ok "status kode jadi dipakai"; else bad "status kode belum dipakai"; fi

echo
echo "### Update materi dari panel admin (tanpa deploy)"
a -o "$W/m.html" "$BASE/admin_materi.php?b=3" >/dev/null
T=$(tok "$W/m.html")
PENANDA="penanda-live-$TS"
a -o "$W/m2.html" -w '%{http_code}' "$BASE/admin_materi.php" \
  --data-urlencode "csrf=$T" --data-urlencode "aksi=simpan" \
  --data-urlencode "urutan=3" \
  --data-urlencode "judul=Bagian Tiga Diperbarui" \
  --data-urlencode "ringkas=Ringkasan baru" \
  --data-urlencode "isi_md=## Judul Baru

Isi materi $PENANDA dengan **tebal** dan [tautan](https://contoh.id)." > "$W/st.txt"
cek "simpan materi" "$(cat "$W/st.txt")" "302"

a -o "$W/m3.html" "$BASE/admin_materi.php?b=3" >/dev/null
if grep -q "$PENANDA" "$W/m3.html"; then ok "materi tersimpan di editor"; else bad "materi tidak tersimpan"; fi

# Pratinjau markdown
T=$(tok "$W/m3.html")
a -o "$W/pv.html" -w '%{http_code}' "$BASE/admin_materi.php" \
  --data-urlencode "csrf=$T" --data-urlencode "aksi=pratinjau" \
  --data-urlencode "urutan=3" \
  --data-urlencode "isi_md=## Cek pratinjau

teks **tebal**" > "$W/pvs.txt"
cek "pratinjau markdown" "$(cat "$W/pvs.txt")" "200"
if grep -q "<strong>tebal</strong>" "$W/pv.html"; then ok "pratinjau merender markdown"; else bad "pratinjau tidak merender"; fi

echo
echo "### Member melihat materi baru"
JM="$W/jm.txt"
m() { curl -sS --max-time 45 -b "$JM" -c "$JM" "$@"; }
EM="$(cat 'C:/Users/user/AppData/Local/Temp/kdphp/email.txt')"
m -o "$W/ml.html" "$BASE/login.php" >/dev/null
T=$(tok "$W/ml.html")
m -o "$W/md.html" "$BASE/login.php" --data-urlencode "csrf=$T" \
  --data-urlencode "email=$EM" --data-urlencode "password=PasswordKuat1" -L >/dev/null
m -o "$W/mm.html" "$BASE/materi.php?b=3" >/dev/null
if grep -q "$PENANDA" "$W/mm.html"; then ok "member langsung lihat materi baru"; else bad "member masih lihat materi lama"; fi
if grep -q "Bagian Tiga Diperbarui" "$W/mm.html"; then ok "judul baru muncul"; else bad "judul lama masih muncul"; fi

echo
echo "### Sanitasi HTML di materi"
a -o "$W/x.html" "$BASE/admin_materi.php?b=4" >/dev/null
T=$(tok "$W/x.html")
a -o "$W/xsave.html" "$BASE/admin_materi.php" \
  --data-urlencode "csrf=$T" --data-urlencode "aksi=simpan" \
  --data-urlencode "urutan=4" \
  --data-urlencode "judul=Bagian Empat" --data-urlencode "ringkas=uji xss" \
  --data-urlencode 'isi_md=Halo <script>alert(1)</script> dan <img src=x onerror=alert(2)> serta [klik](javascript:alert(3))' >/dev/null
m -o "$W/mx.html" "$BASE/materi.php?b=4" >/dev/null
if grep -q "<script>alert" "$W/mx.html"; then bad "script bocor ke halaman"; else ok "tag script dibersihkan"; fi
# onerror boleh muncul sebagai TEKS ter-escape (&lt;img ... onerror=...&gt;).
# Yang berbahaya cuma tag <img> hidup di dalam badan materi.
if grep -q '<img[^>]*onerror' "$W/mx.html"; then bad "tag img hidup dengan onerror bocor"; else ok "tag img berbahaya dibersihkan"; fi
if grep -q '&lt;img src=x onerror' "$W/mx.html"; then ok "HTML mentah tampil sebagai teks"; else bad "HTML mentah tidak ter-escape sebagai teks"; fi
if grep -q 'href="javascript:' "$W/mx.html"; then bad "tautan javascript: bocor"; else ok "tautan javascript: dibersihkan"; fi

echo
echo "-----"
echo "LULUS=$LULUS GAGAL=$GAGAL"
[ "$GAGAL" -eq 0 ]
