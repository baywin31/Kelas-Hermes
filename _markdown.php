<?php
// _markdown.php — konverter Markdown minimal + sanitasi.
// Ditulis tangan supaya tidak butuh Composer (hosting tanpa akses SSH).
// Strategi: escape SELURUH HTML dulu, baru bangun tag dari sintaks markdown.
// Konsekuensi: HTML mentah dari admin TIDAK dieksekusi — ini disengaja,
// jadi <script> atau onerror= mustahil lolos.

declare(strict_types=1);

require_once __DIR__ . '/_komponen.php';

/**
 * Ubah markdown jadi HTML yang sudah aman.
 *
 * $kartu = true  → tampilan materi: setiap "##" jadi kartu section sendiri,
 *                  "###" jadi sub-kartu, blok kode dapat tombol salin.
 * $kartu = false → tampilan datar. Dipakai untuk isi di DALAM kartu (callout)
 *                  supaya tidak ada kartu di dalam kartu, dan untuk versi cetak.
 */
function md_to_html(string $md, bool $kartu = true): string
{
    $md = str_replace("\r\n", "\n", $md);

    // Simpan blok kode dulu supaya isinya tidak diproses aturan lain.
    $blocks = [];
    $md = preg_replace_callback('/```([a-zA-Z0-9_-]*)\n(.*?)```/s', function ($m) use (&$blocks, $kartu) {
        $i = count($blocks);
        $blocks[$i] = $kartu
            ? komp_kode($m[1], rtrim($m[2], "\n"))
            : '<pre><code>' . htmlspecialchars($m[2], ENT_QUOTES, 'UTF-8') . '</code></pre>';
        return "\x00BLOCK{$i}\x00";
    }, $md) ?? $md;

    // Kartu panggilan:
    //   :::tips Judul opsional
    //   isi markdown biasa
    //   :::
    // Diproses sebelum escape, dan isinya dikonversi ulang lewat md_to_html()
    // mode datar — jadi di dalam callout tetap boleh ada daftar, tebal, tautan,
    // tapi tidak ada kartu bersarang.
    $md = preg_replace_callback('~^:::[ \t]*([a-z]+)[ \t]*([^\n]*)\n(.*?)\n:::[ \t]*$~ms', function ($m) use (&$blocks, $kartu) {
        $isi = md_to_html($m[3], false);
        $i   = count($blocks);
        $blocks[$i] = $kartu
            ? komp_callout($m[1], $m[2], $isi)
            : '<blockquote>' . $isi . '</blockquote>';
        return "\x00BLOCK{$i}\x00";
    }, $md) ?? $md;

    // Baris video: "@video <url>" (boleh diikuti judul).
    // Diproses SEBELUM escape global, sama seperti blok kode, supaya URL-nya
    // masih utuh (& tidak berubah jadi &amp;). Yang disisipkan ke HTML tetap
    // hanya ID hasil saringan yt_id(), bukan teks dari admin.
    $md = preg_replace_callback('/^@video\s+(\S+)[ \t]*(.*)$/mi', function ($m) use (&$blocks) {
        $judul = trim($m[2]) !== '' ? trim($m[2]) : 'Video tutorial';
        $html  = yt_embed($m[1], $judul);
        if ($html === '') {
            // Bukan tautan YouTube yang dikenal — jangan diam-diam hilang,
            // tampilkan sebagai tautan biasa supaya admin sadar.
            return $m[0];
        }
        $i = count($blocks);
        $blocks[$i] = $html;
        return "\x00BLOCK{$i}\x00";
    }, $md) ?? $md;

    // Gambar: ![keterangan](url). Diproses di tahap blok, bukan di md_inline(),
    // karena dua alasan:
    //  1. URL-nya masih utuh di sini (belum jadi &amp;), jadi bisa disaring benar.
    //  2. Pola tautan [teks](url) di md_inline() akan ikut menangkap bagian
    //     [alt](url) dari ![alt](url) dan mengubahnya jadi tautan biasa.
    //     Menyelesaikannya di sini membuat pola tautan tidak perlu lookbehind.
    // Baris yang HANYA berisi gambar jadi <figure> dengan keterangan di bawah.
    $md = preg_replace_callback('/^!\[([^\]]*)\]\(([^)\s]+)\)[ \t]*$/m', function ($m) use (&$blocks) {
        $html = img_html($m[2], $m[1], true);
        if ($html === '') return $m[0];
        $i = count($blocks);
        $blocks[$i] = $html;
        return "\x00BLOCK{$i}\x00";
    }, $md) ?? $md;

    // Gambar di tengah kalimat: tanpa figure, cukup <img>.
    $md = preg_replace_callback('/!\[([^\]]*)\]\(([^)\s]+)\)/', function ($m) use (&$blocks) {
        $html = img_html($m[2], $m[1], false);
        if ($html === '') return $m[0];
        $i = count($blocks);
        $blocks[$i] = $html;
        return "\x00BLOCK{$i}\x00";
    }, $md) ?? $md;

    // Semua sisanya di-escape total.
    $md = htmlspecialchars($md, ENT_QUOTES, 'UTF-8');

    $out    = [];
    $list   = null;  // 'ul' | 'ol' | 'ceklis' | null
    $sec    = false; // kartu section (##) sedang terbuka
    $sub    = false; // sub-kartu (###) sedang terbuka
    $sec_no = 0;
    $lines  = explode("\n", $md);
    $n      = count($lines);

    // Urutan penutupan penting: daftar ditutup sebelum sub-kartu, sub-kartu
    // sebelum section. Kalau tidak, tag-nya bersarang silang dan tata letak
    // rusak di browser.
    $tutup_list = function () use (&$out, &$list) {
        if ($list !== null) {
            $out[] = $list === 'ol' ? '</ol>' : '</ul>';
            $list  = null;
        }
    };
    $tutup_sub = function () use (&$out, &$sub, $tutup_list) {
        $tutup_list();
        if ($sub) { $out[] = komp_sub_tutup(); $sub = false; }
    };
    $tutup_sec = function () use (&$out, &$sec, $tutup_sub) {
        $tutup_sub();
        if ($sec) { $out[] = komp_section_tutup(); $sec = false; }
    };

    for ($i = 0; $i < $n; $i++) {
        // PENTING: trim() bawaan PHP ikut membuang byte NUL ("\0"), sedangkan
        // penanda blok memakai NUL sebagai pagar (\x00BLOCK0\x00). Kalau
        // dipakai trim() biasa, pagarnya hilang → penanda tidak dikenali lalu
        // dicetak apa adanya sebagai teks "BLOCK0". Daftar karakter di sini
        // sengaja tidak memuat \0.
        $trim = trim($lines[$i], " \t\r\n\v\f");

        if (str_starts_with($trim, "\x00BLOCK")) {
            $tutup_list();
            $out[] = $trim;
            continue;
        }

        if ($trim === '') {
            $tutup_list();
            continue;
        }

        // Heading
        if (preg_match('/^(#{1,4})\s+(.*)$/', $trim, $m)) {
            $lv  = strlen($m[1]);
            $txt = md_inline($m[2]);
            $id  = md_slug($m[2]);

            if ($kartu && $lv <= 2) {
                $tutup_sec();
                $out[] = komp_section_buka(++$sec_no, $id, $txt);
                $sec   = true;
                continue;
            }
            if ($kartu && $lv === 3) {
                $tutup_sub();
                $out[] = komp_sub_buka($id, $txt);
                $sub   = true;
                continue;
            }
            $tutup_list();
            $out[] = '<h' . min($lv + 1, 5) . ' id="' . $id . '">' . $txt . '</h' . min($lv + 1, 5) . '>';
            continue;
        }

        // Tabel: baris berawalan "|" dengan baris pemisah |---|---| di bawahnya.
        // Tanpa ini, tabel di materi tampil sebagai paragraf penuh tanda pipa.
        if ($trim[0] === '|' && $i + 1 < $n
            && preg_match('/^\|[\s:|-]+\|$/', trim($lines[$i + 1], " \t\r\n\v\f"))) {
            $tutup_list();
            $baris = [];
            $j     = $i;
            while ($j < $n) {
                $t = trim($lines[$j], " \t\r\n\v\f");
                if ($t === '' || $t[0] !== '|') break;
                $baris[] = $t;
                $j++;
            }
            $out[] = md_tabel($baris, $kartu);
            $i     = $j - 1;
            continue;
        }

        // Garis pemisah
        if (preg_match('/^(-{3,}|\*{3,})$/', $trim)) {
            $tutup_list();
            $out[] = $kartu
                ? '<hr class="my-7 border-0 border-t border-white/[.07]">'
                : '<hr>';
            continue;
        }

        // Kutipan
        if (str_starts_with($trim, '&gt; ')) {
            $tutup_list();
            $out[] = '<blockquote>' . md_inline(substr($trim, 5)) . '</blockquote>';
            continue;
        }

        // Checklist "- [ ] ..." / "- [x] ...". Harus diperiksa SEBELUM daftar
        // biasa, karena polanya juga cocok dengan "- ".
        if (preg_match('/^[-*]\s+\[([ xX])\]\s*(.*)$/', $trim, $m)) {
            $sudah = strtolower($m[1]) === 'x';
            if ($list !== 'ceklis') {
                $tutup_list();
                $out[] = $kartu ? '<ul class="kd-ceklis m-0 list-none p-0">' : '<ul class="ceklis">';
                $list  = 'ceklis';
            }
            // Di mode datar (versi cetak) kotaknya dipakai karakter Unicode:
            // di kertas tidak ada CSS kartu, dan "[ ]" mentah terlihat seperti
            // salah ketik, bukan kotak centang.
            $out[] = $kartu
                ? komp_cek_item($sudah, md_inline($m[2]))
                : '<li>' . ($sudah ? '&#9745; ' : '&#9744; ') . md_inline($m[2]) . '</li>';
            continue;
        }

        // Daftar bernomor
        if (preg_match('/^\d+\.\s+(.*)$/', $trim, $m)) {
            if ($list !== 'ol') {
                $tutup_list();
                $out[] = '<ol>';
                $list  = 'ol';
            }
            $out[] = '<li>' . md_inline($m[1]) . '</li>';
            continue;
        }

        // Daftar biasa
        if (preg_match('/^[-*]\s+(.*)$/', $trim, $m)) {
            if ($list !== 'ul') {
                $tutup_list();
                $out[] = '<ul>';
                $list  = 'ul';
            }
            $out[] = '<li>' . md_inline($m[1]) . '</li>';
            continue;
        }

        // Paragraf
        $tutup_list();
        $out[] = '<p>' . md_inline($trim) . '</p>';
    }
    $tutup_sec();

    $html = implode("\n", $out);

    // Pasang kembali blok kode.
    $html = preg_replace_callback('/\x00BLOCK(\d+)\x00/', function ($m) use ($blocks) {
        return $blocks[(int)$m[1]] ?? '';
    }, $html) ?? $html;

    return $html;
}

