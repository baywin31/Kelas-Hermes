#!/usr/bin/env bash
# apa-yang-belum-live.sh — tentukan berkas mana yang HARUS dideploy, berdasarkan
# apa yang berubah di git sejak deploy terakhir, bukan berdasarkan ingatan.
cd "$(dirname "$0")"

echo "=== berkas produksi yang berubah di commit terakhir ==="
git show --name-only --format="" HEAD \
  | grep -vE '^(uji-|cek-|diag|audit-|petik-|debug-|ambil-|ukur-|jalan-uji|_uji_|banding-live|apa-bedanya|apa-yang-belum|samarkan|bersihkan|push-github|deploy|hapus)' \
  | grep -vE '\.(md|txt)$'

echo
echo "=== dependensi admin_materi.php (yang wajib ikut kalau dia dideploy) ==="
grep -oE "(require|include)(_once)? *\(?'[^']+'" admin_materi.php | grep -oE "'[^']+'" | tr -d "'" | sort -u

echo
echo "=== aset editor yang dirujuk admin_materi.php ==="
grep -oE 'tinymce/[a-z./]*|editor-materi\.js|md-editor\.js|blok_simpan\.php|_blok\.php' admin_materi.php | sort -u

echo
echo "=== apakah materi.php / _komponen.php merujuk berkas baru? ==="
grep -oE "(require|include)(_once)? *\(?'[^']+'" materi.php _komponen.php | grep -oE "'[^']+'" | tr -d "'" | sort -u
