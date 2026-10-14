# Website PIGGI

Website **PIGGI (Pusat Informasi Geologi Geopark Ijen)**: web statis bilingual ID/EN untuk menambah kunjungan, memudahkan akses informasi, dan reservasi.

> Status: **Fase 2 (7 halaman statis) selesai.** Halaman game, tiket, dan staf masih sementara ("Sedang disiapkan"); reservasi online menyusul di Fase 3.

---

## Prasyarat

| Alat | Untuk apa | Wajib? |
| --- | --- | --- |
| [VS Code](https://code.visualstudio.com/) | Menyunting kode | Ya |
| [Node.js LTS](https://nodejs.org/) | Menjalankan `build.js` | Hanya yang mengubah `templates/` atau `content/` |
| [Git](https://git-scm.com/) + akun GitHub | Menyimpan versi & hosting | Ya (untuk deploy) |
| Akun Google lembaga | Apps Script + Sheet (fase 3) | Nanti |

Saat membuka folder ini, VS Code akan menawarkan ekstensi yang direkomendasikan (**Live Server**, **Prettier**, **EditorConfig**). Pilih *Install*.

## Menjalankan di komputer sendiri

1. Buka folder `piggi-web` di VS Code.
2. Tekan **Ctrl+Shift+B** (Mac: Cmd+Shift+B) → menjalankan task **Build**.
3. Klik **Go Live** di pojok kanan bawah (Live Server). Browser terbuka di `http://127.0.0.1:5500/` dan otomatis diarahkan ke `/id/` atau `/en/`.

Tanpa VS Code / Live Server:

```bash
node build.js
python -m http.server 8000     # lalu buka http://localhost:8000/
```

> Halaman tidak bisa dibuka dengan klik dua kali file HTML (`file://`), karena ES modules butuh server HTTP.

### Perintah build

| Perintah | Fungsi |
| --- | --- |
| `node build.js` / Ctrl+Shift+B | Bangun ulang `id/`, `en/`, `index.html`, `404.html`, `sitemap.xml`, `robots.txt` |
| `node build.js --check` / task **Check** | Validasi saja, tidak menulis file |
| `node build.js --base=/nama-repo/` | Timpa `basePath` (mis. untuk GitHub Pages) |
| `node build.js --rilis` | Seperti build, tetapi **gagal** bila masih ada penanda `[VERIFIKASI]` / `[ISI DARI PIGGI]` dll. Pakai sebelum rilis resmi. |

Build **gagal** (tidak menulis apa pun) bila:
- ada kunci teks yang hanya ada di `id.json` atau hanya di `en.json`;
- template memanggil kunci teks yang tidak ada;
- rute, aset, atau slug salah.

## ⚠️ Aturan penting

1. **Setelah mengubah `content/*.json` atau `templates/`, jalankan Build lagi sebelum commit.**
2. **Jangan menyunting folder `id/`, `en/`, `index.html`, `404.html`, `sitemap.xml`, `robots.txt`.** Semuanya hasil build dan akan tertimpa. (VS Code membuka `id/` dan `en/` sebagai *read-only*.)
3. Teks tampilan **hanya** di `content/id.json` dan `content/en.json`. Struktur kuncinya harus sama persis.
4. Desain (warna, font, jarak, sudut) **hanya** diubah di `css/tokens.css`.

## Mengubah sesuatu: di mana?

| Mau mengubah | Edit file |
| --- | --- |
| Teks apa pun | `content/id.json` + `content/en.json`, lalu Build |
| Warna, font, ukuran, jarak | `css/tokens.css` (tanpa build; cukup refresh) |
| Tata letak / komponen | `css/style.css` |
| Kerangka halaman | `templates/*.html`, lalu Build |
| Alamat, jam buka, kontak, nomor WA, Instagram, video Beranda | `data/info.json`, lalu Build |
| Isi tiap lantai & pos Paspor | `data/lantai.json`, lalu Build |
| Foto galeri | taruh file di `assets/images/galeri/`, daftar di `data/galeri.json`, lalu Build |
| Agenda | `data/agenda.json`, lalu Build |
| Lembar kerja sekolah | ganti PDF di `assets/pdf/` (nama file sama) |
| URL Apps Script, analitik | `js/config.js` |
| Alamat situs & basePath | `site.json`, lalu Build |

## Struktur folder

```
piggi-web/
├── build.js            generator halaman (Node, tanpa dependensi)
├── site.json           basePath, siteUrl, warna tema browser
├── templates/          kerangka HTML ({{kunci}} diisi dari content/)
├── content/            SEMUA teks (id.json, en.json)
├── css/tokens.css      SATU-SATUNYA tempat ganti desain
├── css/style.css       layout & komponen
├── js/                 ES modules (main, config, i18n, nav, …)
├── data/               data JSON (lantai, soal, dll. — fase 2 & 4)
├── assets/             gambar, ikon, PDF lembar kerja
├── apps-script/        kode Google Apps Script (fase 3)
├── id/  en/            HASIL BUILD — jangan diedit
└── .vscode/            setelan, task Build/Check, rekomendasi ekstensi
```

### Sintaks template (ringkas)

```
{{halaman.beranda.hero.judul}}        teks (otomatis di-escape)
{{route:kunjungi#reservasi}}          URL halaman sesuai bahasa
{{url:this.route}}                    URL dari data (mis. tombol CTA)
{{asset:css/style.css}}               URL aset + basePath + versi
{{aset:this.file}}                    URL aset yang path-nya dari data
{{tgl:this.tanggal}}                  tanggal yyyy-MM-dd → "20 November 2026"
{{uri:data.info.mapsQuery}}           teks di-encode untuk URL
{{data.info.alamat}}                  isi data/*.json; {"id","en"} otomatis pilih bahasa
{{@nomor}}  {{#if @first}}            nomor urut (1, 2, 3…) & item pertama dalam each
{{#each daftar}} {{this.x}} {{/each}}
{{#if x}} … {{else}} … {{/if}}
```

Kunci JSON berawalan `_` (mis. `_catatan`, `_verifikasi`) adalah catatan untuk manusia dan tidak tampil di situs.

## Deploy (ringkas)

**GitHub Pages:**
1. Push repo ke GitHub (hasil build `id/`, `en/`, dll. ikut di-commit).
2. Di `site.json`, isi `siteUrl` (mis. `https://akun.github.io`) dan `basePath` (mis. `/piggi-web/`), lalu Build.
3. GitHub → Settings → Pages → *Deploy from a branch* → `main` / root.

**Netlify:** `basePath` tetap `/`, isi `siteUrl` dengan domain Netlify, Build, lalu hubungkan repo (tanpa perintah build; folder publish: root).

---

## Keputusan & Asumsi

| # | Keputusan | Alasan |
| --- | --- | --- |
| 1 | `basePath` disimpan di **`site.json`**, disuntikkan build ke `<html data-base>`, lalu dibaca `config.js`. | Satu sumber untuk build dan runtime; spesifikasi menyebut `config.js`, tetapi build (Node) tidak bisa membaca modul browser dengan aman. |
| 2 | Halaman yang belum punya template otomatis memakai `templates/_stub.html` ("Sedang disiapkan"). | Menu, pengalih bahasa, dan hreflang bisa diuji sejak fase 1 tanpa tautan mati. |
| 3 | `index.html`, `404.html`, `robots.txt`, `sitemap.xml` **dihasilkan build**. | Butuh `basePath` & `siteUrl` yang benar. |
| 4 | Halaman `paspor`, `qr`, `escape`, `tiket`, `staf` diberi `noindex` dan tidak masuk sitemap. | Halaman game hanya relevan saat di PIGGI; `tiket` & `staf` bersifat pribadi/internal (spesifikasi mewajibkan `tiket` & `staf`, sisanya keputusan sederhana). |
| 5 | `staf` hanya dibangun dalam Bahasa Indonesia; kunci rutenya tetap ada di `en.json` agar struktur kunci identik. | Spesifikasi bagian 5. |
| 6 | Pilihan bahasa pengunjung disimpan di `localStorage` (`piggi.lang`) agar `/` langsung mengarah ke bahasa terakhir. | Pengalaman lebih baik bagi turis asing. |
| 7 | Font **Bricolage Grotesque** (judul) + **Atkinson Hyperlegible** (isi, mudah dibaca anak) lewat Google Fonts, `display=swap`. | Placeholder. Google Fonts mengirim IP pengunjung ke Google; bisa di-*self-host* nanti di `assets/fonts/`. |
| 8 | **Palet warna dan font masih placeholder** (basal, biru api, kuning belerang). | Belum ada identitas visual resmi. Kontras sudah dicek WCAG AA. |
| 9 | Tombol WhatsApp tersembunyi selama `config.whatsapp` kosong. | Mencegah tautan ke nomor palsu. |
| 10 | Tema gelap mengikuti setelan perangkat (`prefers-color-scheme`). | Spesifikasi bagian 4. |
| 11 | Data terstruktur (lantai, galeri, agenda, info) di `data/*.json` dengan teks dua bahasa `{"id","en"}`; dirender saat build (halaman tetap terbaca tanpa JavaScript), JS hanya menambah interaksi. | SEO, aksesibilitas, dan satu sumber data. |
| 12 | Nomor WhatsApp dipindah dari `config.js` ke `data/info.json` (disuntikkan ke `<html data-wa>`). | Satu tempat untuk semua kontak. |
| 13 | **Stasiun eksperimen (Coba Langsung) hanya teaser**: tidak menjelaskan prosedur maupun hasil. Bagian 5 & 6 konsep awal digabung. | Aturan keras #6. |
| 14 | Pembagian **bab per lantai di `lantai.json` masih contoh** (konsep hanya menyebut isi lantai 2). | Harus diganti sesuai kondisi asli. |
| 15 | Menu desktop memakai label pendek (`nav.pendek`), menu HP & footer memakai label lengkap. | Tujuh menu bahasa Indonesia tidak muat di satu baris pada 1280px. |
| 16 | Gambar galeri & lembar kerja PDF masih **placeholder**. | Menunggu foto resmi & materi dari PIGGI. |
| 17 | Video Beranda & peta Google dimuat hanya setelah diklik (facade). | Performa & privasi. |

## Data yang harus diminta ke PIGGI

- [ ] Nama resmi lembaga (ID & EN)
- [ ] Isi dan tema tiap lantai
- [ ] Jam buka, hari libur, kontak resmi, nomor WhatsApp, akun Instagram, alamat, koordinat
- [ ] Kapasitas per sesi dan pembagian sesi
- [ ] Tiket berbayar atau gratis
- [ ] Izin menempel QR dan menyiapkan properti escape room
- [ ] Staf penanggung jawab reservasi, game, dan konten
- [ ] Akun Google lembaga (sebaiknya Workspace) untuk Apps Script dan Sheet
- [ ] Verifikasi fakta konsep awal (luas, jumlah situs, tanggal, kutipan)
- [ ] Foto resmi ruang & koleksi beserta izin pakai
- [ ] Logo / identitas visual resmi (bila ada)

## Status fase

- [x] **Fase 1 — Fondasi:** setup VS Code, `build.js`, tokens, layout, nav, i18n, config, redirect bahasa
- [x] **Fase 2 — 7 halaman statis:** isi 7 menu, peta lantai interaktif, timeline, tab sekolah, FAQ, galeri + lightbox, embed lazy
- [ ] Fase 3 — Reservasi (Apps Script + kalender)
- [ ] Fase 4 — Game & halaman staf
- [ ] Fase 5 — Konten live, analitik, SEO
- [ ] Fase 6 — QA & dokumentasi
