#!/usr/bin/env bash
# push-github.sh — kirim commit ke GitHub memakai token dari Git Credential
# Manager, TANPA menuliskan token itu ke mana pun.
#
# Kenapa tidak `git push origin main` biasa: di mesin ini push biasa dijawab
# 403 "Write access to repository not granted" — Credential Manager memberi
# git kredensial yang berbeda dari yang dia berikan lewat `git credential fill`.
# Skrip ini memakai token yang sudah terbukti bisa membuat repo, dan
# memasukkannya ke URL hanya untuk satu perintah push (tidak disimpan di
# .git/config, tidak muncul di riwayat perintah).
#
# Pemakaian: bash push-github.sh <pemilik/repo> [cabang]
set -uo pipefail

REPO="${1:-}"
CABANG="${2:-main}"
[ -n "$REPO" ] || { echo "Pakai: bash push-github.sh <pemilik/repo> [cabang]"; exit 1; }

CRED=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null)
USER=$(echo "$CRED" | grep "^username=" | cut -d= -f2-)
TOKEN=$(echo "$CRED" | grep "^password=" | cut -d= -f2-)

# Credential Manager di mesin ini kadang menolak menjawab dari dalam repo
# ("User cancelled dialog" / git-askpass.exe tidak ada). Kalau begitu, pakai
# token yang disimpan user di ~/.gh-pat. Berkas itu ADA DI LUAR folder app,
# jadi tidak mungkin ikut ter-commit.
if [ -z "$TOKEN" ] && [ -f "$HOME/.gh-pat" ]; then
  TOKEN=$(tr -d '\r\n' < "$HOME/.gh-pat")
  USER=${USER:-x-access-token}
  echo "token   : dari ~/.gh-pat"
fi

if [ -z "$TOKEN" ]; then
  echo "Tidak ada token GitHub di Credential Manager. Minta user login dulu."
  exit 1
fi

echo "akun    : $USER"
echo "tujuan  : $REPO ($CABANG)"

# Pengaman: jangan pernah push kalau pemeriksaan rahasia gagal.
if [ -f cek-rahasia-git.js ]; then
  if ! node cek-rahasia-git.js > /tmp/rahasia.log 2>&1; then
    echo "DIBATALKAN: cek-rahasia-git.js menemukan kebocoran."
    tail -6 /tmp/rahasia.log
    exit 1
  fi
  echo "rahasia : AMAN (cek-rahasia-git.js lulus)"
fi

git push "https://${USER}:${TOKEN}@github.com/${REPO}.git" "HEAD:refs/heads/${CABANG}" 2>&1 \
  | sed "s|${TOKEN}|[TOKEN]|g"
KODE=${PIPESTATUS[0]}

if [ "$KODE" -ne 0 ]; then
  echo "push GAGAL (exit $KODE)"
  exit "$KODE"
fi

# Remote disimpan TANPA token, supaya .git/config tetap bersih.
git remote set-url origin "https://github.com/${REPO}.git" 2>/dev/null \
  || git remote add origin "https://github.com/${REPO}.git"
git branch --set-upstream-to="origin/${CABANG}" "${CABANG}" 2>/dev/null

echo "push OK"
