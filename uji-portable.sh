#!/usr/bin/env bash
# uji-portable.sh — jalankan smoke.sh + smoke2.sh tanpa Docker.
# Tidak perlu menukar _config.php: _config.php sendiri sudah memakai
# _config.local.php secara otomatis saat diakses dari 127.0.0.1:8813.
set -u
cd "$(dirname "$0")"

T=C:/Users/user/tools
MD="$T/mariadb_pkg/mariadb-10.6.19-winx64"
PHP="$T/php83/php.exe"
INI="$T/php83/php.ini"
PORT_DB=3399
PORT_WEB=8813
BASE="http://127.0.0.1:$PORT_WEB"

bersihkan() {
  [ -n "${PID_WEB:-}" ] && kill "$PID_WEB" 2>/dev/null
  [ -n "${PID_DB:-}" ] && kill "$PID_DB" 2>/dev/null
  return 0
}
trap bersihkan EXIT

for f in "$PHP" "$MD/bin/mysqld.exe"; do
  [ -x "$f" ] || { echo "TIDAK ADA: $f — unduh PHP/MariaDB portable dulu."; exit 1; }
done
[ -f _config.local.php ] || { echo "TIDAK ADA: _config.local.php"; exit 1; }

if ! "$MD/bin/mysql.exe" -h 127.0.0.1 -P $PORT_DB -u root -e 'SELECT 1' >/dev/null 2>&1; then
  echo "== menyalakan MariaDB portable :$PORT_DB"
  [ -d "$T/kd-mysql-data" ] || bash "$T/kd-db-init.sh"
  "$MD/bin/mysqld.exe" --datadir="$T/kd-mysql-data" --port=$PORT_DB --console --skip-name-resolve >/dev/null 2>&1 &
  PID_DB=$!
  for i in $(seq 1 30); do
    "$MD/bin/mysql.exe" -h 127.0.0.1 -P $PORT_DB -u root -e 'SELECT 1' >/dev/null 2>&1 && break
    sleep 1
  done
  bash "$T/kd-db-setup.sh" >/dev/null
fi
echo "== MariaDB siap"

# Mulai dari DB bersih supaya uji deterministik: setup.php hanya mau membuat
# admin pertama sekali, jadi tabel sisa run sebelumnya membuat suite 1 gagal.
if [ "${SIMPAN_DB:-0}" != "1" ]; then
  echo "== hapus tabel kd_ dari DB uji"
  SQLDROP="C:/Users/user/AppData/Local/Temp/kd-drop.sql"
  {
    echo "SET FOREIGN_KEY_CHECKS=0;"
    # Nama DB dibaca dari _config.local.php, tidak boleh dipaku di sini: berkas
    # ini ikut ke repo publik, sedangkan _config.local.php tidak. Kalau dipaku,
    # uji ini gagal begitu nama DB disamarkan ('Unknown database' — pernah
    # terjadi). _config.local.php yang dipakai, bukan _config.php, karena itulah
    # berkas yang dipakai server lokal 127.0.0.1:8813.
    echo "USE $(grep -oE "DB_NAME *= *'[^']*'" _config.local.php | head -1 | sed "s/.*'\(.*\)'/\1/");"
    for tb in users codes content progress notes visits resets settings ratelimit audit; do
      echo "DROP TABLE IF EXISTS kd_$tb;"
    done
    echo "SET FOREIGN_KEY_CHECKS=1;"
  } > "$SQLDROP"
  "$MD/bin/mysql.exe" -h 127.0.0.1 -P $PORT_DB -u root < "$SQLDROP"
  rm -f "C:/Users/user/AppData/Local/Temp/kdphp_admin.txt"
fi

if ! curl -sS -o "C:/Users/user/AppData/Local/Temp/kd-cek-web.txt" --max-time 5 "$BASE/index.php" 2>/dev/null; then
  echo "== menyalakan PHP built-in server :$PORT_WEB"
  "$PHP" -c "$INI" -S 127.0.0.1:$PORT_WEB -t . >/dev/null 2>&1 &
  PID_WEB=$!
  for i in $(seq 1 20); do
    curl -sS -o "C:/Users/user/AppData/Local/Temp/kd-cek-web.txt" --max-time 3 "$BASE/index.php" 2>/dev/null && break
    sleep 1
  done
fi
echo "== web siap: $BASE"

echo
bash smoke.sh "$BASE" | tail -4
H1=${PIPESTATUS[0]}
echo
bash smoke2.sh "$BASE" | tail -4
H2=${PIPESTATUS[0]}

echo
echo "== pulihkan materi seed (smoke2 mengubah isi materi)"
# curl native Windows: -o /dev/null memicu error 23, pakai berkas nyata.
TMPOUT="C:/Users/user/AppData/Local/Temp/kd-uji-out.txt"
curl -sS -o "$TMPOUT" --max-time 20 "$BASE/_uji_reseed.php" && echo "   seed dipulihkan"

echo
if [ "$H1" -eq 0 ] && [ "$H2" -eq 0 ]; then echo "SEMUA UJI LULUS"; else echo "ADA UJI GAGAL (suite1=$H1 suite2=$H2)"; fi
exit $(( H1 + H2 ))
