"""sajikan.py — server berkas statis MULTI-THREAD untuk folder pratinjau.

Kenapa tidak pakai `php -S` seperti biasa: server bawaan PHP melayani satu
permintaan pada satu waktu. Browser membuka beberapa koneksi sekaligus untuk
CSS/JS, jadi server itu tersangkut menunggu dirinya sendiri dan browser
menyerah dengan "timeout" — padahal halamannya sehat. Di Windows, PHP juga
tidak mendukung PHP_CLI_SERVER_WORKERS.

http.server bawaan Python memakai ThreadingHTTPServer, jadi beberapa berkas
bisa dilayani bersamaan. Ini hanya untuk melihat pratinjau di mesin sendiri.
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8817
DIR = sys.argv[2] if len(sys.argv) > 2 else "pratinjau"


class Diam(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)

    def log_message(self, *a):
        pass  # jangan banjiri terminal


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("127.0.0.1", PORT), Diam) as httpd:
    print(f"pratinjau disajikan di http://127.0.0.1:{PORT}/  (folder: {DIR})")
    httpd.serve_forever()
