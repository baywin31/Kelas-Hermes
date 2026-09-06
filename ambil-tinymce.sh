#!/usr/bin/env bash
# ambil-tinymce.sh — unduh TinyMCE dan salin HANYA berkas yang dipakai ke tinymce/.
#
# Kenapa versi 6.8.6 dan bukan yang terbaru:
#   v6.8.6 = MIT. v7 = GPL-2.0-or-later, v8 = lisensi berbayar. App ini DIJUAL
#   dan disebar ke pembeli, jadi MIT satu-satunya yang tidak menular ke produk.
#   Self-hosted v6 juga tidak minta API key dan tidak memunculkan peringatan
#   "domain not registered" seperti versi cloud.
#
# Kenapa disalin per-berkas, bukan seluruh paket:
#   paket lengkap ~40 MB / ribuan berkas (semua bahasa, semua skin, semua
#   plugin premium stub). Pembeli mengunggah lewat File Manager cPanel — itu
#   mustahil. Yang dipakai saja: ~2 MB.
set -uo pipefail
cd "$(dirname "$0")"

VER=6.8.6
KERJA="$LOCALAPPDATA/Temp/kd-tinymce"
mkdir -p "$KERJA"
cd "$KERJA"

if [ ! -d "package" ]; then
  echo "== unduh tinymce@$VER dari npm"
  npm pack "tinymce@$VER" >/dev/null 2>&1 || { echo "npm pack gagal"; exit 1; }
  tar -xzf "tinymce-$VER.tgz" || { echo "ekstrak gagal"; exit 1; }
fi

[ -f package/tinymce.min.js ] || { echo "isi paket tidak seperti yang diharapkan"; exit 1; }
echo "== paket unduhan: $(du -sh package | cut -f1)"
echo "== lisensi: $(head -1 package/license.txt)"

APP="$OLDPWD"
TUJUAN="$APP/tinymce"
rm -rf "$TUJUAN"
mkdir -p "$TUJUAN"

salin() {
  local rel="$1"
  local dari="package/$rel"
  [ -e "$dari" ] || { echo "  HILANG: $rel"; return 1; }
  mkdir -p "$TUJUAN/$(dirname "$rel")"
  cp -r "$dari" "$TUJUAN/$rel"
}

echo "== salin inti"
salin tinymce.min.js
salin themes/silver/theme.min.js
salin models/dom/model.min.js
salin icons/default/icons.min.js

# license.txt WAJIB ikut: MIT mengharuskan salinan lisensi disertakan pada
# setiap distribusi. Produk ini dijual, jadi ini bukan formalitas.
salin license.txt

echo "== salin skin (hanya oxide-dark + content dark)"
# skin.min.css = rangka editor; content.min.css = gaya DI DALAM area tulis.
salin skins/ui/oxide-dark/skin.min.css
salin skins/ui/oxide-dark/content.min.css
salin skins/content/dark/content.min.css

echo "== salin plugin yang dipakai"
# Sengaja sedikit. Setiap plugin = satu berkas lagi yang harus diunggah
# pembeli lewat File Manager, dan tombol yang tidak dipakai cuma bikin
# toolbar ramai. 'code' dipakai untuk melihat/menyunting HTML mentah,
# 'codesample' untuk blok kode materi.
for p in lists table link code codesample autoresize fullscreen searchreplace wordcount; do
  salin "plugins/$p/plugin.min.js" || true
done

echo
echo "== hasil di tinymce/ =="
echo "   berkas : $(find "$TUJUAN" -type f | wc -l)"
echo "   ukuran : $(du -sh "$TUJUAN" | cut -f1)"
echo "   lisensi: $(head -1 "$TUJUAN/license.txt")"
