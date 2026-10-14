// galeri.js — lightbox untuk [data-galeri] memakai <dialog> bawaan browser.
// Tanpa JS: tautan membuka gambar di tab yang sama.

export function init() {
  document.querySelectorAll('[data-galeri]').forEach(setup);
}

function setup(list) {
  const links = [...list.querySelectorAll('[data-galeri-foto]')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = `
    <figure class="lightbox__isi"><img alt=""><figcaption></figcaption></figure>
    <div class="lightbox__kontrol">
      <button type="button" class="btn btn--kedua btn--terang btn--kecil" data-aksi="prev"></button>
      <button type="button" class="btn btn--aksen btn--kecil" data-aksi="tutup"></button>
      <button type="button" class="btn btn--kedua btn--terang btn--kecil" data-aksi="next"></button>
    </div>`;
  const img = dlg.querySelector('img');
  const cap = dlg.querySelector('figcaption');
  const btn = (a) => dlg.querySelector(`[data-aksi="${a}"]`);
  btn('prev').textContent = `← ${list.dataset.labelSebelumnya || ''}`.trim();
  btn('next').textContent = `${list.dataset.labelBerikutnya || ''} →`.trim();
  btn('tutup').textContent = list.dataset.labelTutup || '×';
  document.body.append(dlg);

  let cur = 0;
  let opener = null;
  const show = (i) => {
    cur = (i + links.length) % links.length;
    const a = links[cur];
    const src = a.querySelector('img');
    img.src = a.href;
    img.alt = src?.alt || '';
    cap.textContent = a.closest('figure')?.querySelector('figcaption')?.textContent.trim() || '';
  };

  links.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      opener = a;
      show(i);
      dlg.showModal();
      btn('tutup').focus();
    });
  });
  btn('prev').addEventListener('click', () => show(cur - 1));
  btn('next').addEventListener('click', () => show(cur + 1));
  btn('tutup').addEventListener('click', () => dlg.close());
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  // Klik di luar gambar (backdrop) menutup dialog
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('close', () => opener?.focus());
}