/** Format inline: kode, bold, italic, link. Input sudah ter-escape. */
function md_inline(string $s): string
{
    // `kode`
    $s = preg_replace('/`([^`]+)`/', '<code>$1</code>', $s) ?? $s;
    // **tebal**
    $s = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $s) ?? $s;
    // *miring*
    $s = preg_replace('/(?<!\*)\*([^*]+)\*(?!\*)/', '<em>$1</em>', $s) ?? $s;

    // [teks](url) — HANYA http/https/mailto. Skema lain (javascript:, data:)
    // dibiarkan jadi teks biasa, jadi tidak bisa dipakai menyisipkan skrip.
    $s = preg_replace_callback('/\[([^\]]+)\]\(([^)\s]+)\)/', function ($m) {
        $url = $m[2];
        if (!preg_match('#^(https?://|mailto:)#i', $url)) {
            return $m[0];
        }
        return '<a href="' . $url . '" target="_blank" rel="noopener nofollow">' . $m[1] . '</a>';
    }, $s) ?? $s;

    return $s;
}

/**
 * Tabel markdown → <table>. Baris pertama = kepala.
 * Dibungkus div yang bisa digeser mendatar: di layar ponsel tabel 4 kolom
 * tidak muat, dan tanpa ini halamannya yang ikut melebar (rusak semua).
 */
