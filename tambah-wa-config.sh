#!/usr/bin/env bash
# tambah-wa-config.sh — tambahkan konstanta WA_NOMOR ke semua file config
# kalau belum ada, tepat setelah baris TELEGRAM_URL.
set -eu
cd "$(dirname "$0")"

for F in _config.contoh.php _config.local.php _config.prod.php _config.php; do
  [ -f "$F" ] || continue
  if grep -q "WA_NOMOR" "$F"; then echo "$F: sudah ada"; continue; fi
  case "$F" in
    _config.local.php) NOMOR="6281234567890" ;;   # nomor uji lokal
    *)                 NOMOR="" ;;                # produksi: diisi dari panel admin
  esac
  sed -i "/const TELEGRAM_URL/a\\
\\
// Nomor WhatsApp admin. Boleh 08xx atau 62xx, tanda hubung/spasi otomatis dirapikan.\\
// Kosongkan kalau belum punya — tombol WA tidak akan muncul, bukan error.\\
// Bisa juga diubah kapan saja dari Panel Admin › Setelan (nilai panel menang).\\
const WA_NOMOR = '$NOMOR';" "$F"
  echo "$F: WA_NOMOR ditambahkan"
done

for F in _config.contoh.php _config.local.php _config.prod.php _config.php; do
  [ -f "$F" ] && C:/Users/user/tools/php83/php.exe -l "$F" | tail -1
done
