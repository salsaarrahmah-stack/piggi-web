// lantai.js — menggambar denah skematis gedung (SVG) dari daftar tab lantai dan
// menyinkronkannya dengan tab. Jumlah lantai mengikuti data (tidak di-hardcode).

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

export function init() {
  document.querySelectorAll('[data-peta-lantai]').forEach(setup);
}

function setup(wrap) {
  const fig = wrap.querySelector('[data-peta-gambar]');
  const tabs = [...wrap.querySelectorAll('[role="tab"]')];
  if (!fig || !tabs.length) return;

  const n = tabs.length;
  const W = 320;
  const floorH = 46;
  const top = 40;
  const left = 50;
  const width = 220;
  const ground = top + n * floorH;
  const H = ground + 30;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': fig.dataset.alt || '' });

  // Atap miring
  svg.append(el('path', { class: 'denah__atap', d: `M${left - 12} ${top} L${left + 30} ${top - 26} L${left + width - 30} ${top - 26} L${left + width + 12} ${top} Z` }));

  const groups = tabs.map((tab, i) => {
    // Lantai 1 di bawah: indeks 0 digambar paling bawah.
    const y = ground - (i + 1) * floorH;
    const g = el('g', { class: 'denah__lantai', 'data-index': i, 'aria-hidden': 'true' });
    g.append(el('rect', { x: left, y, width, height: floorH, rx: 4 }));
    const t = el('text', { x: left + 16, y: y + floorH / 2 + 5 });
    t.textContent = tab.dataset.nomor || String(i + 1);
    g.append(t);
    g.addEventListener('click', () => wrap.pilihTab?.(i));
    svg.append(g);
    return g;
  });

  // Tangga melingkar (motif tunas pakis) di sisi kanan gedung
  const cx = left + width - 40;
  const cy = top + (n * floorH) / 2;
  let d = '';
  for (let a = 0; a <= 720; a += 10) {
    const r = 4 + a * 0.042;
    const rad = (a * Math.PI) / 180;
    d += `${a ? 'L' : 'M'}${(cx + r * Math.cos(rad)).toFixed(1)} ${(cy + r * Math.sin(rad) * 1.4).toFixed(1)}`;
  }
  svg.append(el('path', { class: 'denah__tangga', d }));

  // Tanah berlapis
  svg.append(el('rect', { class: 'denah__tanah', x: 0, y: ground, width: W, height: 10, rx: 2 }));

  fig.append(svg);

  const sync = (i) => groups.forEach((g, j) => g.setAttribute('data-aktif', String(i === j)));
  const selected = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  sync(selected < 0 ? 0 : selected);
  wrap.addEventListener('tabs:ganti', (e) => sync(e.detail.index));
}
