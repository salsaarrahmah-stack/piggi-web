// config.js — pengaturan runtime. Isi nilai bertanda [ISI] sebelum rilis.
// JANGAN taruh rahasia (PIN staf, ID Sheet) di sini: file ini publik.

const root = document.documentElement;

export const config = Object.freeze({
  // Diisi otomatis oleh build.js lewat <html data-base>. Jangan diubah manual.
  basePath: root.dataset.base || '/',
  lang: root.lang === 'en' ? 'en' : 'id',

  // [ISI] URL web app Google Apps Script (fase 3), mis. https://script.google.com/macros/s/XXXX/exec
  appsScriptUrl: '',

  // Nomor WhatsApp resmi diambil dari data/info.json (kunci "whatsapp"), disuntikkan build ke <html data-wa>.
  // Format internasional tanpa + dan spasi, mis. 6281234567890. Kosong = tombol WhatsApp disembunyikan.
  whatsapp: (root.dataset.wa || '').replace(/\D/g, ''),

  // [ISI] Kode GoatCounter (subdomain), mis. 'piggi' untuk piggi.goatcounter.com. Kosong = analitik mati.
  goatcounter: '',

  // Zona waktu acuan semua tanggal (aturan keras #9).
  timeZone: 'Asia/Jakarta',

  // Batas waktu panggilan ke Apps Script (ms).
  requestTimeoutMs: 15000,
});

// Bentuk URL di dalam situs dengan memperhatikan basePath (penting untuk GitHub Pages).
export function siteUrl(relPath = '') {
  return config.basePath + String(relPath).replace(/^\/+/, '');
}
