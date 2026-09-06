#!/usr/bin/env bash
# audit-komponen.sh — bandingkan komponen yang SUDAH ada di app dengan daftar
# komponen dari riset, supaya keputusan "apa yang masih layak ditambah" tidak
# ditebak.
cd "$(dirname "$0")"

echo "=== jenis kartu warna yang sudah ada ==="
grep -oE "'(cerita|salah|tips|awas|insight|hasil|catat|waktu|aman|periksa|opsional)' *=>" _komponen.php \
  | grep -oE "'[a-z]+'" | tr -d "'" | sort -u | tr '\n' ' '
echo
echo
echo "=== fungsi komponen yang sudah ada ==="
grep -oE "^function komp_[a-z_]+" _komponen.php | sed 's/function //' | tr '\n' ' '
echo
echo
echo "=== sintaks markdown yang dikenali ==="
grep -oE '^\s*//\s*[A-Z@:!|].*' _markdown.php | head -12
echo
echo "=== komponen riset: sudah ada atau belum? ==="
for k in kutipan akordeon faq banding cta ringkas takeaway langkah; do
  n=$(grep -oih "$k" _komponen.php _markdown.php materi.php 2>/dev/null | wc -l)
  echo "  $k = $n kemunculan"
done
