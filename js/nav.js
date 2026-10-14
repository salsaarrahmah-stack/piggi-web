// nav.js — menu HP (buka/tutup) dan pengingat pilihan bahasa.

const DESKTOP = window.matchMedia('(min-width: 1100px)');

export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('menu-utama');
  if (!toggle || !nav) return;

  const label = toggle.querySelector('[data-nav-label]');

  const setOpen = (open, { focus = true } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.dataset.open = String(open);
    document.body.classList.toggle('nav-terbuka', open && !DESKTOP.matches);
    if (label) label.textContent = open ? toggle.dataset.labelTutup : toggle.dataset.labelBuka;
    if (open && focus) nav.querySelector('a')?.focus();
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && !DESKTOP.matches) setOpen(false, { focus: false });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.open === 'true' && !DESKTOP.matches) {
      setOpen(false);
      toggle.focus();
    }
  });

  DESKTOP.addEventListener('change', () => setOpen(false, { focus: false }));

  // Ingat bahasa pilihan pengunjung agar halaman akar (/) langsung mengarah ke bahasa itu.
  document.querySelectorAll('[data-lang-switch]').forEach((a) => {
    a.addEventListener('click', () => {
      try {
        localStorage.setItem('piggi.lang', a.dataset.langSwitch);
      } catch {
        /* penyimpanan diblokir: abaikan */
      }
    });
  });
}
