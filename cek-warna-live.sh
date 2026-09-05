#!/usr/bin/env bash
# cek-warna-live.sh — apakah style.css di hosting sudah palet baru?
T=C:/Users/user/AppData/Local/Temp
curl -sS -k -o "$T/live.css" -w 'live style.css=%{http_code} %{size_download}b\n' --max-time 25 \
  "https://juraganprompt.biz.id/member/style.css"
echo "rujukan A4D8FF di live: $(grep -c 'A4D8FF' "$T/live.css")"
echo -n "live  --bg: "; grep -oE '\-\-bg:#[0-9a-fA-F]+' "$T/live.css" | head -1
echo -n "lokal --bg: "; grep -oE '\-\-bg:#[0-9a-fA-F]+' "$HOME/apps/karyawan-digital-php/style.css" | head -1
