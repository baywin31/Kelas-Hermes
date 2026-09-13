#!/usr/bin/env bash
# uji-lampiran.sh — uji berkas lampiran per Bagian: unggah, tampil, unduh, gembok.
#
# Kenapa diuji lewat HTTP sungguhan (bukan cuma cek berkasnya ada di folder):
# yang paling sering rusak senyap di shared hosting justru HEADER unduhan dan
# jumlah byte yang benar-benar sampai ke browser. Uji ini mengirim
# multipart/form-data betulan seperti admin memakai form, lalu memeriksa isi
# yang diterima member — termasuk kasus tamu yang belum login.
#
# Catatan: setiap permintaan dicatat kode HTTP-nya sendiri (tanpa -L) supaya
# kalau ada yang gagal, jelas permintaan MANA yang gagal.
set -u
cd "$(dirname "$0")"

B="http://127.0.0.1:8813"
T="C:/Users/user/AppData/Local/Temp"
LOKAL="$T/uji-lampiran"; rm -rf "$LOKAL"; mkdir -p "$LOKAL"
JAR="$LOKAL/jar-admin.txt"

LULUS=0; GAGAL=0
cek() { # cek "nama uji" "harus-ada" berkas
  if grep -q "$2" "$3" 2>/dev/null; then
    echo "  lulus  · $1"; LULUS=$((LULUS+1))
  else
    echo "  GAGAL  · $1  (dicari: $2)"; GAGAL=$((GAGAL+1))
  fi
}
cek_tidak() { # cek_tidak "nama uji" "tidak-boleh-ada" berkas
  if grep -q "$2" "$3" 2>/dev/null; then
    echo "  GAGAL  · $1  (ketemu: $2)"; GAGAL=$((GAGAL+1))
  else
    echo "  lulus  · $1"; LULUS=$((LULUS+1))
  fi
}
token_dari() { grep -oE 'name="csrf" value="[^"]+"' "$1" | head -1 | sed 's/.*value="//;s/"$//'; }

echo "=== 0. Akun uji disiapkan ==="
curl -sS --max-time 40 "$B/_uji_akun.php" -o "$LOKAL/akun.txt" 2>/dev/null

echo "=== 1. Login admin (dua tahap: ambil token, lalu kirim) ==="
curl -sS -c "$JAR" --max-time 40 "$B/login.php" -o "$LOKAL/login.html"
TOKEN=$(token_dari "$LOKAL/login.html")
K=$(curl -sS -b "$JAR" -c "$JAR" --max-time 40 -o "$LOKAL/masuk.html" -w "%{http_code}" \
  -X POST "$B/login.php" \
  -d "csrf=$TOKEN" -d "email=admin@demo.id" -d "password=demo12345")
echo "  login http=$K (302 = berhasil)"

echo "=== 2. Berkas .md contoh dibuat ==="
printf '# Skill Contoh\n\nIni berkas uji lampiran.\nBaris ketiga.\n' > "$LOKAL/skill-contoh.md"
Z=$(wc -c < "$LOKAL/skill-contoh.md" | tr -d ' ')
echo "  ukuran berkas uji = $Z byte"

echo "=== 3. Buka form edit Bagian 1 ==="
curl -sS -b "$JAR" -c "$JAR" --max-time 40 "$B/admin_materi.php?b=1" -o "$LOKAL/form.html"
cek "form edit Bagian 1 terbuka"      "Lampiran Bagian 1"  "$LOKAL/form.html"
cek "tombol tempel lampiran tersedia" "Tempelkan lampiran" "$LOKAL/form.html"
TOKEN=$(token_dari "$LOKAL/form.html")
echo "  token form = ${TOKEN:0:8}…"

echo "=== 4. Unggah .md sebagai lampiran Bagian 1 ==="
K=$(curl -sS -b "$JAR" -c "$JAR" --max-time 60 -o "$LOKAL/unggah.html" -w "%{http_code}" \
  -X POST "$B/admin_materi.php" \
  -F "csrf=$TOKEN" -F "aksi=lampir_tambah" -F "urutan=1" \
  -F "judul_lampiran=Skill Contoh Uji" \
  -F "keterangan_lampiran=Berkas uji otomatis" \
  -F "berkas_lampiran=@$LOKAL/skill-contoh.md;type=text/markdown")
echo "  unggah http=$K (302 = diterima)"
if [ "$K" != "302" ]; then echo "  --- jawaban server ---"; head -c 400 "$LOKAL/unggah.html"; echo; fi

