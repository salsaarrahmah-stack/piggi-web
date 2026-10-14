// i18n.js — teks runtime (pesan memuat, error, dll.) dari content/{lang}.json bagian "ui".
// build.js menyalin bagian itu ke /{lang}/ui.json agar ringan diunduh.

import { config, siteUrl } from './config.js';

let ui = null;
let loading = null;

export function loadUi() {
  if (ui) return Promise.resolve(ui);
  if (!loading) {
    loading = fetch(siteUrl(`${config.lang}/ui.json`))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        ui = data || {};
        return ui;
      });
  }
  return loading;
}

// t('gagal') → teks; t('halo', { nama: 'Ana' }) mengganti {nama}.
// Kunci yang tidak ada dikembalikan apa adanya agar mudah terlihat saat pengujian.
export function t(key, vars) {
  const raw = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ui || {});
  if (typeof raw !== 'string') {
    console.warn(`[i18n] kunci "${key}" belum ada di ui (${config.lang})`);
    return key;
  }
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : raw;
}

// Tanggal "hari ini" menurut Asia/Jakarta, format yyyy-MM-dd (bukan zona perangkat).
export function todayJakarta(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Format tanggal yyyy-MM-dd untuk ditampilkan sesuai bahasa halaman.
export function formatTanggal(ymd, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  const [y, m, d] = ymd.split('-').map(Number);
  // Jam 12:00 UTC supaya tanggal tidak bergeser di zona mana pun.
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(config.lang === 'en' ? 'en-GB' : 'id-ID', { ...options, timeZone: 'UTC' }).format(dt);
}
