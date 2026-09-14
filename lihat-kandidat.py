#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""lihat-kandidat.py — tampilkan judul + deskripsi skill kandidat Telegram.

Kenapa: sebelum membungkus apa pun, pastikan skill yang dipilih memang
berpokok bahasan Telegram — bukan cuma menyebut kata itu di daftar platform.
Deskripsi frontmatter adalah bukti paling jujur soal isi sebuah skill.
"""
import os

AKAR = os.path.expanduser("~") + "/AppData/Local/hermes"
KANDIDAT = [
    "skills/autonomous-ai-agents/hermes-telegram-gateway",
    "skills/repo-oh-my-claudecode/configure-notifications",
    "skills/autonomous-ai-agents/hermes-whatsapp-gateway",
    "skills/autonomous-ai-agents/hermes-named-agent-product",
    "skills/autonomous-ai-agents/hermes-agent",
    "skills/software-development/single-file-web-apps",
]

for k in KANDIDAT:
    f = os.path.join(AKAR, k, "SKILL.md")
    print("=" * 70)
    if not os.path.exists(f):
        print("TIDAK ADA:", k)
        continue
    t = open(f, encoding="utf-8", errors="replace").read()
    baris = t.splitlines()
    ukuran = os.path.getsize(f)
    berkas = sum(len(n) for _, _, n in os.walk(os.path.dirname(f)))
    print("%s   (%d byte, %d baris, %d berkas)" % (k, ukuran, len(baris), berkas))
    print("-" * 70)
    # Ambil bagian frontmatter (name/description/tags) + judul H1.
    for b in baris[:16]:
        print("   " + b)
    print()