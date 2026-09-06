#!/usr/bin/env bash
# uji-tinymce.sh — uji editor visual materi lewat HTTP nyata (sisi server).
#
# Yang dipastikan di sini — dan kenapa tiap butir penting:
#  - Berkas TinyMCE benar-benar DILAYANI server. Kalau satu berkas hilang
#    (skin, model, plugin, ikon), editornya gagal muncul dan admin hanya
#    melihat kotak kosong tanpa pesan error apa pun.
#  - TIDAK ada rujukan ke cdn.tiny.cloud. Hosting bersama pembeli bisa
#    memblokir CDN, dan aturan produk ini: semua aset lokal.
#  - Skrip editor HANYA dimuat di halaman edit, bukan di daftar Bagian atau
#    halaman member (TinyMCE 1,3 MB).
#  - Textarea asli tetap ada dengan name="isi_md" — inilah yang dikirim ke
#    server; kalau namanya berubah, semua editan hilang tanpa jejak.
#  - Alur SIMPAN sungguhan: kirim markdown lewat POST, baca ulang dari editor,
#    pastikan yang tersimpan sama. Ini menutup kemungkinan konversi merusak
#    materi yang sudah ada.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp
B=http://127.0.0.1:8813
J="$T/ut-cookie.txt"
lulus=0; gagal=0
ok(){ echo "OK   $1"; lulus=$((lulus+1)); }
bad(){ echo "BAD  $1"; gagal=$((gagal+1)); }

# Bagian yang dipakai untuk uji tulis. JANGAN pakai Bagian 1–4: uji ini
# MENIMPA isinya, dan materi asli yang sudah ditulis rapi akan hilang
# (pernah terjadi — harus dipulihkan lewat _uji_reseed.php). Nomor 90 di luar
# rentang kurikulum, jadi aman dan otomatis dihapus di akhir.
UJIB=90

echo "### 1. berkas TinyMCE dilayani server"
# Daftar ini bukan tebakan: ini berkas yang benar-benar diminta browser saat
# TinyMCE start dengan konfigurasi app ini.
for f in \
  "tinymce/tinymce.min.js" \
  "tinymce/themes/silver/theme.min.js" \
  "tinymce/models/dom/model.min.js" \
  "tinymce/icons/default/icons.min.js" \
  "tinymce/skins/ui/oxide-dark/skin.min.css" \
  "tinymce/skins/ui/oxide-dark/content.min.css" \
  "tinymce/skins/content/dark/content.min.css" \
  "tinymce/langs/id.js" \
  "tinymce/plugins/lists/plugin.min.js" \
  "tinymce/plugins/link/plugin.min.js" \
  "tinymce/plugins/table/plugin.min.js" \
  "tinymce/plugins/code/plugin.min.js" \
  "tinymce/plugins/codesample/plugin.min.js" \
  "tinymce/plugins/searchreplace/plugin.min.js" \
  "tinymce/plugins/fullscreen/plugin.min.js" \
  "tinymce/plugins/wordcount/plugin.min.js" \
  "tinymce/plugins/autoresize/plugin.min.js" \
  "md-editor.js" \
  "editor-materi.js" \
; do
  KODE=$(curl -sS --max-time 20 -o "$T/ut-f.bin" -w "%{http_code}" "$B/$f" 2>/dev/null)
  UK=$(wc -c < "$T/ut-f.bin" | tr -d ' ')
  if [ "$KODE" = "200" ] && [ "$UK" -gt 200 ]; then ok "$f ($UK b)"; else bad "$f -> HTTP $KODE, $UK byte"; fi
done

echo
echo "### 2. tidak ada CDN"
CDN=$(grep -rl "cdn.tiny.cloud\|tiny.cloud/1\|unpkg.com/tinymce\|cdnjs.*tinymce" \
  --include="*.php" --include="*.js" --include="*.css" . 2>/dev/null | grep -v "^./tinymce/" | head -5)
