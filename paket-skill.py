"""paket-skill.py — bungkus folder skill Hermes jadi .zip siap unduh.

Jalankan:  python paket-skill.py <nama-skill> [<nama-skill> ...]
Contoh:    python paket-skill.py autonomous-ai-agents/hermes-agent

Hasilnya masuk ke folder unduhan/ milik app member. Berkasnya TIDAK diakses
langsung dari web (ada .htaccess penolak) — member mengunduhnya lewat
unduh.php supaya login + gembok tier tetap berlaku.
"""
import os
import sys
import zipfile

SKILLS = os.path.expanduser(
    "~/AppData/Local/hermes/profiles/karyawandigital-app/skills"
)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "unduhan")


def bungkus(rel: str) -> str:
    src = os.path.join(SKILLS, rel)
    if not os.path.isdir(src):
        print(f"  LEWAT  {rel} (folder tidak ada)")
        return ""

    nama = rel.split("/")[-1]
    os.makedirs(OUT, exist_ok=True)
    tuju = os.path.join(OUT, nama + ".zip")

    jumlah = 0
    with zipfile.ZipFile(tuju, "w", zipfile.ZIP_DEFLATED) as z:
        for akar, _, berkas in os.walk(src):
            for f in berkas:
                penuh = os.path.join(akar, f)
                # Simpan dengan nama folder skill di depan supaya hasil
                # ekstrak langsung berupa folder <nama-skill>/SKILL.md —
                # itu bentuk yang diterima Hermes saat diimport.
                dalam = os.path.join(nama, os.path.relpath(penuh, src))
                z.write(penuh, dalam)
                jumlah += 1

    print(f"  OK     {nama}.zip  {jumlah} berkas  {os.path.getsize(tuju):,} B")
    return tuju


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    print(f"=== Bungkus ke {OUT} ===")
    for arg in sys.argv[1:]:
        bungkus(arg)
