// tabs.js — mengubah [data-tabs] menjadi tab yang bisa dipakai keyboard (pola WAI-ARIA Tabs).
// Tanpa JS: daftar tab tetap tersembunyi dan semua panel tampil berurutan.

export function initTabs(root = document) {
  root.querySelectorAll('[data-tabs]').forEach(setupTabs);
}

function setupTabs(wrap) {
  const list = wrap.querySelector('[data-tablist]');
  if (!list) return;
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  if (!tabs.length || panels.some((p) => !p)) return;

  const vertical = wrap.dataset.tabsOrientasi === 'vertical';
  // Untuk daftar yang ditampilkan terbalik (column-reverse), panah atas = item berikutnya.
  const reversed = getComputedStyle(list).flexDirection === 'column-reverse';

  const select = (i, { focus = false, emit = true } = {}) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
    if (emit) wrap.dispatchEvent(new CustomEvent('tabs:ganti', { detail: { index: i, tab: tabs[i] } }));
  };

  list.hidden = false;

  // Tab awal: dari #hash (mis. #panel-l2) bila cocok, selain itu tab pertama.
  const fromHash = panels.findIndex((p) => `#${p.id}` === location.hash);
  select(fromHash >= 0 ? fromHash : 0, { emit: true });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
  });

  list.addEventListener('keydown', (e) => {
    const cur = tabs.indexOf(document.activeElement);
    if (cur < 0) return;
    const nextKeys = vertical ? (reversed ? ['ArrowUp'] : ['ArrowDown']) : ['ArrowRight'];
    const prevKeys = vertical ? (reversed ? ['ArrowDown'] : ['ArrowUp']) : ['ArrowLeft'];
    let to = null;
    if (nextKeys.includes(e.key)) to = (cur + 1) % tabs.length;
    else if (prevKeys.includes(e.key)) to = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = tabs.length - 1;
    if (to === null) return;
    e.preventDefault();
    select(to, { focus: true });
  });

  // Dipakai komponen lain (mis. denah lantai) untuk memilih tab dari luar.
  wrap.pilihTab = (i) => select(i, { focus: false });
}
