#!/usr/bin/env bash
# cp-login.sh — login ke cPanel lewat API dan simpan security token + cookie.
# Dipakai oleh cp-deploy.sh. Kredensial dibaca dari berkas .cpanel (user:pass),
# tidak pernah dicetak ke layar.
set -u
W="C:/Users/user/AppData/Local/Temp/kd-cp"; mkdir -p "$W"
HOST="${CP_HOST:-https://juraganprompt.biz.id:2083}"
CRED="${CP_CRED:-.cpanel}"

[ -f "$CRED" ] || { echo "berkas $CRED tidak ada"; exit 2; }
U="$(cut -d: -f1 "$CRED" | tr -d '\r\n')"
P="$(cut -d: -f2- "$CRED" | tr -d '\r\n')"

rm -f "$W/cookie.txt" "$W/login.json"
CODE=$(curl -sSk -c "$W/cookie.txt" -o "$W/login.json" -w '%{http_code}' --max-time 45 \
  --data-urlencode "user=$U" --data-urlencode "pass=$P" --data-urlencode "login_only=1" \
  "$HOST/login/?login_only=1")

echo "login http=$CODE"
# Ambil security token (bentuknya /cpsess1234567890)
TOK=$(grep -oE '"security_token":"[^"]*"' "$W/login.json" | head -1 | cut -d'"' -f4)
if [ -z "$TOK" ]; then
  TOK=$(grep -oE '/cpsess[0-9]+' "$W/login.json" | head -1)
fi
if [ -z "$TOK" ]; then
  echo "GAGAL: token tidak ditemukan. Cuplikan balasan:"
  head -c 300 "$W/login.json"; echo
  exit 1
fi
printf '%s' "$TOK" > "$W/token.txt"
echo "token tersimpan (panjang $(printf '%s' "$TOK" | wc -c) char)"
echo "home: $(grep -oE '"home":"[^"]*"' "$W/login.json" | head -1 | cut -d'"' -f4)"
