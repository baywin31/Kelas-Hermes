#!/usr/bin/env bash
# uji-edit-langsung.sh — uji mode "klik ubah langsung" lewat HTTP nyata.
#
# Yang dipastikan di sini, dan kenapa tiap butir penting:
#  - Member BIASA tidak boleh melihat tombol edit, tidak boleh memuat skripnya,
#    dan endpoint blok_simpan.php harus menolaknya. Ini gerbang wewenang: tanpa
#    itu, siapa pun yang punya akun bisa menulis ulang materi kelas.
#  - Blok yang TIDAK disentuh harus tetap sama byte-per-byte. Inilah alasan
#    mode ini dibuat per-blok; kalau ternyata blok lain ikut berubah, seluruh
#    keuntungannya hilang.
#  - Tabrakan penyimpanan harus DITOLAK, bukan ditimpa diam-diam.
#  - Semua aksi (ubah, tambah, hapus, naik, turun) benar-benar mengubah
#    database dan hasilnya bisa dibaca ulang dengan pembagian blok yang sama.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
JA="$T/el-admin.txt"     # cookie admin
JM="$T/el-member.txt"    # cookie member
lulus=0; gagal=0
ok(){ echo "OK   $1"; lulus=$((lulus+1)); }
bad(){ echo "BAD  $1"; gagal=$((gagal+1)); }

# Bagian uji sendiri: uji ini MENGUBAH dan MENGHAPUS blok. Bagian 1–4 adalah
# materi asli yang sudah ditulis rapi — pernah tertimpa uji lain dan harus
# dipulihkan lewat _uji_reseed.php. Nomor 91 di luar rentang kurikulum.
UJIB=91

# Rate limit login lokal 8 percobaan per email. Kalau terlampaui, pesannya
# "Email atau password salah" padahal kredensialnya benar — gejala yang sangat
# menyesatkan. Direset lebih dulu supaya kegagalan yang muncul benar-benar bug.
curl -sS --max-time 20 -o /dev/null "$B/_uji_ratereset.php" 2>/dev/null

