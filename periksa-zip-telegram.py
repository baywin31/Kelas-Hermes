#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""periksa-zip-telegram.py — periksa 4 paket skill Telegram SEBELUM dikirim.

Diperiksa tiga hal, dari yang paling berbahaya:
  1. Ada berkas kredensial yang ikut? (nama .ftp/.cpanel/_config.php/.env/...)
  2. Ada NILAI rahasia asli yang ikut? Dibandingkan dengan nilai sungguhan
     milik proyek ini — bukan dengan pola. Mencocokkan pola pernah salah dua
     kali: buang isi skill contoh, lalu buang skill penting.
  3. Ada nilai yang mirip rahasia tapi bukan? Ditandai supaya bisa diperiksa
     manusia, bukan langsung dibuang.
"""
import os
import re
import zipfile

HOME = os.path.expanduser("~")
DL = os.path.join(HOME, "Downloads")
APP = os.path.dirname(os.path.abspath(__file__))

# --- Nilai rahasia ASLI: dibaca dari berkas konfigurasi lokal (tidak dicetak) ---
NILAI = []
for f in ("_config.local.php", "_config.php", ".ftp", ".ftp2", ".cpanel"):
    p = os.path.join(APP, f)
    if not os.path.exists(p):
        continue
    try:
        t = open(p, encoding="utf-8", errors="replace").read()
    except Exception:
        continue
    # Ambil semua nilai dalam tanda kutip yang panjangnya >= 8.
    for m in re.finditer(r"""['"]([^'"\s]{8,})['"]""", t):
        v = m.group(1)
        # Buang yang jelas bukan rahasia (nama host, jalur, nama kolom).
        if re.match(r"^(https?://|/|C:|\.\.|[\w.-]+\.(com|id|net|php|css|js|md))", v, re.I):
            continue
        if v.lower() in ("localhost", "utf8mb4", "utf8"):
            continue
        NILAI.append(v)

# Nilai yang memang boleh muncul (host lokal, jalur kerja, nama tabel).
AMAN = re.compile(
    r"(localhost|127\.0\.0\.1|0\.0\.0\.0|:8813|:3399|C:/Users|C:\\\\Users|"
    r"jurag139_|juraganprompt\.biz\.id|kd-|ms-playwright|hermes|node_modules)", re.I)

NAMA_TERLARANG = re.compile(
    r"(^|/)(\.ftp\d*|\.cpanel|_config\.php|_config\.local\.php|\.env|"
    r"credentials?\.json|token\.json|id_rsa.*|\.gh-pat|\.netrc)$", re.I)

# Nilai contoh yang SERING muncul di dokumentasi skill. Ini placeholder, bukan
# rahasia: "USER_PROVIDED_TOKEN" dan pola angka-berurut seperti
# "123456789:ABCdefGHI..." adalah contoh resmi Telegram di dokumentasi.
# Tanpa pengecualian ini alat melapor PERIKSA palsu (terbukti: 5 temuan,
# 5-nya contoh dokumentasi). Aturan: kalau alat dan hasil berbeda pendapat,
# alatnya yang salah sampai terbukti bener.
CONTOH = re.compile(
    r"^(USER_PROVIDED\w*|YOUR_\w+|MY_\w+|XXX+|\.\.\.|"
    r"123456789:ABC\w*|123456:ABC[\w-]*|"
    r"[A-Za-z]*EXAMPLE[A-Za-z]*|CONTOH\w*|placeholder\w*)$", re.I)

CURIGA = re.compile(
    r"(api[_-]?key|secret|passwd|password|bot[_-]?token|access[_-]?token)"
    r"\s*[:=]\s*['\"]?(?!\s*['\"]?(?:xxx|yyy|\*\*\*|CONTOH|EXAMPLE|<|\[|your|YOUR|"
    r"\$|\{|place|here|\.\.\.))([A-Za-z0-9_\-:]{8,})", re.I)

berkas = sorted(f for f in os.listdir(DL) if f.startswith("Skill-") and f.endswith(".zip"))
if not berkas:
    print("tidak ada paket Skill-*.zip di Downloads")
    raise SystemExit(1)

gagal = 0
for b in berkas:
    penuh = os.path.join(DL, b)
    print("=" * 70)
    print("%s   (%.1f KB)" % (b, os.path.getsize(penuh) / 1024.0))
    print("=" * 70)
    with zipfile.ZipFile(penuh) as z:
        isi = z.namelist()
        masalah = []
        # (1) nama berkas terlarang
        for n in isi:
            if NAMA_TERLARANG.search(n):
                masalah.append("BERKAS TERLARANG: " + n)
        # (2) & (3) periksa nilai di dalam isi
        for n in isi:
            if n.endswith("/"):
                continue
            try:
                t = z.read(n).decode("utf-8", "replace")
            except Exception:
                continue
            for v in NILAI:
                if v in t and not AMAN.search(v):
                    masalah.append("NILAI RAHASIA di %s: %s" % (n, v[:12] + "…"))
            for m in CURIGA.finditer(t):
                nilai = m.group(2)
                if CONTOH.match(nilai):
                    continue          # placeholder dokumentasi, bukan rahasia
                kutip = " ".join(t[max(0, m.start() - 60):m.end() + 20].split())
                if not AMAN.search(kutip):
                    masalah.append("CURIGA di %s: %s" % (n, kutip[-80:]))
        print("  berkas: %d" % len(isi))
        for n in isi:
            print("    -", n)
        if masalah:
            gagal += 1
            print("  HASIL: PERIKSA")
            for m in dict.fromkeys(masalah):
                print("    !", m)
        else:
            print("  HASIL: AMAN")

print()
print("=" * 70)
print("paket bermasalah: %d dari %d" % (gagal, len(berkas)))
print("=" * 70)
raise SystemExit(1 if gagal else 0)
