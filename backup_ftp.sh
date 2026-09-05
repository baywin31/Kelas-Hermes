#!/usr/bin/env bash
# backup_ftp.sh — unduh SELURUH isi /public_html dari hosting ke PC (rekursif).
# Struktur folder dipertahankan. Aman diulang (file ditimpa).
#
# Pakai: bash backup_ftp.sh [folder-tujuan]
set -u

HOST="ftp://juraganprompt.biz.id"
U="$(tr -d '\r\n' < "$(dirname "$0")/.ftp")"
DEST="${1:-C:/Users/user/backup-hosting}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ROOT="$DEST/juraganprompt-public_html-$STAMP"
TMP="${LOCALAPPDATA:-/tmp}/Temp/kdbackup"
rm -rf "$TMP"; mkdir -p "$TMP" "$ROOT"

# -k: sertifikat FTPS hosting tidak cocok dengan nama domain.
F() { curl -sS -k --ssl-reqd --ftp-pasv --max-time 120 -u "$U" "$@"; }

JML_FILE=0; JML_DIR=0; JML_GAGAL=0
DAFTAR="$ROOT/_daftar-berkas.txt"
: > "$DAFTAR"

# Ambil listing satu direktori, kembalikan baris LIST mentah.
listing() {
  local rel="$1"
  local out="$TMP/ls.txt"
  F "$HOST/public_html$rel/" -o "$out" -w '' 2>/dev/null || return 1
  cat "$out"
}

turun() {
  local rel="$1"           # contoh: "" atau "/akademi"
  local baris nama tipe
  mkdir -p "$ROOT$rel"
  JML_DIR=$((JML_DIR+1))

  # Simpan listing ke array dulu supaya rekursi tidak merusak file sementara.
  local buf="$TMP/buf$JML_DIR.txt"
  listing "$rel" > "$buf" 2>/dev/null || { echo "  ! gagal listing $rel"; return; }

  while IFS= read -r baris; do
    [ -z "$baris" ] && continue
    tipe="${baris:0:1}"
    # Nama file = kolom 9 dan sesudahnya (menangani nama bersuara spasi).
    nama="$(echo "$baris" | awk '{ for (i=9; i<=NF; i++) printf "%s%s", $i, (i<NF ? OFS : "") }')"
    nama="$(echo "$nama" | tr -d '\r')"
    [ -z "$nama" ] && continue
    [ "$nama" = "." ] && continue
    [ "$nama" = ".." ] && continue

    if [ "$tipe" = "d" ]; then
      echo "  DIR  $rel/$nama"
      turun "$rel/$nama"
    else
      local kode
      kode=$(F "$HOST/public_html$rel/$nama" -o "$ROOT$rel/$nama" -w '%{http_code}' 2>/dev/null || echo ERR)
      if [ "$kode" = "226" ] || [ "$kode" = "250" ]; then
        JML_FILE=$((JML_FILE+1))
        printf '%s/%s\n' "$rel" "$nama" >> "$DAFTAR"
      else
        echo "  ! GAGAL $rel/$nama (kode=$kode)"
        JML_GAGAL=$((JML_GAGAL+1))
      fi
    fi
  done < "$buf"
}

echo "Tujuan backup: $ROOT"
echo
turun ""

echo
echo "-----"
echo "folder : $JML_DIR"
echo "berkas : $JML_FILE"
echo "gagal  : $JML_GAGAL"
echo "daftar : $DAFTAR"
echo "$ROOT" > "${LOCALAPPDATA:-/tmp}/Temp/kd_backup_path.txt"
