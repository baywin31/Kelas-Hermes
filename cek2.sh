#!/usr/bin/env bash
# cek2.sh — uji menentukan: apakah penghapusan/pengunggahan di /public_html
# benar-benar terlihat di web, dan apakah folder akademi online = akademi FTP.
set -u
T="${LOCALAPPDATA}/Temp/kdcek"; mkdir -p "$T"
U="$(tr -d '\r\n' < .ftp)"
H="ftp://juraganprompt.biz.id"
B="https://juraganprompt.biz.id"
F() { curl -sS -k --ssl-reqd --ftp-pasv -u "$U" "$@"; }
W() { curl -sS -k --max-time 25 "$@"; }
R="$(date +%s)$RANDOM"

echo "=== A. isi /public_html sekarang (via FTP) ==="
F "$H/public_html/" -o "$T/ls.txt" -w 'kode=%{http_code}\n'
awk '{print "  " $1 "  " $NF}' "$T/ls.txt"

echo
echo "=== B. berkas yang SUDAH DIHAPUS, masih ada di web? ==="
for p in /index.html /kelas/index.html /kt.html /probe.html; do
  printf '  %-22s %s\n' "$p" "$(W -o "$T/x.html" -w '%{http_code} (%{size_download}B)' "$B$p?v=$R")"
done

echo
echo "=== C. berkas yang DIPERTAHANKAN, ada di web? ==="
for p in /karyawan/ /karyawan/index.html /akademi/ /akademi/login.php; do
  printf '  %-22s %s\n' "$p" "$(W -o "$T/x.html" -w '%{http_code} (%{size_download}B)' "$B$p?v=$R")"
done

echo
echo "=== D. berkas akademi yang HANYA ada di FTP, muncul di web? ==="
for p in isihermes.php kategori.php tutorial.php seed_hermes.php theme.php; do
  printf '  akademi/%-16s %s\n' "$p" "$(W -o "$T/x.html" -w '%{http_code} (%{size_download}B)' "$B/akademi/$p?v=$R")"
done

echo
echo "=== E. apakah theme.php FTP menghasilkan judul yang online itu? ==="
F "$H/public_html/akademi/theme.php" -o "$T/theme.php" -w 'ambil=%{http_code}\n'
grep -c 'AKADEMI KARYAWAN DIGITAL' "$T/theme.php" 2>/dev/null | sed 's/^/  cocok_judul_di_theme.php=/'

echo
echo "=== F. unggah penanda baru, lalu baca lewat web ==="
printf 'CEK-%s\n' "$R" > "$T/cek-$R.txt"
F -T "$T/cek-$R.txt" "$H/public_html/cek-$R.txt" -o "$T/up.txt" -w 'unggah=%{http_code}\n'
F "$H/public_html/cek-$R.txt" -o "$T/back.txt" -w 'baca_via_ftp=%{http_code} '
cat "$T/back.txt"
sleep 3
printf '  via web: %s\n' "$(W -o "$T/w.txt" -w '%{http_code} (%{size_download}B)' "$B/cek-$R.txt")"
head -1 "$T/w.txt" | sed 's/^/  isi: /'
F -Q "-DELE /public_html/cek-$R.txt" "$H/public_html/" -o "$T/del.txt" -w 'hapus=%{http_code}\n'
