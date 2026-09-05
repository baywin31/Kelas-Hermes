#!/usr/bin/env bash
# hapus_ftp.sh — hapus isi /public_html KECUALI folder yang dilindungi.
# Backup wajib sudah ada di PC sebelum ini dijalankan.
set -u

HOST="ftp://juraganprompt.biz.id"
U="$(tr -d '\r\n' < "$(dirname "$0")/.ftp")"
OUT="${LOCALAPPDATA:-/tmp}/Temp/kd_hapus_out.txt"

# Folder yang TIDAK boleh disentuh.
LINDUNGI="akademi karyawan"

F() { curl -sS -k --ssl-reqd --ftp-pasv --max-time 90 -u "$U" "$@"; }

dilindungi() {
  local n="$1"
  for p in $LINDUNGI; do [ "$n" = "$p" ] && return 0; done
  return 1
}

JML_F=0; JML_D=0; JML_GAGAL=0

hapus_file() {
  local abs="$1" kode
  kode=$(F "$HOST/$(dirname "$abs")/" -Q "-DELE $abs" -o "$OUT" -w '%{http_code}' 2>/dev/null || echo ERR)
  if [ "$kode" = "250" ] || [ "$kode" = "226" ]; then
    echo "  hapus  $abs"; JML_F=$((JML_F+1))
  else
    echo "  ! GAGAL $abs (kode=$kode)"; JML_GAGAL=$((JML_GAGAL+1))
  fi
}

# Hapus isi direktori secara rekursif, lalu direktorinya sendiri.
bersihkan_dir() {
  local rel="$1"                     # relatif dari /public_html, tanpa slash awal
  local abs="/public_html/$rel"
  local buf="${LOCALAPPDATA:-/tmp}/Temp/kd_ls_$(echo "$rel" | tr '/' '_').txt"

  F "$HOST$abs/" -o "$buf" -w '' 2>/dev/null || { echo "  ! gagal listing $abs"; return; }

  local baris tipe nama
  while IFS= read -r baris; do
    [ -z "$baris" ] && continue
    tipe="${baris:0:1}"
    nama="$(echo "$baris" | awk '{ for (i=9; i<=NF; i++) printf "%s%s", $i, (i<NF ? OFS : "") }' | tr -d '\r')"
    [ -z "$nama" ] || [ "$nama" = "." ] || [ "$nama" = ".." ] || {
      if [ "$tipe" = "d" ]; then
        bersihkan_dir "$rel/$nama"
      else
        hapus_file "$abs/$nama"
      fi
    }
  done < "$buf"

  # Direktori kosong -> RMD
  local kode
  kode=$(F "$HOST/public_html/" -Q "-RMD $abs" -o "$OUT" -w '%{http_code}' 2>/dev/null || echo ERR)
  if [ "$kode" = "250" ] || [ "$kode" = "226" ]; then
    echo "  RMD    $abs"; JML_D=$((JML_D+1))
  else
    echo "  ! GAGAL RMD $abs (kode=$kode)"; JML_GAGAL=$((JML_GAGAL+1))
  fi
}

echo "Melindungi: $LINDUNGI"
echo

BUF="${LOCALAPPDATA:-/tmp}/Temp/kd_root_ls.txt"
F "$HOST/public_html/" -o "$BUF" -w '' 2>/dev/null || { echo "gagal listing root"; exit 1; }

while IFS= read -r baris; do
  [ -z "$baris" ] && continue
  tipe="${baris:0:1}"
  nama="$(echo "$baris" | awk '{ for (i=9; i<=NF; i++) printf "%s%s", $i, (i<NF ? OFS : "") }' | tr -d '\r')"
  [ -z "$nama" ] && continue
  [ "$nama" = "." ] && continue
  [ "$nama" = ".." ] && continue

  if dilindungi "$nama"; then
    echo "  LEWAT  /public_html/$nama (dilindungi)"
    continue
  fi

  if [ "$tipe" = "d" ]; then
    bersihkan_dir "$nama"
  else
    hapus_file "/public_html/$nama"
  fi
done < "$BUF"

echo
echo "-----"
echo "berkas dihapus : $JML_F"
echo "folder dihapus : $JML_D"
echo "gagal          : $JML_GAGAL"
echo
echo "Sisa isi /public_html:"
F "$HOST/public_html/" -o "$OUT" -w '' 2>/dev/null
awk '{ for (i=9; i<=NF; i++) printf "%s%s", $i, (i<NF ? OFS : ""); print "" }' "$OUT" | sed 's/^/  /'
