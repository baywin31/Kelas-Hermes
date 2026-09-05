/** tailwind.config.js — sumber gaya komponen materi.
 *
 * Kenapa dikompilasi di sini, bukan dipanggil dari CDN:
 * hosting bersama tidak punya Node, dan CDN Tailwind (play CDN) memasang
 * compiler 300KB di browser pembeli lalu melambatkan setiap halaman.
 * Jadi Tailwind dijalankan di mesin sendiri, hasilnya SATU berkas .css
 * statis yang diupload. Pembeli tidak perlu Node, npm, atau build apa pun.
 *
 * preflight DIMATIKAN: aplikasi ini sudah punya style.css yang teruji
 * (topbar, tombol, form, palet). Reset global Tailwind akan menimpanya.
 */
module.exports = {
  // Semua kelas dibangun di dalam berkas ini — Tailwind hanya perlu memindai
  // sumber tempat string kelas ditulis. Jalur relatif terhadap folder tw/.
  content: [
    '../_komponen.php',
    '../_markdown.php',
    '../*.php',
    '../../karyawan-digital-html/parts/*.js',
    '../../karyawan-digital-html/parts/*.html',
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Cermin dari token di style.css. Ditulis hex (bukan var()) supaya
        // pengubah transparansi Tailwind (mis. border-kd-line/40) bekerja.
        kd: {
          bg:     '#25282b',
          soft:   '#2b2f32',
          soft2:  '#31363a',
          fg:     '#f2f7fc',
          fg2:    '#cfdae5',
          muted:  '#94a3af',
          muted2: '#6d7883',
          accent: '#A4D8FF',
          accent2:'#BFE4FF',
          accent3:'#8CCBFA',
          ink:    '#22262a',
          // Garis pemisah: nilai rgba diambil dari --line di style.css supaya
          // dua sistem gaya ini tidak pernah menggambar garis dengan dua warna
          // berbeda di halaman yang sama.
          line:   'rgba(164,216,255,.14)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: { 'kd': '14px', 'kd-lg': '18px' },
      boxShadow: {
        // Kedalaman dibuat dari langkah cahaya, bukan bayangan hitam pekat —
        // itu bedanya panel mahal dan kotak abu-abu biasa di tema gelap.
        'kd':      '0 1px 0 0 rgba(255,255,255,.04) inset, 0 12px 32px -12px rgba(0,0,0,.6)',
        'kd-lift': '0 1px 0 0 rgba(255,255,255,.06) inset, 0 22px 48px -16px rgba(0,0,0,.7)',
        'kd-glow': '0 0 0 1px rgba(164,216,255,.22), 0 18px 50px -18px rgba(164,216,255,.25)',
      },
    },
  },
  plugins: [],
};
