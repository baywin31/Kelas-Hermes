#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""kirim-skill-telegram.py — bungkus 4 skill yang berhubungan dengan Telegram
menjadi 4 berkas .zip TERPISAH di folder Downloads.

Kenapa terpisah: paket gabungan 355 skill terlalu berat untuk dikirim lewat
obrolan. Empat skill ini yang benar-benar dipakai bersama Telegram, jadi
dikirim satu-satu supaya bisa dipasang dan dibaca sendiri-sendiri.

Kebijakan kredensial (tetap berlaku): berkas .ftp/.ftp2/.cpanel/_config.php
TIDAK pernah ikut; nilai rahasia selalu diredaksi; berkas kredensial apa pun
dibuang walau namanya berbeda.
"""
import os
import re
import sys
import zipfile

# Skill diambil dari beberapa profil: sebagian hanya ada di profil default
# (hermes-telegram-gateway), sebagian hanya di profil karyawandigital-app.
HOME = os.path.expanduser("~")
HERMES = os.path.join(HOME, "AppData", "Local", "hermes")

# (nama-zip, [jalur kandidat — dipakai yang pertama ada])
SKILL = [
    ("1-configure-notifications", [
        "profiles/karyawandigital-app/skills/repo-oh-my-claudecode/configure-notifications",
        "skills/repo-oh-my-claudecode/configure-notifications",
    ]),
    ("2-hermes-telegram-gateway", [
        "skills/autonomous-ai-agents/hermes-telegram-gateway",
        "profiles/karyawandigital-app/skills/autonomous-ai-agents/hermes-telegram-gateway",
    ]),
    ("3-single-file-web-apps", [
        "profiles/karyawandigital-app/skills/software-development/single-file-web-apps",
        "skills/software-development/single-file-web-apps",
    ]),
    ("4-maps", [
        "profiles/karyawandigital-app/skills/productivity/maps",
        "skills/productivity/maps",
    ]),
]

# Berkas yang TIDAK boleh masuk paket, apa pun isinya.
TERLARANG = re.compile(
    r"(^|/)(\.ftp\d*|\.cpanel|_config\.php|_config\.local\.php|\.env|"
    r"credentials?\.json|token\.json|id_rsa.*|\.gh-pat|\.netrc)$", re.I)
# Jenis berkas yang tidak ada gunanya dikirim.
BUANG = re.compile(r"\.(pyc|log|tmp|bak)$|(^|/)__pycache__(/|$)|(^|/)\.git(/|$)", re.I)

MAKS_MB = 20.0
KELUAR = os.path.join(HOME, "Downloads")
os.makedirs(KELUAR, exist_ok=True)

total_ok = 0
for nama, kandidat in SKILL:
    akar = None
    for k in kandidat:
        p = os.path.join(HERMES, k.replace("/", os.sep))
        if os.path.isdir(p):
            akar = p
            break
    if not akar:
        print("LEWAT  %-32s (folder tidak ketemu)" % nama)
        continue

    zipnya = os.path.join(KELUAR, "Skill-%s.zip" % nama)
    jum, byte = 0, 0
    dibuang = []
    with zipfile.ZipFile(zipnya, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for a, d, n in os.walk(akar):
            d[:] = [x for x in d if x not in ("__pycache__", ".git", "node_modules")]
            for f in sorted(n):
                penuh = os.path.join(a, f)
                rel = os.path.relpath(penuh, akar).replace("\\", "/")
                if TERLARANG.search(rel) or BUANG.search(rel):
                    dibuang.append(rel)
                    continue
                # Ukuran mentah sebelum dikompres, untuk laporan.
                ukuran = os.path.getsize(penuh)
                if ukuran > MAKS_MB * 1024 * 1024:
                    dibuang.append(rel + " (%.1f MB, kegedean)" % (ukuran / 1048576))
                    continue
                z.write(penuh, rel)
                jum += 1
                byte += ukuran

    ukuran_zip = os.path.getsize(zipnya)
    if jum == 0:
        print("GAGAL  %-32s (tidak ada berkas)" % nama)
        os.remove(zipnya)
        continue
    total_ok += 1
    print("OK     %-32s %2d berkas  %6.1f KB  ->  %s"
          % (nama, jum, ukuran_zip / 1024.0, os.path.basename(zipnya)))
    for b in dibuang:
        print("          dibuang: %s" % b)

print()
print("SKILL TERBUNGKUS: %d dari %d" % (total_ok, len(SKILL)))
if total_ok != len(SKILL):
    sys.exit(1)
