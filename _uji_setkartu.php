<?php
// _uji_setkartu.php — HANYA UJI LOKAL. Tulis materi contoh yang memakai SEMUA
// bentuk baru (kartu section, sub-kartu, callout :::, tabel, checklist, blok
// kode, HTML mentah) ke satu Bagian, supaya uji HTTP bisa memeriksa hasil
// render di halaman sungguhan — bukan cuma menebak dari kode.
// Berkas berawalan _uji_ tidak pernah ikut ke paket pembeli.
declare(strict_types=1);
require __DIR__ . '/_boot.php';

header('Content-Type: text/plain; charset=utf-8');

$b = max(1, (int)($_GET['b'] ?? 2));

$md = <<<'MD'
## Apa yang kita kerjakan di Bagian ini

Paragraf pembuka dengan **tebal**, `kode`, dan [tautan](https://example.com).

:::hasil
Di akhir bagian ini kamu punya satu hal yang jalan, bukan cuma paham teorinya.
:::

:::awas
Jangan lewati langkah kedua. Ini kesalahan yang paling sering bikin gagal.
:::

### Langkah rinci

1. Langkah pertama
2. Langkah kedua
3. Langkah ketiga

- [ ] belum dikerjakan
- [x] sudah dikerjakan

| Hal | Isinya |
|---|---|
| Memory | fakta yang tetap |
| Skill | urutan langkah |

```bash
echo "perintah panjang yang tidak perlu diketik ulang"
```

<script>alert(1)</script>

## Penutup

Kalimat penutup.
MD;

$st = db()->prepare('UPDATE ' . t('content') . ' SET isi_md = ? WHERE urutan = ?');
$st->execute([$md, $b]);

$ck = db()->prepare('SELECT judul FROM ' . t('content') . ' WHERE urutan = ?');
$ck->execute([$b]);
$judul = $ck->fetchColumn();

echo $judul === false
    ? "GAGAL: Bagian $b tidak ada\n"
    : "OK Bagian $b: $judul\nmateri contoh terpasang (" . strlen($md) . " byte)\n";
