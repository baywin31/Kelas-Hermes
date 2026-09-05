#!/usr/bin/env bash
# buka-demo.sh — buka kedua mode di browser default.
# `cmd //c start` gagal di shell ini ("too many arguments"), jadi pakai
# PowerShell Start-Process yang menerima URL langsung.
powershell.exe -NoProfile -Command "Start-Process 'http://127.0.0.1:8813/index.php'"
sleep 2
powershell.exe -NoProfile -Command "Start-Process 'http://127.0.0.1:8814/index.html'"
echo "dua tab dibuka: PHP :8813, HTML :8814"