[ -z "$CDN" ] && ok "tidak ada rujukan CDN TinyMCE di kode app" \
  || { bad "ada rujukan CDN:"; echo "$CDN" | sed 's/^/     /'; }

echo
echo "### 3. login admin"
rm -f "$J"
curl -sS --max-time 20 -c "$J" -o "$T/ut-login.html" "$B/login.php" >/dev/null 2>&1
TOK=$(grep -oE 'name="csrf" value="[^"]+' "$T/ut-login.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$J" -c "$J" -o "$T/ut-post.html" \
  --data-urlencode "csrf=$TOK" --data-urlencode "email=admin@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$J" -o "$T/ut-list.html" "$B/admin_materi.php" 2>/dev/null
grep -q "Bagian" "$T/ut-list.html" && ok "panel admin materi terbuka" \
  || { bad "gagal buka admin_materi.php (login admin gagal?)"; }

echo
echo "### 4. skrip editor hanya di halaman edit"
grep -q "tinymce/tinymce.min.js" "$T/ut-list.html" \
  && bad "TinyMCE dimuat di DAFTAR Bagian (1,3 MB tanpa guna)" \
  || ok "daftar Bagian tidak memuat TinyMCE"

curl -sS --max-time 20 -b "$J" -o "$T/ut-edit.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
for s in "tinymce/tinymce.min.js" "md-editor.js" "editor-materi.js"; do
  grep -q "$s" "$T/ut-edit.html" && ok "halaman edit memuat $s" || bad "halaman edit TIDAK memuat $s"
done

echo
echo "### 5. textarea asli utuh (satu-satunya yang dikirim ke server)"
grep -q 'name="isi_md"' "$T/ut-edit.html" && ok 'textarea name="isi_md" ada' \
  || bad 'textarea name="isi_md" HILANG — editan tidak akan tersimpan'
grep -q 'id="isi_md"' "$T/ut-edit.html" && ok 'id="isi_md" ada (dicari editor-materi.js)' \
  || bad 'id="isi_md" hilang — editor tidak akan terpasang'
# Hanya SATU field isi yang boleh terkirim; kalau editor visual punya name juga,
# PHP menerima dua nilai dan yang menang belum tentu yang diedit.
N=$(grep -o 'name="isi_md"' "$T/ut-edit.html" | wc -l | tr -d ' ')
[ "$N" = "1" ] && ok "hanya 1 field isi_md" || bad "ada $N field isi_md (harus 1)"

echo
echo "### 6. petunjuk mengikuti mode"
grep -q "data-hint-md" "$T/ut-edit.html" && ok "petunjuk mode markdown ada" || bad "petunjuk markdown hilang"
grep -q "data-hint-visual" "$T/ut-edit.html" && ok "petunjuk mode visual ada" || bad "petunjuk visual hilang"

echo
echo "### 7. simpan sungguhan: markdown masuk utuh, tidak dirusak"
# Materi uji memakai SEMUA sintaks khusus sekaligus. Kalau satu saja rusak
# saat bolak-balik, uji ini yang menangkapnya sebelum sampai ke user.
cat > "$T/ut-materi.md" <<'MD'
## Judul kartu uji

Kalimat biasa dengan **tebal**, *miring*, dan `kode`.

:::aman Sebelum menekan Enter
Isi kartu penenang.
:::

- [x] sudah dicentang
- [ ] belum dicentang

| Kolom A | Kolom B |
| --- | --- |
| isi 1 | isi 2 |

@video https://youtu.be/3on5-_oqsGs Judul videonya

```bash
hermes chat
```
MD

TOKE=$(grep -oE 'name="csrf" value="[^"]+' "$T/ut-edit.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 30 -b "$J" -c "$J" -o "$T/ut-simpan.html" \
  --data-urlencode "csrf=$TOKE" --data-urlencode "aksi=simpan" \
  --data-urlencode "urutan=$UJIB" --data-urlencode "judul=Bagian uji editor" \
  --data-urlencode "ringkas=uji editor visual" \
  --data-urlencode "isi_md@$T/ut-materi.md" \
  "$B/admin_materi.php?b=$UJIB" >/dev/null 2>&1

curl -sS --max-time 20 -b "$J" -o "$T/ut-edit2.html" "$B/admin_materi.php?b=$UJIB" 2>/dev/null
# Ambil isi textarea, lalu balikkan escape HTML-nya supaya bisa dibandingkan.
node ambil-textarea.js "$T/ut-edit2.html" "$T/ut-balik.md" >/dev/null 2>&1

for pola in '^## Judul kartu uji' '\*\*tebal\*\*' '^:::aman Sebelum menekan Enter' \
            '^- \[x\] sudah dicentang' '^- \[ \] belum dicentang' \
            '^| Kolom A | Kolom B |' '^@video https://youtu.be/3on5-_oqsGs' '^```bash'; do
  grep -qE "$pola" "$T/ut-balik.md" && ok "tersimpan utuh: $pola" \
    || bad "HILANG/RUSAK setelah simpan: $pola"
done

echo
echo "### 8. halaman member merender hasilnya seperti biasa"
rm -f "$T/ut-c2.txt"
curl -sS --max-time 20 -c "$T/ut-c2.txt" -o "$T/ut-l2.html" "$B/login.php" >/dev/null 2>&1
TOK2=$(grep -oE 'name="csrf" value="[^"]+' "$T/ut-l2.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$T/ut-c2.txt" -c "$T/ut-c2.txt" -o /dev/null \
  --data-urlencode "csrf=$TOK2" --data-urlencode "email=budi@demo.id" \
  --data-urlencode "password=demo12345" "$B/login.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$T/ut-c2.txt" -o "$T/ut-view.html" "$B/materi.php?b=$UJIB" 2>/dev/null

grep -q 'kd-callout' "$T/ut-view.html" && ok "kartu :::aman jadi callout di halaman member" \
  || bad "kartu tidak dirender di halaman member"
grep -q 'kd-ceklis\|kd-cek' "$T/ut-view.html" && ok "checklist dirender" || bad "checklist tidak dirender"
grep -q '<table' "$T/ut-view.html" && ok "tabel dirender" || bad "tabel tidak dirender"
grep -q 'youtube-nocookie' "$T/ut-view.html" && ok "video dirender" || bad "video tidak dirender"
# Pagar ::: tidak boleh terbaca pembaca. Ini regresi paling memalukan kalau lolos.
SISA=$(grep -o ':::' "$T/ut-view.html" | wc -l | tr -d ' ')
[ "$SISA" = "0" ] && ok "tidak ada pagar ::: yang terbaca pembaca" || bad "ada $SISA pagar ::: bocor ke halaman"

echo
echo "### 9. bersihkan Bagian uji"
# Kalau tidak dihapus, Bagian 90 muncul di dashboard member sebagai materi
# nyata. Uji tidak boleh meninggalkan sampah yang terlihat pembeli.
TOKH=$(grep -oE 'name="csrf" value="[^"]+' "$T/ut-edit2.html" | head -1 | sed 's/.*value="//')
curl -sS --max-time 20 -b "$J" -o /dev/null \
  --data-urlencode "csrf=$TOKH" --data-urlencode "aksi=hapus" \
  --data-urlencode "urutan=$UJIB" "$B/admin_materi.php" >/dev/null 2>&1
curl -sS --max-time 20 -b "$J" -o "$T/ut-list2.html" "$B/admin_materi.php" 2>/dev/null
grep -q ">$UJIB<" "$T/ut-list2.html" && bad "Bagian uji $UJIB masih ada" \
  || ok "Bagian uji $UJIB sudah dihapus"

echo
echo "-----"
echo "LULUS=$lulus GAGAL=$gagal"
[ "$gagal" = "0" ] || exit 1
