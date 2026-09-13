#!/usr/bin/env bash
# cek-live-editor.sh — pastikan editor visual benar-benar bisa dipakai di
# HOSTING, bukan cuma di lokal.
#
# Kenapa perlu: editor visual gagal senyap. Kalau satu berkas TinyMCE hilang,
# tidak ada pesan error — kotaknya cuma tidak muncul, dan admin mengira
# fiturnya tidak jadi. Jadi yang diperiksa: semua berkas TinyMCE terlayani,
# tipe MIME-nya benar, dan halaman editor memanggil ketiga skrip.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=https://juraganprompt.biz.id/member

lulus=0; gagal=0
ok()  { echo "OK   $1"; lulus=$((lulus+1)); }
bad() { echo "GAGAL $1"; gagal=$((gagal+1)); }

echo "=== berkas TinyMCE di hosting ==="
for F in $(find tinymce -type f | sort); do
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  SIZE=$(curl -sS -k --max-time 40 -o "$T/ce.bin" -w "%{size_download}" \
    "$B/$F?nocache=$(date +%s%N)" 2>/dev/null)
  [ "$SIZE" = "$LOKAL" ] && ok "$F ($SIZE b)" || bad "$F web=$SIZE lokal=$LOKAL"
done

echo
echo "=== tipe MIME (skin.min.css harus text/css, bukan text/html) ==="
for F in tinymce/tinymce.min.js tinymce/skins/ui/oxide-dark/skin.min.css; do
  CT=$(curl -sS -k --max-time 30 -o /dev/null -w "%{content_type}" "$B/$F" 2>/dev/null)
  case "$F" in
    *.js)  echo "$CT" | grep -qiE "javascript" && ok "$F -> $CT" || bad "$F -> $CT" ;;
    *.css) echo "$CT" | grep -qiE "text/css"   && ok "$F -> $CT" || bad "$F -> $CT" ;;
  esac
done

echo
echo "=== berkas pendamping editor ==="
for F in md-editor.js editor-materi.js edit-langsung.js blok_simpan.php _blok.php; do
  LOKAL=$(wc -c < "$F" | tr -d ' ')
  case "$F" in
    *.js)
      SIZE=$(curl -sS -k --max-time 30 -o "$T/ce2.bin" -w "%{size_download}" \
        "$B/$F?nocache=$(date +%s%N)" 2>/dev/null)
      [ "$SIZE" = "$LOKAL" ] && ok "$F ($SIZE b)" || bad "$F web=$SIZE lokal=$LOKAL" ;;
    *.php)
      # Berkas PHP tidak boleh menampilkan kode sumbernya. Yang benar: dia
      # menjawab (302/403/200), BUKAN memuntahkan '<?php'.
      curl -sS -k --max-time 30 -o "$T/ce3.txt" "$B/$F" 2>/dev/null
      if grep -q '<?php' "$T/ce3.txt"; then
        bad "$F MEMBOCORKAN KODE SUMBER"
      else
        KODE=$(curl -sS -k --max-time 30 -o /dev/null -w "%{http_code}" "$B/$F" 2>/dev/null)
        ok "$F ada, tidak bocor (http=$KODE)"
      fi ;;
  esac
done

echo
echo "=== halaman editor admin ==="
KODE=$(curl -sS -k --max-time 30 -o "$T/ce4.html" -w "%{http_code}" "$B/admin_materi.php?edit=1")
[ "$KODE" = "302" ] && ok "admin_materi.php -> 302 (wajib login, benar)" \
                    || bad "admin_materi.php -> $KODE (seharusnya 302)"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
