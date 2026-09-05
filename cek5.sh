#!/usr/bin/env bash
# cek5.sh — coba masuk cPanel memakai password FTP (kredensial yang user sudah kirim),
# lalu baca Document Root resmi lewat UAPI. Maksimal 2 percobaan supaya tidak
# kena cPHulk lockout.
set -u
T="${LOCALAPPDATA}/Temp/kdcek"; mkdir -p "$T"
PASS="$(cut -d: -f2 .ftp | tr -d '\r\n')"
J="$T/cookie.txt"; : > "$J"

coba() { # $1=host $2=user
  local host="$1" user="$2"
  printf '  %-34s user=%-28s ' "$host" "$user"
  curl -sS -k --max-time 30 -c "$J" -b "$J" \
    --data-urlencode "user=$user" --data-urlencode "pass=$PASS" \
    --data-urlencode "login_only=1" \
    "$host/login/?login_only=1" -o "$T/login.json" -w 'http=%{http_code}\n' 2>/dev/null || echo 'ERR'
  head -c 200 "$T/login.json"; echo
}

echo "=== 1. login cPanel (2 percobaan) ==="
coba "https://juraganprompt.biz.id:2083" "akunmu"
coba "https://rho.id.rapidplex.com:2083" "akunmu"

echo
echo "=== 2. kalau ada token, ambil Document Root ==="
TOK="$(grep -oE 'cpsess[0-9]+' "$T/login.json" 2>/dev/null | head -1)"
if [ -n "${TOK:-}" ]; then
  echo "  token=$TOK"
  for host in "https://juraganprompt.biz.id:2083" "https://rho.id.rapidplex.com:2083"; do
    curl -sS -k --max-time 30 -b "$J" \
      "$host/$TOK/execute/DomainInfo/domains_data?format=hash" \
      -o "$T/dom.json" -w "  $host -> %{http_code}\n" 2>/dev/null
    grep -oE '"(documentroot|domain|homedir)":"[^"]*"' "$T/dom.json" 2>/dev/null | head -20
  done
else
  echo "  tidak dapat token — login gagal."
fi
