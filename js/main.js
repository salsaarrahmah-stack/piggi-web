// main.js — titik masuk. Menjalankan hal umum, lalu memuat modul khusus halaman (lazy).

import { config } from './config.js';
import { loadUi, t } from './i18n.js';
import { initNav } from './nav.js';
import { initTabs } from './tabs.js';
import { initLazyEmbeds } from './lazy-embed.js';

// Modul per halaman (body[data-page]). Diisi bertahap per fase:
// fase 3: kunjungi → kalender.js + reservasi.js, tiket → tiket.js; fase 4: game & staf.
const PAGE_MODULES = {
  jelajahi: () => import('./lantai.js'),
  'kuis-galeri-agenda': () => import('./galeri.js'),
};

async function initWhatsApp() {
  const links = document.querySelectorAll('[data-wa]');
  if (!links.length || !config.whatsapp) return;
  await loadUi();
  const href = `https://wa.me/${encodeURIComponent(config.whatsapp)}?text=${encodeURIComponent(t('waPesan'))}`;
  links.forEach((a) => {
    a.href = href;
    a.hidden = false;
  });
}

async function initPage() {
  const key = document.body.dataset.page;
  const loader = PAGE_MODULES[key];
  if (!loader) return;
  try {
    const mod = await loader();
    await mod.init?.();
  } catch (err) {
    console.error(`[main] modul halaman "${key}" gagal dimuat`, err);
  }
}

initNav();
initTabs();
initLazyEmbeds();
initWhatsApp();
initPage();
