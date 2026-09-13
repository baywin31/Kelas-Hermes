"""acak-nama-skill.py — beri akhiran acak pada nama paket .zip.

Kenapa: .htaccess di folder unduhan/ sudah menolak akses langsung, tapi itu
satu lapisan saja. Kalau hosting memakai server yang mengabaikan sebagian
perintah (LiteSpeed pernah terbukti begitu di sini), paket berbayar bisa
diambil siapa pun yang menebak "hermes-agent.zip". Dengan akhiran acak, nama
berkasnya praktis tidak bisa ditebak, sehingga lapisan kedua ini tetap
melindungi walaupun lapisan pertama gagal.

Nama lama dipakai sebagai dasar supaya tetap terbaca admin:
    hermes-agent.zip  ->  hermes-agent-a91f2c.zip
"""
import os
import re
import secrets
import sys

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "unduhan")

if not os.path.isdir(DIR):
    print("folder unduhan/ tidak ada")
    sys.exit(1)

peta = {}
for nama in sorted(os.listdir(DIR)):
    if not nama.endswith(".zip"):
        continue
    # Berkas yang sudah berakhiran acak dilewati supaya tidak menumpuk.
    if re.search(r"-[0-9a-f]{6}\.zip$", nama):
        print(f"  lewat  {nama} (sudah acak)")
        continue
    baru = nama[:-4] + "-" + secrets.token_hex(3) + ".zip"
    os.rename(os.path.join(DIR, nama), os.path.join(DIR, baru))
    peta[nama] = baru
    print(f"  ubah   {nama}  →  {baru}")

print()
for lama, baru in peta.items():
    print(f"{lama}={baru}")
