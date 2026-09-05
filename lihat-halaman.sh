#!/usr/bin/env bash
# lihat-halaman.sh — ambil judul + teks kunci dari halaman lokal, untuk verifikasi
# isi tanpa membuka browser. Pakai: bash lihat-halaman.sh <url>
T="C:/Users/user/AppData/Local/Temp/kd-page.html"
curl -sS --max-time 25 -o "$T" "$1" || exit 1
echo "== $1"
grep -oE '<title>[^<]*' "$T" | head -1 | cut -c8-
echo "-- heading:"
grep -oE '<h[123][^>]*>[^<]+' "$T" | sed 's/<[^>]*>//g' | head -12
echo "-- tombol/tautan:"
grep -oE 'class="btn[^"]*"[^>]*>[^<]+' "$T" | sed 's/^[^>]*>//' | head -12
