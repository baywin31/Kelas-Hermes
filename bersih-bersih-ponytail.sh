#!/usr/bin/env bash
# bersih-bersih-ponytail.sh — rapikan berkas alat yang sudah selesai dipakai.
#
# Kenapa: skrip sekali-pakai yang tertinggal di folder app bikin bingung nanti.
# Yang dipertahankan: skill ponytail (dipakai terus) dan alat ukur (dipakai
# ulang kalau halamannya diubah lagi).
set -u
cd "$(dirname "$0")"
HAPUS="cek-repo-skill.sh pasang-ponytail.sh"
for F in $HAPUS; do
  if [ -f "$F" ]; then rm -f "$F"; echo "   hapus  $F"; else echo "   lewat  $F (tidak ada)"; fi
done
echo
echo "dipertahankan:"
ls -1 dashboard-lazy.html banding-versi.js ukur-lazy.js 2>/dev/null | sed 's/^/   /'
