#!/usr/bin/env bash
# build.sh — gabung parts/ jadi satu index.html (single-file, tanpa dependency).
set -euo pipefail
cd "$(dirname "$0")"
OUT=index.html
{
  cat parts/00-head.html
  cat parts/10-body.html
  for f in parts/20-core.js parts/30-seed.js parts/40-store-a.js parts/41-store-b.js \
           parts/50-router.js parts/60-view-publik.js parts/70-view-member.js \
           parts/80-view-admin-a.js parts/81-view-admin-b.js parts/90-boot.js; do
    echo "/* ===== $(basename "$f") ===== */"
    cat "$f"
  done
  printf '</script>\n</body>\n</html>\n'
} > "$OUT"
echo "index.html: $(wc -c < "$OUT") bytes, $(wc -l < "$OUT") baris"