echo "### 1. login admin + siapkan Bagian uji"
rm -f "$JA"
curl -sS --max-time 20 -c "$JA" -o "$T/el-l.html" "$B/login.php" >/dev/null 2>&1
TOK=$(grep -oE 'name="csrf" value="[^"]+' "$T/el-l.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$JA" -c "$JA" -o /dev/null \
  --data-urlencode "csrf=$TOK" --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1

cat > "$T/el-materi.md" <<'MD'
## Judul bagian pertama

Paragraf pertama yang tidak akan disentuh sama sekali.

Paragraf kedua yang nanti akan diubah.

:::tips Kartu yang tidak disentuh
Isi kartu tips.
:::

- [ ] tugas pertama
- [x] tugas kedua

| Kolom A | Kolom B |
| --- | --- |
| isi 1 | isi 2 |

```bash
hermes chat
```

Paragraf terakhir sebagai penanda ujung.
MD

curl -sS --max-time 20 -b "$JA" -o "$T/el-edit.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
TOKE=$(grep -oE 'name="csrf" value="[^"]+' "$T/el-edit.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 30 -b "$JA" -c "$JA" -o /dev/null \
  --data-urlencode "csrf=$TOKE" --data-urlencode "aksi=simpan" \
  --data-urlencode "urutan=$UJIB" --data-urlencode "judul=Bagian uji edit langsung" \
  --data-urlencode "ringkas=uji mode klik ubah" \
  --data-urlencode "isi_md@$T/el-materi.md" \
  "$B/admin_materi.php?b=$UJIB" >/dev/null 2>&1

curl -sS --max-time 20 -b "$JA" -o "$T/el-view.html" "$B/materi.php?b=$UJIB&edit=1" 2>/dev/null
grep -q "kd-edit-on" "$T/el-view.html" && ok "mode edit aktif untuk admin" \
  || bad "mode edit tidak aktif (login admin gagal / Bagian uji tidak tersimpan?)"
grep -q "edit-langsung.js" "$T/el-view.html" && ok "skrip edit-langsung.js dimuat" \
  || bad "skrip edit-langsung.js tidak dimuat"
grep -q "window.KD_EDIT=" "$T/el-view.html" && ok "data blok dikirim ke klien" \
  || bad "data blok tidak dikirim"

# Penanda data-blok wajib ada: tanpa ini tidak ada yang bisa diklik.
NB=$(grep -o 'data-blok="' "$T/el-view.html" | wc -l | tr -d ' ')
[ "$NB" -ge 8 ] && ok "ada $NB blok bisa diklik" || bad "penanda blok cuma $NB (harus >= 8)"

echo
echo "### 2. tampilan member TIDAK berubah"
curl -sS --max-time 20 -b "$JA" -o "$T/el-baca.html" "$B/materi.php?b=$UJIB" 2>/dev/null
grep -q "kd-edit-on" "$T/el-baca.html" \
  && bad "mode edit bocor ke tampilan baca biasa" \
  || ok "tanpa ?edit=1 halaman tetap mode baca"
grep -q "edit-langsung.js" "$T/el-baca.html" \
  && bad "skrip edit dimuat di mode baca" \
  || ok "mode baca tidak memuat skrip edit"
# Tombol masuk mode edit hanya untuk admin, tapi harus ADA untuk admin —
# kalau tidak, fiturnya tidak bisa ditemukan tanpa mengetik URL manual.
grep -q "edit=1" "$T/el-baca.html" && ok "admin melihat tombol masuk mode ubah" \
  || bad "tombol masuk mode ubah tidak ada untuk admin"

echo
echo "### 3. member biasa ditolak (gerbang wewenang)"
curl -sS --max-time 20 -o /dev/null "$B/_uji_ratereset.php" 2>/dev/null
rm -f "$JM"
curl -sS --max-time 20 -c "$JM" -o "$T/el-lm.html" "$B/login.php" >/dev/null 2>&1
TOKM=$(grep -oE 'name="csrf" value="[^"]+' "$T/el-lm.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$JM" -c "$JM" -o /dev/null \
  --data-urlencode "csrf=$TOKM" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1

curl -sS --max-time 20 -b "$JM" -o "$T/el-m.html" "$B/materi.php?b=$UJIB&edit=1" 2>/dev/null
grep -q "kd-edit-on" "$T/el-m.html" \
  && bad "MEMBER bisa masuk mode edit — materi kelas bisa ditulis ulang siapa saja" \
  || ok "member dengan ?edit=1 tetap mode baca"
grep -q "edit-langsung.js" "$T/el-m.html" \
  && bad "member memuat skrip edit" || ok "member tidak memuat skrip edit"
grep -q "edit=1" "$T/el-m.html" \
  && bad "member melihat tombol edit" || ok "member tidak melihat tombol edit"

# Endpoint diserang langsung dengan cookie member. Menyembunyikan tombol saja
# tidak cukup — yang menentukan keamanan adalah penolakan di server.
TOKMM=$(grep -oE 'name="csrf" value="[^"]+' "$T/el-m.html" | head -1 | sed 's/.*value="//')
KODE=$(curl -sS --max-time 20 -b "$JM" -o "$T/el-tolak.json" -w "%{http_code}" \
  --data-urlencode "csrf=$TOKMM" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=ubah" --data-urlencode "idx=1" \
  --data-urlencode "md=DIRUSAK MEMBER" "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "403" ] && ok "blok_simpan.php menolak member (HTTP 403)" \
  || bad "blok_simpan.php membalas HTTP $KODE untuk member (harus 403)"

KODE=$(curl -sS --max-time 20 -o /dev/null -w "%{http_code}" \
  --data-urlencode "bagian=$UJIB" --data-urlencode "aksi=ubah" \
  --data-urlencode "idx=1" --data-urlencode "md=x" "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "403" ] && ok "blok_simpan.php menolak tamu (HTTP 403)" \
  || bad "blok_simpan.php membalas HTTP $KODE untuk tamu (harus 403)"

# Tanpa token CSRF: csrf_check() memakai kode 419.
KODE=$(curl -sS --max-time 20 -b "$JA" -o /dev/null -w "%{http_code}" \
  --data-urlencode "bagian=$UJIB" --data-urlencode "aksi=ubah" \
  --data-urlencode "idx=1" --data-urlencode "md=x" "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" != "200" ] && ok "tanpa token CSRF ditolak (HTTP $KODE)" \
  || bad "tanpa token CSRF tetap tersimpan — celah CSRF"

echo
echo "### 4. ubah satu blok: blok lain WAJIB tetap sama"
# Token CSRF diambil dari data yang dikirim server ke klien, sama seperti yang
# dipakai browser sungguhan.
CS=$(grep -oE '"csrf":"[^"]+' "$T/el-view.html" | head -1 | sed 's/.*"csrf":"//')
[ -n "$CS" ] && ok "token CSRF terbaca dari halaman edit" || bad "token CSRF tidak ada di halaman edit"

# Urutan blok materi uji: 0=judul, 1=paragraf utuh, 2=paragraf yang diubah,
# 3=kartu tips, 4=checklist, 5=tabel, 6=kode, 7=paragraf penutup.
KODE=$(curl -sS --max-time 30 -b "$JA" -o "$T/el-r1.json" -w "%{http_code}" \
  --data-urlencode "csrf=$CS" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=ubah" --data-urlencode "idx=2" \
  --data-urlencode "md=Paragraf kedua SUDAH DIUBAH lewat klik." \
  --data-urlencode "md_lama=Paragraf kedua yang nanti akan diubah." \
  "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "200" ] && ok "ubah blok dibalas HTTP 200" || bad "ubah blok dibalas HTTP $KODE"
grep -q '"ok":true' "$T/el-r1.json" && ok "server melaporkan berhasil" \
  || { bad "server melaporkan gagal"; head -c 300 "$T/el-r1.json" | sed 's/^/     /'; }

# Dibaca ulang dari editor markdown biasa: inilah isi yang benar-benar
# tersimpan di database, bukan tampilan hasil render.
curl -sS --max-time 20 -b "$JA" -o "$T/el-e2.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
node ambil-textarea.js "$T/el-e2.html" "$T/el-md2.txt" >/dev/null 2>&1

grep -qF "Paragraf kedua SUDAH DIUBAH lewat klik." "$T/el-md2.txt" \
  && ok "perubahan tersimpan di database" || bad "perubahan TIDAK tersimpan"
grep -qF "Paragraf kedua yang nanti akan diubah." "$T/el-md2.txt" \
  && bad "isi lama masih ada — blok tidak tergantikan" || ok "isi lama sudah hilang"

echo
echo "### 5. tabrakan penyimpanan ditolak, bukan ditimpa"
# Klien mengirim isi blok yang dia LIHAT saat mulai mengedit. Kalau isi di
# database sudah berbeda (ada yang menyimpan lebih dulu), server harus menolak.
# Menimpa diam-diam berarti pekerjaan orang lain hilang tanpa jejak.
KODE=$(curl -sS --max-time 20 -b "$JA" -o "$T/el-bentrok.json" -w "%{http_code}" \
  --data-urlencode "csrf=$CS" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=ubah" --data-urlencode "idx=2" \
  --data-urlencode "md=percobaan menimpa" \
  --data-urlencode "md_lama=Paragraf kedua yang nanti akan diubah." \
  "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "409" ] && ok "tabrakan ditolak (HTTP 409)" \
  || bad "tabrakan dibalas HTTP $KODE (harus 409)"

curl -sS --max-time 20 -b "$JA" -o "$T/el-e3.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
node ambil-textarea.js "$T/el-e3.html" "$T/el-md3.txt" >/dev/null 2>&1
grep -qF "percobaan menimpa" "$T/el-md3.txt" \
  && bad "isi ikut tertimpa padahal ditolak" || ok "isi tidak berubah setelah penolakan"

# Blok kosong ditolak: kalau lolos, materi bisa punya lubang tanpa sengaja.
KODE=$(curl -sS --max-time 20 -b "$JA" -o /dev/null -w "%{http_code}" \
  --data-urlencode "csrf=$CS" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=ubah" --data-urlencode "idx=2" \
  --data-urlencode "md=   " "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "400" ] && ok "blok kosong ditolak (HTTP 400)" \
  || bad "blok kosong dibalas HTTP $KODE (harus 400)"

# Nomor blok di luar jangkauan: terjadi kalau halaman admin sudah kedaluwarsa.
KODE=$(curl -sS --max-time 20 -b "$JA" -o /dev/null -w "%{http_code}" \
  --data-urlencode "csrf=$CS" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=ubah" --data-urlencode "idx=999" \
  --data-urlencode "md=x" "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "409" ] && ok "nomor blok tidak ada ditolak (HTTP 409)" \
  || bad "nomor blok 999 dibalas HTTP $KODE (harus 409)"

echo
echo "### 6. blok yang tidak disentuh tetap utuh"
# Inti dari seluruh rancangan ini: blok yang tidak disentuh tetap sama.
for pola in \
  "Paragraf pertama yang tidak akan disentuh sama sekali." \
  ":::tips Kartu yang tidak disentuh" \
  "- [ ] tugas pertama" \
  "- [x] tugas kedua" \
  "| Kolom A | Kolom B |" \
  '```bash' \
  "hermes chat" \
  "Paragraf terakhir sebagai penanda ujung." \
; do
  # "--" wajib: pola yang dimulai dengan "-" (checklist) akan dibaca grep
  # sebagai opsi, dan ujinya gagal padahal appnya benar.
  grep -qF -- "$pola" "$T/el-md2.txt" && ok "blok lain utuh: $pola" \
    || bad "BLOK LAIN RUSAK setelah menyimpan: $pola"
done

echo
echo "### 7. pindah, tambah, dan hapus blok"
# Segarkan token: setiap balasan sukses mengubah isi, dan uji berikutnya harus
# bekerja dari keadaan terbaru — bukan dari anggapan lama.
curl -sS --max-time 20 -b "$JA" -o "$T/el-v2.html" "$B/materi.php?b=$UJIB&edit=1" 2>/dev/null
CS2=$(grep -oE '"csrf":"[^"]+' "$T/el-v2.html" | head -1 | sed 's/.*"csrf":"//')

# Tambah kartu setelah blok 0 (judul). Isinya contoh siap pakai.
curl -sS --max-time 30 -b "$JA" -o "$T/el-tambah.json" \
  --data-urlencode "csrf=$CS2" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=tambah" --data-urlencode "idx=0" \
  --data-urlencode "jenis=kartu" "$B/blok_simpan.php" >/dev/null 2>&1
grep -q '"ok":true' "$T/el-tambah.json" && ok "tambah blok kartu berhasil" || bad "tambah blok gagal"

curl -sS --max-time 20 -b "$JA" -o "$T/el-e4.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
node ambil-textarea.js "$T/el-e4.html" "$T/el-md4.txt" >/dev/null 2>&1
grep -qF ":::tips Judul kartu" "$T/el-md4.txt" && ok "kartu contoh masuk ke materi" \
  || bad "kartu contoh tidak masuk"
# Jumlah blok naik tepat satu — bukan dua, bukan nol.
N4=$(grep -oE '"jenis":"' "$T/el-tambah.json" | wc -l | tr -d ' ')
[ "$N4" = "9" ] && ok "jumlah blok jadi 9 (dari 8)" || bad "jumlah blok jadi $N4 (harus 9)"

# Pindah blok terakhir ke atas, lalu pastikan urutannya benar-benar berubah.
curl -sS --max-time 20 -b "$JA" -o "$T/el-v3.html" "$B/materi.php?b=$UJIB&edit=1" 2>/dev/null
CS3=$(grep -oE '"csrf":"[^"]+' "$T/el-v3.html" | head -1 | sed 's/.*"csrf":"//')
curl -sS --max-time 30 -b "$JA" -o "$T/el-naik.json" \
  --data-urlencode "csrf=$CS3" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=naik" --data-urlencode "idx=8" "$B/blok_simpan.php" >/dev/null 2>&1
grep -q '"ok":true' "$T/el-naik.json" && ok "pindah blok ke atas berhasil" || bad "pindah blok gagal"

curl -sS --max-time 20 -b "$JA" -o "$T/el-e5.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
node ambil-textarea.js "$T/el-e5.html" "$T/el-md5.txt" >/dev/null 2>&1
BARIS_AKHIR=$(grep -n "Paragraf terakhir sebagai penanda ujung." "$T/el-md5.txt" | head -1 | cut -d: -f1)
BARIS_KODE=$(grep -n '```bash' "$T/el-md5.txt" | head -1 | cut -d: -f1)
[ -n "$BARIS_AKHIR" ] && [ -n "$BARIS_KODE" ] && [ "$BARIS_AKHIR" -lt "$BARIS_KODE" ] \
  && ok "urutan benar-benar berubah (paragraf akhir kini di atas blok kode)" \
  || bad "urutan tidak berubah (akhir=$BARIS_AKHIR kode=$BARIS_KODE)"

# Blok paling atas tidak bisa dinaikkan lagi.
KODE=$(curl -sS --max-time 20 -b "$JA" -o /dev/null -w "%{http_code}" \
  --data-urlencode "csrf=$CS3" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=naik" --data-urlencode "idx=0" "$B/blok_simpan.php" 2>/dev/null)
[ "$KODE" = "400" ] && ok "blok teratas tidak bisa dinaikkan (HTTP 400)" \
  || bad "naik dari blok 0 dibalas HTTP $KODE (harus 400)"

# Hapus blok yang baru ditambahkan.
curl -sS --max-time 20 -b "$JA" -o "$T/el-v4.html" "$B/materi.php?b=$UJIB&edit=1" 2>/dev/null
CS4=$(grep -oE '"csrf":"[^"]+' "$T/el-v4.html" | head -1 | sed 's/.*"csrf":"//')
curl -sS --max-time 30 -b "$JA" -o "$T/el-hapus.json" \
  --data-urlencode "csrf=$CS4" --data-urlencode "bagian=$UJIB" \
  --data-urlencode "aksi=hapus" --data-urlencode "idx=1" "$B/blok_simpan.php" >/dev/null 2>&1
grep -q '"ok":true' "$T/el-hapus.json" && ok "hapus blok berhasil" || bad "hapus blok gagal"

curl -sS --max-time 20 -b "$JA" -o "$T/el-e6.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
node ambil-textarea.js "$T/el-e6.html" "$T/el-md6.txt" >/dev/null 2>&1
grep -qF ":::tips Judul kartu" "$T/el-md6.txt" \
  && bad "kartu masih ada setelah dihapus" || ok "kartu benar-benar terhapus"
grep -qF "Paragraf pertama yang tidak akan disentuh sama sekali." "$T/el-md6.txt" \
  && ok "blok lain tetap ada setelah hapus" || bad "hapus menghilangkan blok lain"

echo
echo "### 8. halaman member tetap merender hasilnya"
# Setelah materi diobrak-abrik lewat mode edit, halaman pembaca harus tetap
# waras: kartu jadi kartu, checklist jadi checklist, tanpa pagar ::: bocor.
curl -sS --max-time 20 -b "$JM" -o "$T/el-baca2.html" "$B/materi.php?b=$UJIB" 2>/dev/null
grep -q 'kd-callout' "$T/el-baca2.html" && ok "kartu dirender di halaman member" \
  || bad "kartu tidak dirender"
grep -q 'kd-ceklis\|kd-cek' "$T/el-baca2.html" && ok "checklist dirender" || bad "checklist tidak dirender"
grep -q '<table' "$T/el-baca2.html" && ok "tabel dirender" || bad "tabel tidak dirender"
SISA=$(grep -o ':::' "$T/el-baca2.html" | wc -l | tr -d ' ')
[ "$SISA" = "0" ] && ok "tidak ada pagar ::: bocor ke pembaca" || bad "ada $SISA pagar ::: bocor"
# data-blok TIDAK boleh ikut ke halaman member.
NB2=$(grep -o 'data-blok="' "$T/el-baca2.html" | wc -l | tr -d ' ')
[ "$NB2" = "0" ] && ok "penanda blok tidak bocor ke halaman member" \
  || bad "ada $NB2 penanda data-blok di halaman member"

echo
echo "### 9. bersihkan Bagian uji"
# Kalau tidak dihapus, Bagian 91 muncul di dashboard member sebagai materi
# nyata. Uji tidak boleh meninggalkan sampah yang terlihat pembeli.
TOKH=$(grep -oE 'name="csrf" value="[^"]+' "$T/el-e6.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$JA" -o /dev/null \
  --data-urlencode "csrf=$TOKH" --data-urlencode "aksi=hapus" \
  --data-urlencode "urutan=$UJIB" "$B/admin_materi.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$JA" -o "$T/el-list.html" "$B/admin_materi.php" 2>/dev/null
grep -q ">$UJIB<" "$T/el-list.html" && bad "Bagian uji $UJIB masih ada" \
  || ok "Bagian uji $UJIB sudah dihapus"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" = "0" ] || exit 1
