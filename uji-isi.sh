#!/usr/bin/env bash
# uji-isi.sh — uji ISI MATERI baru (4 Bagian) lewat HTTP nyata, sebagai member.
#
# Bedanya dengan uji-kartu.sh: yang itu menguji mesin komponennya pakai materi
# contoh buatan tes. Yang ini menguji materi SUNGGUHAN yang akan dibaca pembeli:
# tiap Bagian harus punya cerita pembuka, kartu callout, checklist, dan tidak
# boleh ada satu pun pagar ::: yang lolos jadi teks.
set -uo pipefail

B="http://127.0.0.1:8813"
T="$LOCALAPPDATA/Temp/kd-uji-isi"
rm -rf "$T"; mkdir -p "$T"
L=0; G=0
ok()  { L=$((L+1)); echo "OK   $1"; }
bad() { G=$((G+1)); echo "GAGAL $1"; }

# Materi seed dipulihkan dulu supaya tes ini menguji isi yang benar,
# bukan sisa materi contoh dari uji-kartu.sh.
curl -sS --max-time 25 -o "$T/reseed.txt" "$B/_uji_reseed.php" 2>/dev/null
grep -q "selesai" "$T/reseed.txt" && ok "materi seed dipulihkan" || bad "gagal memulihkan seed"

curl -sS --max-time 20 -o "$T/rate.txt" "$B/_uji_ratereset.php" 2>/dev/null
curl -sS --max-time 20 -o "$T/akun.txt" "$B/_uji_akun.php" 2>/dev/null

# Login member. Token CSRF diambil TANPA cookie dulu, lalu dipakai bersama
# cookie jar yang sama — pola yang sudah terbukti di uji-wa.sh.
CJ="$T/cookie.txt"
curl -sS --max-time 20 -c "$CJ" -o "$T/login.html" "$B/login.php"
CSRF=$(grep -o 'name="csrf" value="[^"]*"' "$T/login.html" | head -1 | sed 's/.*value="//;s/"//')
curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$T/post.html" \
  -d "csrf=$CSRF" -d "email=budi@demo.id" -d "password=demo12345" "$B/login.php"
curl -sS --max-time 20 -b "$CJ" -c "$CJ" -o "$T/dash.html" "$B/dashboard.php"
grep -qi "Halo," "$T/dash.html" && ok "login member berhasil" || bad "login member gagal"

for N in 1 2 3 4; do
  F="$T/b$N.html"
  curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$F" "$B/materi.php?b=$N"
  echo
  echo "### Bagian $N"

  grep -q "kd-sec" "$F" && ok "B$N: kartu section terbentuk" || bad "B$N: tidak ada kartu section"
  grep -q "kd-callout" "$F" && ok "B$N: ada kartu callout" || bad "B$N: tidak ada callout"

  # Pagar ::: tidak boleh pernah terlihat pembaca. Dicari di dalam isi materi,
  # bukan di seluruh halaman (form editor tidak ada di halaman member).
  if grep -qE '(^|>)[[:space:]]*:::' "$F"; then bad "B$N: pagar ::: bocor jadi teks"; else ok "B$N: tidak ada pagar ::: yang bocor"; fi
  grep -q "BLOCK0" "$F" && bad "B$N: kebocoran BLOCK0" || ok "B$N: tidak ada kebocoran BLOCK0"

  grep -q "kd-cek" "$F" && ok "B$N: checklist jadi kotak centang" || bad "B$N: checklist tidak terbentuk"
  grep -qE 'menit baca|menit' "$F" && ok "B$N: perkiraan waktu baca tampil" || bad "B$N: waktu baca tidak tampil"

  # Kartu "hasil" = janji hasil akhir. Ini yang bikin pembaca merasa Bagian ini
  # punya ujung yang jelas, dan yang paling layak masuk tangkapan layar.
  # Dicek lewat warna khas jenis 'hasil' (emerald), bukan lewat kata-kata
  # judulnya — judul callout boleh diganti admin, jenisnya tidak.
  grep -q "text-emerald-300" "$F" && ok "B$N: ada kartu janji hasil" || bad "B$N: tidak ada kartu hasil"
done

echo
echo "### Isi khusus tiap Bagian"
grep -q "youtube-nocookie" "$T/b1.html" && ok "B1: video tersemat" || bad "B1: video hilang"
grep -q "kd-tabel" "$T/b1.html" && ok "B1: tabel perbandingan jadi tabel" || bad "B1: tabel B1 tidak terbentuk"
grep -q "kd-tabel" "$T/b2.html" && ok "B2: tabel perintah lemah/kuat ada" || bad "B2: tabel B2 tidak terbentuk"
grep -q "kd-tabel" "$T/b3.html" && ok "B3: tabel Memory/Skill/Cron ada" || bad "B3: tabel B3 tidak terbentuk"
grep -q "kd-salin" "$T/b3.html" && ok "B3: blok kode punya tombol Salin" || bad "B3: tombol Salin hilang"
grep -q "kd-tabel" "$T/b4.html" && ok "B4: tabel pilihan hosting ada" || bad "B4: tabel B4 tidak terbentuk"
grep -q "kd-sub" "$T/b2.html" && ok "B2: sub-kartu (###) terbentuk" || bad "B2: sub-kartu B2 tidak ada"

