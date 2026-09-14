#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""konteks-telegram.py — tampilkan KALIMAT tempat kata "telegram" muncul di
setiap skill profil ini.

Kenapa: jumlah sebutan saja menyesatkan. Sebuah skill bisa menyebut Telegram
40 kali tapi cuma sebagai contoh platform (bukan pokok bahasan), sementara
skill lain menyebut 4 kali justru di langkah-langkah pentingnya. Kalimatnya
yang menentukan, bukan angkanya.
"""
import os
import re

AKAR = os.path.expanduser("~") + "/AppData/Local/hermes/profiles/karyawandigital-app/skills"
LEWATI = {"node_modules", "__pycache__", ".git"}

for a, d, n in os.walk(AKAR):
    d[:] = [x for x in d if x not in LEWATI]
    if "SKILL.md" not in n:
        continue
    f = os.path.join(a, "SKILL.md")
    t = open(f, encoding="utf-8", errors="replace").read()
    if not re.search(r"telegram", t, re.I):
        continue
    rel = os.path.dirname(f).replace(AKAR + os.sep, "").replace("\\", "/")
    jum = len(re.findall(r"telegram", t, re.I))
    print("=" * 72)
    print("%s   (%d sebutan)" % (rel, jum))
    print("=" * 72)
    # Ambil potongan kalimat di sekitar tiap sebutan, buang yang berulang.
    dilihat = set()
    for m in re.finditer(r"telegram", t, re.I):
        awal = max(0, m.start() - 110)
        akhir = min(len(t), m.end() + 110)
        kutip = " ".join(t[awal:akhir].split())
        kunci = kutip[:60]
        if kunci in dilihat:
            continue
        dilihat.add(kunci)
        print("   ..." + kutip + "...")
        if len(dilihat) >= 4:
            break
    print()
