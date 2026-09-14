#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""semua-skill-telegram.py — daftar SETIAP folder skill yang namanya
mengandung telegram / whatsapp / gateway, di seluruh pemasangan Hermes.

Kenapa: skill Telegram unik tidak hanya ada di profil ini. Pencarian awal
hanya menyisir satu profil sehingga tampak cuma 1 skill, padahal ada
'hermes-telegram-gateway' di profil default. Skrip ini menyisir semuanya
sekaligus, tanpa memanggil grep ratusan kali (penyebab timeout).
"""
import os

AKAR = os.path.expanduser("~") + "/AppData/Local/hermes"
KATA = ("telegram", "whatsapp", "gateway")
LEWATI = {"node_modules", "__pycache__", ".git", "site-packages", "venv", ".venv"}

temu = set()
for a, d, n in os.walk(AKAR):
    d[:] = [x for x in d if x not in LEWATI]
    for x in d:
        if any(k in x.lower() for k in KATA):
            rel = os.path.join(a, x).replace(AKAR + os.sep, "").replace("\\", "/")
            # Hanya folder yang berisi SKILL.md (skill sungguhan, bukan kode inti).
            if os.path.exists(os.path.join(a, x, "SKILL.md")):
                temu.add(rel)

print("FOLDER SKILL terkait telegram/whatsapp/gateway: %d" % len(temu))
print("=" * 70)
for t in sorted(temu):
    print(" ", t)

print()
print("NAMA S K I L L UNIK (tanpa jalur profil):")
print("=" * 70)
unik = sorted({t.split("/skills/")[-1] for t in temu})
for u in unik:
    print("  *", u)