function md_tabel(array $baris, bool $kartu = true): string
{
    $pecah = function (string $s): array {
        $s = trim($s);
        $s = preg_replace('/^\||\|$/', '', $s) ?? $s;
        return array_map(fn($x) => md_inline(trim($x)), explode('|', $s));
    };

    $kepala = $pecah($baris[0]);
    $isi    = [];
    // Baris ke-2 adalah pemisah |---|---|, dilewati.
    for ($i = 2; $i < count($baris); $i++) {
        $isi[] = $pecah($baris[$i]);
    }

    $kls_th = $kartu
        ? ' class="border-b border-white/10 px-3 py-2.5 text-left text-[13px] font-semibold uppercase tracking-wide text-kd-muted"'
        : '';
    $kls_td = $kartu ? ' class="border-b border-white/[.06] px-3 py-2.5 align-top"' : '';

    $h = '<thead><tr>';
    foreach ($kepala as $c) $h .= '<th' . $kls_th . '>' . $c . '</th>';
    $h .= '</tr></thead>';

    $b = '<tbody>';
    foreach ($isi as $row) {
        $b .= '<tr>';
        foreach ($row as $c) $b .= '<td' . $kls_td . '>' . $c . '</td>';
        $b .= '</tr>';
    }
    $b .= '</tbody>';

    $tabel = '<table class="kd-tabel w-full border-collapse text-[14.5px]">' . $h . $b . '</table>';

    return $kartu
        ? '<div class="my-6 overflow-x-auto rounded-kd border border-white/[.07] bg-white/[.02]">' . $tabel . '</div>'
        : '<div class="tabel-geser">' . $tabel . '</div>';
}

