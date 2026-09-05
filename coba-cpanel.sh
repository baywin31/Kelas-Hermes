#!/usr/bin/env bash
# coba-cpanel.sh — cari jalur masuk cPanel yang benar-benar jalan.
# Sebelumnya login ditolak "invalid_login", jadi di sini dicoba beberapa
# pintu sekaligus: port 2083 langsung, proxy /cpanel di port 443, dan
# UAPI dengan Basic auth. Kredensial dibaca dari .cpanel supaya tidak
# pernah tercetak ke layar.
set -u
cd "$(dirname "$0")"
T=C:/Users/user/AppData/Local/Temp

CP=$(cat .cpanel)
CUSER=${CP%%:*}
CPASS=${CP#*:}
H=juraganprompt.biz.id

coba() {
  local nama="$1" url="$2"; shift 2
  local kode
  kode=$(curl -sS -k --max-time 25 -o "$T/cp-out.txt" -w "%{http_code}" "$@" "$url" 2>"$T/cp-err.txt")
  local rc=$?
  local petunjuk=""
  grep -qi "security_token\|securitytoken" "$T/cp-out.txt" 2>/dev/null && petunjuk=" [ADA security_token = LOGIN SUKSES]"
  grep -qi "invalid_login\|invalid login" "$T/cp-out.txt" 2>/dev/null && petunjuk=" [invalid_login]"
  grep -qi '"status":1' "$T/cp-out.txt" 2>/dev/null && petunjuk="$petunjuk [status:1 OK]"
  printf '%-34s http=%-4s rc=%-2s %sb%s\n' "$nama" "$kode" "$rc" \
    "$(wc -c < "$T/cp-out.txt" | tr -d ' ')" "$petunjuk"
  [ -s "$T/cp-err.txt" ] && head -1 "$T/cp-err.txt" | sed 's/^/    err: /'
  return 0
}

echo "=== 1. login form port 2083 ==="
coba "2083 /login/ login_only" "https://$H:2083/login/?login_only=1" \
  -X POST --data-urlencode "user=$CUSER" --data-urlencode "pass=$CPASS"

echo
echo "=== 2. login form port 2082 (non-TLS) ==="
coba "2082 /login/ login_only" "http://$H:2082/login/?login_only=1" \
  -X POST --data-urlencode "user=$CUSER" --data-urlencode "pass=$CPASS"

echo
echo "=== 3. UAPI Basic auth (port 2083) ==="
coba "2083 UAPI Fileman::list_files" \
  "https://$H:2083/execute/Fileman/list_files?dir=%2Fpublic_html&types=dir" \
  -u "$CUSER:$CPASS"

echo
echo "=== 4. proxy /cpanel lewat port 443 ==="
coba "443 /cpanel" "https://$H/cpanel" -u "$CUSER:$CPASS"

echo
echo "=== 5. UAPI lewat proxy 443 ==="
coba "443 UAPI list_files" \
  "https://$H/execute/Fileman/list_files?dir=%2Fpublic_html&types=dir" \
  -u "$CUSER:$CPASS"

echo
echo "=== 6. port 2083 kebuka dari sini? ==="
coba "2083 GET /" "https://$H:2083/" 

echo
echo "-- 6 pintu dicoba. Yang berguna hanya yang bertanda LOGIN SUKSES / status:1 --"
