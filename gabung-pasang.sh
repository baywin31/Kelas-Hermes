#!/usr/bin/env bash
# gabung-pasang.sh — gabungkan 4 bagian jadi pasang.php.
# Dipecah karena tiap tool call punya batas ukuran; bagian 2-4 tidak boleh
# punya '<?php' pembuka lagi (mereka lanjutan blok PHP yang sama).
set -eu
cd "$(dirname "$0")"
cat pasang.php _pasang_bagian2.php _pasang_bagian3.php _pasang_bagian4.php > pasang.tmp
mv -f pasang.tmp pasang.php
rm -f _pasang_bagian2.php _pasang_bagian3.php _pasang_bagian4.php
C:/Users/user/tools/php83/php.exe -l pasang.php
echo "pasang.php: $(wc -c < pasang.php) byte, $(wc -l < pasang.php) baris"
