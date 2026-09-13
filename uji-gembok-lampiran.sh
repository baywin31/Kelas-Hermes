#!/usr/bin/env bash
# uji-gembok-lampiran.sh — uji paling penting: lampiran di Bagian PREMIUM harus
# terkunci untuk member Reguler, baik tombolnya maupun berkasnya.
#
# Kenapa BERKASNYA yang diuji, bukan cuma tombolnya: menyembunyikan tombol
# hanya menyembunyikan tautan di layar. Kalau unduh-lampiran.php tidak
# memeriksa tingkat akses, member Reguler tetap bisa mengambil berkas VIP
# dengan menebak id lampirannya — dan mereka tidak akan melapor. Uji ini
# menebak id itu sungguhan; kalau gerbangnya bolong, langsung ketahuan.
#
# Skrip ini menyiapkan sendiri data ujinya (Bagian 4 dijadikan premium +
# satu lampiran contoh) dan MEMBERSIHKANNYA di akhir, juga kalau gagal atau
# dihentikan — supaya materi asli tidak pernah tertinggal dalam keadaan
# terkunci gara-gara uji.
set -u
cd "$(dirname "$0")"

B="http://127.0.0.1:8813"
T="C:/Users/user/AppData/Local/Temp"
D="$T/uji-gembok"; rm -rf "$D"; mkdir -p "$D"
MYSQL="C:/Users/user/tools/mariadb_pkg/mariadb-10.6.19-winx64/bin/mysql.exe"
DB="jurag139_juraganprompt"
LAMP="$HOME/kdsimpan/lampiran"

sql() { "$MYSQL" --host=127.0.0.1 --port=3399 -u root -D "$DB" -e "$1" 2>/dev/null; }
BERSIH=0
rapikan() {
  [ "$BERSIH" = "1" ] && return; BERSIH=1
  # Balikkan tingkat akses Bagian 4 dan buang lampiran + berkas uji.
  sql "UPDATE kd_content SET akses='reguler' WHERE urutan=4;
       DELETE FROM kd_lampiran WHERE judul='Berkas VIP Uji';
       UPDATE kd_users SET tier='reguler' WHERE email='budi@demo.id';"
  rm -f "$LAMP/vip-uji-"*.md
}
trap rapikan EXIT INT TERM

LULUS=0; GAGAL=0
cek() { if grep -q "$2" "$3" 2>/dev/null; then echo "  lulus  · $1"; LULUS=$((LULUS+1));
        else echo "  GAGAL  · $1  (dicari: $2)"; GAGAL=$((GAGAL+1)); fi; }
cek_tidak() { if grep -q "$2" "$3" 2>/dev/null; then echo "  GAGAL  · $1  (ketemu: $2)"; GAGAL=$((GAGAL+1));
              else echo "  lulus  · $1"; LULUS=$((LULUS+1)); fi; }
token_dari() { grep -oE 'name="csrf" value="[^"]+"' "$1" | head -1 | sed 's/.*value="//;s/"$//'; }
masuk() {
  curl -sS -c "$1" --max-time 40 "$B/login.php" -o "$D/l.html"
  curl -sS -b "$1" -c "$1" --max-time 40 -o /dev/null -X POST "$B/login.php" \
    -d "csrf=$(token_dari "$D/l.html")" -d "email=$2" -d "password=demo12345"
}

echo "=== 0. Siapkan data uji (Bagian 4 premium + 1 lampiran) ==="
curl -sS --max-time 40 "$B/_uji_akun.php" -o /dev/null 2>/dev/null
mkdir -p "$LAMP"
printf '# Berkas VIP\n\nIsi rahasia.\n' > "$LAMP/vip-uji-abc123.md"
sql "UPDATE kd_content SET akses='premium' WHERE urutan=4;
     DELETE FROM kd_lampiran WHERE judul='Berkas VIP Uji';
     INSERT INTO kd_lampiran (bagian,judul,keterangan,berkas,ukuran,urutan,unduhan,aktif,created_at,updated_at)
     VALUES (4,'Berkas VIP Uji','Uji gembok','vip-uji-abc123.md',27,1,0,1,NOW(),NOW());
     UPDATE kd_users SET tier='reguler' WHERE email='budi@demo.id';"
LID=$(sql "SELECT id FROM kd_lampiran WHERE judul='Berkas VIP Uji' LIMIT 1;" | tail -1 | tr -d '\r')
echo "  Bagian 4 = premium · lampiran id = ${LID:-TIDAK KETEMU}"

echo "=== 1. Member REGULER membuka Bagian 4 ==="
masuk "$D/jar-reg.txt" "budi@demo.id"
curl -sS -b "$D/jar-reg.txt" -c "$D/jar-reg.txt" --max-time 40 "$B/materi.php?b=4" -o "$D/materi-reg.html"
cek "halaman digerbangi gembok VIP"                "eksklusif untuk member tingkat" "$D/materi-reg.html"
cek_tidak "tombol unduh lampiran VIP tidak muncul" "Unduh berkas"                  "$D/materi-reg.html"
cek_tidak "nama berkas VIP tidak tampil"           "Berkas VIP Uji"                "$D/materi-reg.html"

echo "=== 2. Member REGULER menebak id lampiran VIP ==="
if [ -n "${LID:-}" ]; then
  K=$(curl -sS -b "$D/jar-reg.txt" -c "$D/jar-reg.txt" --max-time 40 \
    -D "$D/hdr-reg.txt" -o "$D/isi-reg.bin" -w "%{http_code}" "$B/unduh-lampiran.php?id=$LID")
  echo "  unduh http=$K (403 = ditolak)"
  if [ "$K" = "403" ]; then echo "  lulus  · permintaan ditolak dengan 403"; LULUS=$((LULUS+1));
  else echo "  GAGAL  · seharusnya 403, dapat $K"; GAGAL=$((GAGAL+1)); fi
  cek_tidak "isi berkas VIP tidak sampai ke Reguler" "Isi rahasia" "$D/isi-reg.bin"
fi

echo "=== 3. Member VIP boleh mengunduh berkas yang sama ==="
sql "UPDATE kd_users SET tier='premium' WHERE email='budi@demo.id';"
masuk "$D/jar-vip.txt" "budi@demo.id"
curl -sS -b "$D/jar-vip.txt" -c "$D/jar-vip.txt" --max-time 40 "$B/materi.php?b=4" -o "$D/materi-vip.html"
cek "halaman materi VIP terbuka"    "Berkas VIP Uji" "$D/materi-vip.html"
cek "tombol unduh muncul untuk VIP" "Unduh berkas"   "$D/materi-vip.html"
if [ -n "${LID:-}" ]; then
  K=$(curl -sS -b "$D/jar-vip.txt" -c "$D/jar-vip.txt" --max-time 40 \
    -D "$D/hdr-vip.txt" -o "$D/isi-vip.bin" -w "%{http_code}" "$B/unduh-lampiran.php?id=$LID")
  echo "  unduh http=$K (200 = boleh)"
  cek "VIP dapat berkasnya"      "Isi rahasia"   "$D/isi-vip.bin"
  cek "header unduhan VIP benar" "HTTP/1.1 200"  "$D/hdr-vip.txt"
fi

echo "=== 4. Bersihkan (otomatis lewat trap juga) ==="
rapikan
sql "SELECT urutan,akses FROM kd_content ORDER BY urutan;" | tail -4

echo
echo "================= $LULUS lulus / $GAGAL gagal ================="
[ "$GAGAL" -eq 0 ] || exit 1
