#!/usr/bin/env bash
# cek-editor-lokal.sh — buka halaman editor SEBAGAI ADMIN lewat HTTP dan
# pastikan tiga hal ada: tab "Tulis visual", skrip TinyMCE, dan textarea
# markdown yang tetap jadi sumber simpan.
#
# Kenapa lewat HTTP dengan login sungguhan, bukan grep berkas PHP: skrip editor
# hanya disisipkan kalau $edit > 0 DAN barisnya ada. Grep berkas tidak
# membuktikan cabang itu benar-benar jalan.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
J=$T/ed-cookie.txt
rm -f "$J"

lulus=0; gagal=0
ok()  { echo "OK   $1"; lulus=$((lulus+1)); }
bad() { echo "GAGAL $1"; gagal=$((gagal+1)); }

curl -sS --max-time 20 "$B/_uji_akun.php"      -o "$T/ed-akun.txt"
curl -sS --max-time 20 "$B/_uji_ratereset.php" -o "$T/ed-rate.txt"

# Login admin: ambil token CSRF dulu, baru kirim.
curl -sS --max-time 20 -c "$J" "$B/login.php" -o "$T/ed-login.html"
TOK=$(grep -oE 'name="csrf" value="[^"]+"' "$T/ed-login.html" | head -1 | sed 's/.*value="//;s/"//')
[ -n "$TOK" ] && ok "token CSRF didapat" || bad "token CSRF tidak ada"

curl -sS --max-time 20 -b "$J" -c "$J" -L \
  --data-urlencode "csrf=$TOK" \
  --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" \
  "$B/login.php" -o "$T/ed-masuk.html"
grep -q 'admin.php' "$T/ed-masuk.html" && ok "login admin berhasil" || bad "login admin gagal"

# Halaman editor Bagian 1. Parameternya ?b= (nomor Bagian), bukan ?edit= —
# ?edit=1 hanya menampilkan daftar Bagian, dan itu terlihat "berhasil" padahal
# form editornya tidak pernah dirender.
curl -sS --max-time 25 -b "$J" "$B/admin_materi.php?b=1" -o "$T/ed-form.html"
SZ=$(wc -c < "$T/ed-form.html" | tr -d ' ')
[ "$SZ" -gt 8000 ] && ok "halaman editor terbuka ($SZ byte)" || bad "halaman editor cuma $SZ byte"

for s in 'tinymce/tinymce.min.js' 'md-editor.js' 'editor-materi.js'; do
  grep -q "$s" "$T/ed-form.html" && ok "skrip $s dipanggil" || bad "skrip $s TIDAK dipanggil"
done

grep -q 'id="isi_md"'        "$T/ed-form.html" && ok "textarea isi_md ada"        || bad "textarea isi_md hilang"
grep -q 'name="isi_md"'      "$T/ed-form.html" && ok "textarea tetap name=isi_md" || bad "name=isi_md hilang"
grep -q 'data-hint-visual'   "$T/ed-form.html" && ok "petunjuk mode visual ada"   || bad "petunjuk mode visual hilang"
grep -q 'kerangka-modul'     "$T/ed-form.html" && ok "kerangka modul ada"         || bad "kerangka modul hilang"

# Isi materi harus benar-benar termuat di textarea, bukan kosong.
grep -q ':::' "$T/ed-form.html" && ok "isi markdown termuat (ada pagar :::)" || bad "textarea kosong"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" -eq 0 ] || exit 1