/** Slug untuk anchor heading. */
function md_slug(string $s): string
{
    $s = strtolower(strip_tags($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim($s, '-') ?: 'bagian';
}

/**
 * Ambil ID video YouTube dari bentuk tautan apa pun.
 * Menerima: youtube.com/shorts/ID, watch?v=ID, youtu.be/ID, /embed/ID,
 * atau ID mentah. Balikan '' kalau bukan tautan YouTube — pemanggilnya
 * lalu membiarkan teks apa adanya, tidak memasang iframe rusak.
 */
function yt_id(string $url): string
{
    $url = trim($url);
    // Host wajib benar-benar YouTube. Pola lama cuma mencari teks
    // "youtube.com/shorts/" di mana saja, sehingga
    // https://evil.com/youtube.com/shorts/XXX ikut lolos. Di sini host
    // dipatok: awal string, atau tepat setelah skema/www.
    // Catatan: pembatas regex memakai ~ bukan #, karena pola ini mengandung
    // kelas [^#] (untuk melewati query string) — dengan pembatas # pola
    // terpotong di situ dan PHP melempar "Unknown modifier".
    $host = '(?:^|https?://)(?:www\.|m\.)?';
    if (preg_match('~' . $host . '(?:youtube\.com/(?:shorts/|embed/|live/|v/)|youtu\.be/)([A-Za-z0-9_-]{6,20})~i', $url, $m)) {
        return $m[1];
    }
    if (preg_match('~' . $host . 'youtube\.com/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,20})~i', $url, $m)) {
        return $m[1];
    }
    if (preg_match('~^[A-Za-z0-9_-]{11}$~', $url)) return $url;
    return '';
}

/**
 * Bingkai video responsif.
 * - Host dipaku ke youtube-nocookie.com: admin tidak bisa mengarahkan
 *   iframe ke tempat lain lewat CMS, dan cookie iklan tidak ditaruh
 *   sebelum member menekan play.
 * - Hanya ID (A-Z a-z 0-9 _ -) yang disisipkan, jadi mustahil kabur
 *   dari atribut src.
 * - Selalu disertai tautan biasa: kalau jaringan kantor memblokir
 *   YouTube embed atau halaman dicetak, member tetap punya jalan.
 */
function yt_embed(string $url, string $judul = 'Video tutorial'): string
{
    $id = yt_id($url);
    if ($id === '') return '';

    // Shorts itu video tegak; kalau dipaksa 16:9 gambarnya jadi kecil
    // di tengah dengan pita hitam lebar di kiri-kanan.
    $tegak = stripos($url, '/shorts/') !== false;
    $kelas = 'video-embed' . ($tegak ? ' tegak' : '');
    $src   = 'https://www.youtube-nocookie.com/embed/' . $id . '?rel=0';

    return '<div class="' . $kelas . '">'
        . '<iframe src="' . $src . '"'
        . ' title="' . htmlspecialchars($judul, ENT_QUOTES, 'UTF-8') . '"'
        . ' loading="lazy" referrerpolicy="strict-origin-when-cross-origin"'
        . ' allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"'
        . ' allowfullscreen></iframe></div>'
        . '<p class="video-cap small muted">'
        . '<a href="https://youtu.be/' . $id . '" target="_blank" rel="noopener">Buka video ini di YouTube</a>'
        . '</p>';
}

/**
 * Saring URL gambar. Balikan '' kalau tidak aman/tidak masuk akal, supaya
 * pemanggilnya membiarkan teks apa adanya (admin langsung sadar salah tulis).
 *
 * Yang diterima:
 *  - http:// dan https:// (gambar dari luar, mis. Imgur/Drive langsung)
 *  - jalur relatif di hosting sendiri: gambar/1.png, /member/gambar/1.png
 *
 * Yang ditolak, dan alasannya:
 *  - javascript:, vbscript:  → jelas percobaan menyisipkan skrip
 *  - data:                    → muat besar tersimpan di database materi dan
 *                               dipakai menyelundupkan SVG berisi skrip
 *  - //host/x.png             → skema mengikuti halaman; ditulis eksplisit saja
 *  - ada tanda kutip/kurung sudut → mustahil di URL sah, tanda ada yang
 *                               mencoba kabur dari atribut src
 */
function img_url_ok(string $url): string
{
    $url = trim($url);
    if ($url === '' || mb_strlen($url) > 500) return '';
    if (preg_match('/["\'<>\s]/', $url)) return '';
    if (str_starts_with($url, '//')) return '';

    if (preg_match('~^https?://~i', $url)) return $url;

    // Jalur relatif: tidak boleh ada skema apa pun.
    if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $url)) return '';
    return $url;
}

