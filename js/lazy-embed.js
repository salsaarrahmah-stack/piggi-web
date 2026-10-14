// lazy-embed.js — memuat video YouTube / Google Maps / Instagram hanya setelah tombol ditekan
// (facade klik-untuk-muat). Hemat kuota dan tidak menghubungi layanan pihak ketiga sebelum diizinkan.

const BUILDERS = {
  youtube: (d) =>
    d.id
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(d.id)}?autoplay=1&rel=0`
      : null,
  maps: (d) => (d.q ? `https://www.google.com/maps?q=${encodeURIComponent(d.q)}&output=embed` : null),
  instagram: (d) => (d.post ? `https://www.instagram.com/p/${encodeURIComponent(d.post)}/embed` : null),
};

export function initLazyEmbeds(root = document) {
  root.querySelectorAll('[data-embed]').forEach((box) => {
    const btn = box.querySelector('.embed__tombol');
    const build = BUILDERS[box.dataset.embed];
    if (!btn || !build) return;
    btn.addEventListener(
      'click',
      () => {
        const src = build(box.dataset);
        if (!src) return;
        const frame = document.createElement('iframe');
        frame.src = src;
        frame.title = box.dataset.title || '';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        box.replaceChildren(frame);
        frame.focus();
      },
      { once: true }
    );
  });
}
