#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""cari-skill-telegram.py — daftar SEMUA skill yang benar-benar berhubungan
dengan Telegram, di seluruh pemasangan Hermes (semua profil + instalasi inti).

Kenapa skrip dan bukan grep berantai: jumlah SKILL.md ratusan dan grep per
berkas lewat bash menghabiskan waktu >7 menit lalu timeout. Python membaca
semuanya dalam satu jalan.

Dua tingkat bukti, dipisah supaya tidak salah golong:
  INTI  = "telegram" muncul >= 5 kali, ATAU ada di nama/deskripsi skill.
          Ini skill yang memang MENGERJAKAN sesuatu dengan Telegram.
  SEBUT = cuma disebut sekilas (1-4 kali) — biasanya daftar platform.
"""
import os
import re
import sys

AKAR = os.path.expanduser("~") + "/AppData/Local/hermes"
LEWATI = ("node_modules", "__pycache__", ".git", "site-packages")

# Nama skill yang PANTAS dikirim walau jumlah sebutannya sedikit, karena
# pokok bahasannya memang Telegram.
NAMA_PANTAS = ("telegram",)

inti, sebut = [], []
for a, d, n in os.walk(AKAR):
    d[:] = [x for x in d if x not in LEWATI]
    if "SKILL.md" not in n:
        continue
    f = os.path.join(a, "SKILL.md")
    try:
        t = open(f, encoding="utf-8", errors="replace").read()
    except Exception:
        continue
    jum = len(re.findall(r"telegram", t, re.I))
    if not jum:
        continue
    butir = os.path.dirname(f).replace(AKAR + os.sep, "").replace("\\", "/")
    nama = os.path.basename(os.path.dirname(f)).lower()
    # Judul + deskripsi frontmatter, untuk menilai pokok bahasan.
    kepala = "\n".join(t.splitlines()[:14])
    pantas = any(k in nama for k in NAMA_PANTAS) or \
             bool(re.search(r"^(description|name):.*telegram", kepala, re.I | re.M))
    (inti if (jum >= 5 or pantas) else sebut).append((jum, butir))

print("=" * 66)
print("SKILL INTI (memang mengerjakan hal Telegram)")
print("=" * 66)
for jum, butir in sorted(inti, reverse=True):
    print("%3d x  %s" % (jum, butir))

print()
print("=" * 66)
print("HANYA MENYEBUT (bukan pokok bahasan)")
print("=" * 66)
for jum, butir in sorted(sebut, reverse=True)[:15]:
    print("%3d x  %s" % (jum, butir))

# Ringkas: skill inti UNIK (banyak profil punya salinan yang sama).
unik = sorted({b.split("/skills/")[-1] for _, b in inti})
print()
print("=" * 66)
print("SKILL INTI UNIK: %d" % len(unik))
print("=" * 66)
for u in unik:
    print(" *", u)