/**
 * Bangun tag gambar.
 * - Hanya URL hasil saringan img_url_ok() yang masuk ke src.
 * - alt selalu diisi: pembaca layar butuh, dan kalau gambarnya gagal dimuat
 *   member masih tahu itu gambar apa. Kosongkan hanya kalau memang hiasan.
 * - loading="lazy": materi bisa memuat banyak tangkapan layar; jangan sampai
 *   halaman lambat terbuka.
 * - $blok = true dipakai kalau barisnya hanya berisi gambar → dibungkus
 *   <figure> dan keterangannya dicetak di bawah gambar.
 */
function img_html(string $url, string $alt = '', bool $blok = false): string
{
    $src = img_url_ok($url);
    if ($src === '') return '';

    $e    = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $alt  = trim($alt);
    $tag  = '<img src="' . $e($src) . '" alt="' . $e($alt) . '"'
          . ' loading="lazy" decoding="async">';

    if (!$blok) return $tag;

    $fig = '<figure class="gambar">' . $tag;
    if ($alt !== '') {
        $fig .= '<figcaption class="small muted">' . $e($alt) . '</figcaption>';
    }
    return $fig . '</figure>';
}

/** Kutipan singkat tanpa markup, untuk hasil pencarian. */
function md_excerpt(string $md, int $len = 160): string
{
    $s = preg_replace('/```.*?```/s', ' ', $md) ?? $md;
    // Baris @video adalah penanda, bukan isi bacaan — jangan sampai URL
    // panjang memakan habis kutipan hasil pencarian.
    $s = preg_replace('/^@video\s+\S+.*$/mi', ' ', $s) ?? $s;
    // Pagar callout ::: dibuang, tapi ISINYA dibiarkan — di situ justru sering
    // ada kalimat paling menarik dari materinya.
    $s = preg_replace('/^:::[ \t]*[a-z]*[ \t]*[^\n]*$/mi', ' ', $s) ?? $s;
    // Kotak centang: "- [ ]" / "- [x]" jangan jadi tanda kurung nyasar.
    $s = preg_replace('/^[-*]\s+\[[ xX]\]\s*/m', '', $s) ?? $s;
    // Gambar juga: yang berguna di hasil pencarian cuma keteranganya, bukan
    // URL-nya. Ambil teks di dalam ![...] lalu buang sisanya.
    $s = preg_replace('/!\[([^\]]*)\]\([^)\s]+\)/', '$1', $s) ?? $s;
    $s = preg_replace('/[#*`>\[\]()_|-]+/', ' ', $s) ?? $s;
    $s = trim(preg_replace('/\s+/', ' ', $s) ?? '');
    return mb_strlen($s) > $len ? mb_substr($s, 0, $len) . '…' : $s;
}

/** Daftar heading untuk sidebar materi. */
function md_toc(string $md): array
{
    $toc   = [];
    $dalam = false; // jangan ambil heading dari dalam blok kode
    foreach (explode("\n", str_replace("\r\n", "\n", $md)) as $line) {
        $t = trim($line);
        if (str_starts_with($t, '```')) { $dalam = !$dalam; continue; }
        if ($dalam) continue;
        if (preg_match('/^(#{1,3})\s+(.*)$/', $t, $m)) {
            $toc[] = ['level' => strlen($m[1]), 'text' => trim($m[2]), 'id' => md_slug($m[2])];
        }
    }
    return $toc;
}