echo
echo "### Alat baca (Vanilla JS, tanpa library)"
grep -q "kd-baca-maju" "$T/b1.html" && ok "bilah kemajuan baca dirender" || bad "bilah kemajuan tidak ada"
grep -q "data-baca-maju" "$T/b1.html" && ok "bilah kemajuan punya pengait JS" || bad "pengait bilah kemajuan hilang"
grep -q "kd-toc-tautan" "$T/b1.html" && ok "daftar isi memakai gaya kartu" || bad "daftar isi masih gaya lama"
grep -q "data-toc" "$T/b1.html" && ok "daftar isi punya pengait penanda posisi" || bad "pengait daftar isi hilang"

echo
echo "### Kartu penenang (aman / periksa / opsional)"
# Tiga kartu ini yang menjawab rasa takut pembaca gaptek. Kalau salah satu
# hilang dari materi, halaman tetap tampak bagus tapi kehilangan fungsi yang
# paling menentukan: menurunkan rasa takut merusak laptop.
grep -q "Sebelum menekan Enter" "$T/b1.html" && ok "B1 punya kartu batas kerusakan (aman)" || bad "B1 tanpa kartu aman"
grep -q "text-teal-300" "$T/b1.html" && ok "B1 kartu aman berwarna khas" || bad "B1 warna kartu aman hilang"
grep -q "Ctrl" "$T/b1.html" && ok "B1 menyebut tombol berhenti (Ctrl+C)" || bad "B1 tidak menyebut cara menghentikan"
grep -q "text-lime-300" "$T/b1.html" && ok "B1 punya titik periksa (periksa)" || bad "B1 tanpa titik periksa"
grep -q "text-lime-300" "$T/b2.html" && ok "B2 punya titik periksa" || bad "B2 tanpa titik periksa"
grep -q "text-teal-300" "$T/b2.html" && ok "B2 punya kartu aman (pakai salinan)" || bad "B2 tanpa kartu aman"
grep -q "text-lime-300" "$T/b3.html" && ok "B3 punya titik periksa" || bad "B3 tanpa titik periksa"
# Kartu opsional dikenali dari ikon kompasnya, bukan dari judulnya: judul
# kartu boleh diganti admin, ikonnya tidak.
grep -q "m15.5 8.5-2 5.5-5.5 2 2-5.5 5.5-2Z" "$T/b3.html" && ok "B3 punya kartu opsional" || bad "B3 tanpa kartu opsional"
grep -q "text-lime-300" "$T/b4.html" && ok "B4 punya titik periksa penutup" || bad "B4 tanpa titik periksa"
# Tabel error dengan tulisan persis: pembaca gaptek mencocokkan string.
grep -q "Unknown provider" "$T/b1.html" && ok "B1 tabel error memuat pesan persis" || bad "B1 tabel error tanpa pesan persis"
grep -q "10 menit" "$T/b1.html" && ok "B1 punya jalan keluar ke admin (batas 10 menit)" || bad "B1 tanpa jalan keluar ke admin"

echo
echo "### Rel kurikulum (bukti 'ini area berbayar' untuk tangkapan layar)"
# Rel ini yang membuat satu potongan layar ikut membuktikan kelasnya berisi
# banyak Bagian — elemen paling menentukan di screenshot sneak peek.
grep -q "Semua Bagian" "$T/b1.html" && ok "panel 'Semua Bagian' dirender" || bad "panel rel tidak ada"
N_REL=$(grep -c "kd-rel-item" "$T/b1.html")
[ "$N_REL" -ge 4 ] && ok "rel memuat $N_REL Bagian" || bad "rel cuma $N_REL baris (harus >= 4)"
grep -q "kd-rel-kini" "$T/b1.html" && ok "Bagian yang sedang dibuka ditandai" || bad "penanda Bagian aktif hilang"
# Nomor Bagian harus muncul dua digit (01, 02) supaya kolom judul rata.
grep -qE '>0[0-9]<' "$T/b1.html" && ok "nomor Bagian dua digit" || bad "nomor Bagian tidak dipadkan"
# Hitungan selesai/total: angka jujur dari database, bukan hiasan.
grep -qE '>[0-9]+/[0-9]+<' "$T/b1.html" && ok "hitungan selesai/total tampil" || bad "hitungan progres hilang"

echo
echo "### Pencarian tidak bocor markup"
curl -sS --max-time 25 -b "$CJ" -c "$CJ" -o "$T/cari.html" "$B/cari.php?q=memory"
if grep -qE ':::|@video|!\[' "$T/cari.html"; then bad "kutipan pencarian membawa markup"; else ok "kutipan pencarian bersih"; fi

echo
echo "-----"
echo "LULUS=$L GAGAL=$G"
[ "$G" = "0" ] || exit 1