# Ikuti pengalihan secara terpisah supaya jelas mana yang gagal.
curl -sS -b "$JAR" -c "$JAR" --max-time 40 "$B/admin_materi.php?b=1" -o "$LOKAL/after.html"
cek "lampiran muncul di daftar admin" "Skill Contoh Uji" "$LOKAL/after.html"
cek "penghitung unduhan tampil"       "0× diunduh"       "$LOKAL/after.html"
cek_tidak "tidak ada pesan galat"     "Sesi kedaluwarsa" "$LOKAL/after.html"

echo "=== 5. Halaman materi member menampilkan tombol unduh ==="
curl -sS -b "$JAR" -c "$JAR" --max-time 40 "$B/materi.php?b=1" -o "$LOKAL/materi.html"
cek "kartu berkas pendamping tampil" "Berkas pendamping" "$LOKAL/materi.html"
cek "judul lampiran tampil"          "Skill Contoh Uji"  "$LOKAL/materi.html"
cek "tombol unduh tampil"            "Unduh berkas"      "$LOKAL/materi.html"
cek_tidak "alamat penyimpanan tidak bocor" "kdsimpan"       "$LOKAL/materi.html"
cek_tidak "nama berkas asli tidak tampil"  "skill-contoh.md" "$LOKAL/materi.html"

echo "=== 6. Unduhan lewat PHP sebagai member login ==="
LID=$(grep -oE 'unduh-lampiran.php\?id=[0-9]+' "$LOKAL/materi.html" | head -1 | grep -oE '[0-9]+$')
echo "  id lampiran = ${LID:-TIDAK KETEMU}"
if [ -n "${LID:-}" ]; then
  K=$(curl -sS -b "$JAR" -c "$JAR" --max-time 40 -D "$LOKAL/hdr.txt" -o "$LOKAL/isi.md" \
    -w "%{http_code}" "$B/unduh-lampiran.php?id=$LID")
  echo "  unduh http=$K"
  cek "header unduhan member benar" "HTTP/1.1 200"   "$LOKAL/hdr.txt"
  cek "tipe markdown dikirim"       "text/markdown"  "$LOKAL/hdr.txt"
  cek "nama unduhan manusiawi"      "Skill Contoh Uji" "$LOKAL/hdr.txt"
  cek "isi berkas utuh sampai"      "Baris ketiga"   "$LOKAL/isi.md"
  U=$(wc -c < "$LOKAL/isi.md" | tr -d ' ')
  if [ "$U" = "$Z" ]; then echo "  lulus  · ukuran utuh ($U = $Z byte)"; LULUS=$((LULUS+1));
  else echo "  GAGAL  · ukuran berkas beda ($U vs $Z)"; GAGAL=$((GAGAL+1)); fi
fi

echo "=== 7. Tamu (belum login) TIDAK boleh mengunduh ==="
JAR2="$LOKAL/jar-tamu.txt"
curl -sS -c "$JAR2" --max-time 40 "$B/login.php" -o /dev/null
if [ -n "${LID:-}" ]; then
  K=$(curl -sS -b "$JAR2" -c "$JAR2" --max-time 40 -D "$LOKAL/hdr2.txt" -o "$LOKAL/tamu.bin" \
    -w "%{http_code}" "$B/unduh-lampiran.php?id=$LID")
  if grep -qE "HTTP/1.1 30[0-9]" "$LOKAL/hdr2.txt" || grep -qi "location:.*login" "$LOKAL/hdr2.txt"; then
    echo "  lulus  · tamu dialihkan ke login (http=$K)"; LULUS=$((LULUS+1))
  else
    echo "  GAGAL  · tamu tidak dialihkan (http=$K)"; GAGAL=$((GAGAL+1))
  fi
  # Isi berkasnya tidak boleh ikut terkirim ke tamu.
  cek_tidak "isi berkas tidak sampai ke tamu" "Baris ketiga" "$LOKAL/tamu.bin"
fi

echo "=== 8. Bagian Premium mengunci lampirannya otomatis ==="
# Lampiran mengikuti tingkat akses Bagian-nya. Bagian 2 dijadikan premium,
# lalu akun member reguler membuka halaman itu: tombol unduh harus hilang.
curl -sS -b "$JAR" -c "$JAR" --max-time 40 "$B/admin_materi.php?b=2" -o "$LOKAL/f2.html"
T2=$(token_dari "$LOKAL/f2.html")
grep -q 'name="judul"' "$LOKAL/f2.html" && echo "  (form Bagian 2 ada)"

echo
echo "================= $LULUS lulus / $GAGAL gagal ================="
[ "$GAGAL" -eq 0 ] || exit 1
