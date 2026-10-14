#!/usr/bin/env node
/*
 * build.js — generator situs PIGGI (hanya modul inti Node, tanpa dependensi).
 *
 *   node build.js                 bangun id/, en/, index.html, 404.html, sitemap.xml, robots.txt
 *   node build.js --check         validasi saja, tidak menulis file
 *   node build.js --base=/repo/   timpa basePath dari site.json (mis. untuk GitHub Pages)
 *
 * Sintaks template (templates/*.html):
 *   {{a.b.c}}            teks dari content/{lang}.json (di-escape)
 *   {{html:a.b}}         teks mentah (hanya untuk konten yang memang berisi HTML)
 *   {{route:kunjungi#x}} URL halaman sesuai bahasa (+ query/hash opsional)
 *   {{url:this.route}}   sama seperti route:, tapi kunci rutenya diambil dari data
 *   {{asset:css/a.css}}  URL aset + basePath + versi (hash isi file)
 *   {{aset:this.file}}   sama seperti asset:, tapi path-nya diambil dari data
 *   {{uri:data.x}}       teks di-encode untuk dipakai di dalam URL
 *   {{tgl:this.tanggal}} tanggal yyyy-MM-dd ditulis sesuai bahasa (mis. 20 November 2026)
 *   {{#each daftar}} {{this.x}} {{@index}} {{@nomor}} {{else}} ... {{/each}}
 *   {{#if @first}}       benar hanya untuk item pertama dalam {{#each}}
 * Data: data/*.json tersedia sebagai {{data.<nama>...}}. Objek {"id": "...", "en": "..."}
 * otomatis diganti teks sesuai bahasa halaman.
 *   {{#if x}} ... {{else}} ... {{/if}}   {{#unless x}} ... {{/unless}}
 * Kunci JSON berawalan "_" adalah catatan untuk manusia (tidak dirender).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const LANGS = ['id', 'en'];

// Daftar halaman. Urutan menu mengikuti urutan di sini.
const PAGES = [
  { key: 'beranda', menu: true },
  { key: 'tentang', menu: true },
  { key: 'jelajahi', menu: true },
  { key: 'coba-langsung', menu: true },
  { key: 'untuk-sekolah', menu: true },
  { key: 'kuis-galeri-agenda', menu: true },
  { key: 'kunjungi', menu: true },
  { key: 'paspor', noindex: true },
  { key: 'qr', noindex: true },
  { key: 'escape', noindex: true },
  { key: 'tiket', noindex: true },
  { key: 'staf', noindex: true, langs: ['id'] },
];

const MARKER_RE = /\[(VERIFIKASI|ISI DARI PIGGI|KONFIRMASI KE PIGGI|KONSULTASI UU PDP)[^\]]*\]/g;

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const RILIS = args.includes('--rilis'); // gagal bila masih ada penanda [VERIFIKASI]/[ISI DARI PIGGI]
const baseArg = (args.find((a) => a.startsWith('--base=')) || '').slice('--base='.length);

const errors = [];
const warnings = [];

// ---------- util ----------
function readJson(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    errors.push(`${rel}: file tidak ditemukan`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: JSON tidak valid — ${e.message}`);
    return null;
  }
}

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function typeOf(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

function normBase(b) {
  let s = (b || '/').trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (!s.endsWith('/')) s += '/';
  return s;
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

// ---------- cek kunci bilingual ----------
function compareKeys(a, b, p) {
  const ta = typeOf(a);
  const tb = typeOf(b);
  const where = p || '(akar)';
  if (ta !== tb) {
    errors.push(`content: tipe "${where}" berbeda (id: ${ta}, en: ${tb})`);
    return;
  }
  if (ta === 'array') {
    if (a.length !== b.length) {
      errors.push(`content: jumlah item "${where}" berbeda (id: ${a.length}, en: ${b.length})`);
    }
    for (let i = 0; i < Math.min(a.length, b.length); i++) compareKeys(a[i], b[i], `${where}[${i}]`);
    return;
  }
  if (ta === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const sub = p ? `${p}.${k}` : k;
      if (!(k in a)) errors.push(`content: kunci "${sub}" hanya ada di en.json`);
      else if (!(k in b)) errors.push(`content: kunci "${sub}" hanya ada di id.json`);
      else compareKeys(a[k], b[k], sub);
    }
    return;
  }
  if (ta === 'string' && (a.trim() === '') !== (b.trim() === '')) {
    warnings.push(`content: "${where}" kosong di salah satu bahasa`);
  }
}

function countMarkers(obj) {
  let n = 0;
  (function walk(v) {
    if (typeof v === 'string') n += (v.match(MARKER_RE) || []).length;
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  })(obj);
  return n;
}

// ---------- mesin template ----------
const parsedCache = new Map();

function parseTemplate(src, file) {
  const re = /\{\{\s*([\s\S]*?)\s*\}\}/g;
  const root = { type: 'root', children: [] };
  const stack = [root];
  const target = () => {
    const n = stack[stack.length - 1];
    return n.inElse ? n.elseChildren : n.children;
  };
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) target().push({ type: 'text', value: src.slice(last, m.index) });
    last = re.lastIndex;
    const tag = m[1];
    const line = lineOf(src, m.index);
    let mm;
    if ((mm = tag.match(/^#(each|if|unless)\s+(\S+)$/))) {
      const node = { type: mm[1], path: mm[2], children: [], elseChildren: [], inElse: false, line };
      target().push(node);
      stack.push(node);
    } else if (tag === 'else') {
      const n = stack[stack.length - 1];
      if (n.type === 'root') throw new Error(`${file}:${line}: {{else}} di luar blok`);
      n.inElse = true;
    } else if ((mm = tag.match(/^\/(each|if|unless)$/))) {
      const n = stack.pop();
      if (!n || n.type !== mm[1]) throw new Error(`${file}:${line}: {{/${mm[1]}}} tidak cocok dengan pembukanya`);
    } else {
      target().push({ type: 'var', expr: tag, line });
    }
  }
  if (last < src.length) target().push({ type: 'text', value: src.slice(last) });
  if (stack.length > 1) {
    const n = stack[stack.length - 1];
    throw new Error(`${file}:${n.line}: blok {{#${n.type}}} tidak ditutup`);
  }
  return root.children;
}

function loadTemplate(rel) {
  if (parsedCache.has(rel)) return parsedCache.get(rel);
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parseTemplate(src, rel);
  } catch (e) {
    errors.push(e.message);
    ast = [];
  }
  parsedCache.set(rel, ast);
  return ast;
}

function lookup(p, scope, env) {
  if (p === '@index') return scope.index;
  if (p === '@nomor') return scope.index + 1;
  if (p === '@first') return scope.index === 0;
  if (p === 'this') return scope.item;
  if (p.startsWith('this.')) return getPath(scope.item, p.slice(5));
  return getPath(env.ctx, p);
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  return Boolean(v);
}

function render(nodes, scope, env) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'text') {
      out += n.value;
    } else if (n.type === 'var') {
      out += renderVar(n, scope, env);
    } else if (n.type === 'each') {
      const list = lookup(n.path, scope, env);
      if (!Array.isArray(list)) {
        env.err(n.line, `{{#each ${n.path}}} bukan daftar (array)`);
        continue;
      }
      if (list.length === 0) out += render(n.elseChildren, scope, env);
      list.forEach((item, index) => {
        out += render(n.children, { item, index, parent: scope }, env);
      });
    } else if (n.type === 'if' || n.type === 'unless') {
      let ok = truthy(lookup(n.path, scope, env));
      if (n.type === 'unless') ok = !ok;
      out += render(ok ? n.children : n.elseChildren, scope, env);
    }
  }
  return out;
}

function renderVar(n, scope, env) {
  const expr = n.expr;
  const i = expr.indexOf(':');
  const prefix = i > 0 && /^[a-z]+$/.test(expr.slice(0, i)) ? expr.slice(0, i) : '';
  const arg = prefix ? expr.slice(i + 1).trim() : expr;

  if (prefix === 'route') return escapeHtml(env.route(arg, n.line));
  if (prefix === 'asset') return escapeHtml(env.asset(arg, n.line));

  const val = lookup(arg, scope, env);
  if (val === undefined || val === null) {
    env.err(n.line, `kunci "${arg}" tidak ditemukan di content/${env.lang}.json`);
    return '';
  }
  if (typeof val === 'object') {
    env.err(n.line, `"${arg}" berisi objek/daftar, bukan teks`);
    return '';
  }
  if (prefix === 'url') return escapeHtml(env.route(String(val), n.line));
  if (prefix === 'aset') return escapeHtml(env.asset(String(val), n.line));
  if (prefix === 'uri') return escapeHtml(encodeURIComponent(String(val)));
  if (prefix === 'tgl') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(val));
    if (!m) {
      env.err(n.line, `"${arg}" bukan tanggal yyyy-MM-dd`);
      return escapeHtml(val);
    }
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    const loc = env.lang === 'en' ? 'en-GB' : 'id-ID';
    return escapeHtml(new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dt));
  }
  if (prefix === 'html') return String(val);
  if (prefix) {
    env.err(n.line, `awalan "${prefix}:" tidak dikenal`);
    return '';
  }
  return escapeHtml(val);
}

// ---------- konteks situs ----------
const site = readJson('site.json') || {};
const content = {};
for (const lang of LANGS) content[lang] = readJson(`content/${lang}.json`);

if (!content.id || !content.en) finish();

// ---------- data/*.json (bilingual {id,en}) ----------
const DATA_DIR = path.join(ROOT, 'data');
const rawData = {};
if (fs.existsSync(DATA_DIR)) {
  for (const f of fs.readdirSync(DATA_DIR).sort()) {
    if (!f.endsWith('.json')) continue;
    const j = readJson(`data/${f}`);
    if (j) rawData[f.replace(/\.json$/, '').replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = j;
  }
}

function isPair(v) {
  return (
    v && typeof v === 'object' && !Array.isArray(v) &&
    Object.keys(v).length === 2 && typeof v.id === 'string' && typeof v.en === 'string'
  );
}

function checkPairs(v, where) {
  if (Array.isArray(v)) return v.forEach((x, i) => checkPairs(x, `${where}[${i}]`));
  if (!v || typeof v !== 'object') return;
  const keys = Object.keys(v);
  if (keys.length === 1 && (keys[0] === 'id' || keys[0] === 'en') && typeof v[keys[0]] === 'string') {
    errors.push(`${where}: terjemahan "${keys[0] === 'id' ? 'en' : 'id'}" belum ada`);
    return;
  }
  if (isPair(v)) {
    if ((v.id.trim() === '') !== (v.en.trim() === '')) warnings.push(`${where}: kosong di salah satu bahasa`);
    return;
  }
  for (const k of keys) if (!k.startsWith('_')) checkPairs(v[k], `${where}.${k}`);
}

function resolveLang(v, lang) {
  if (Array.isArray(v)) return v.map((x) => resolveLang(x, lang));
  if (isPair(v)) return v[lang];
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = resolveLang(v[k], lang);
    return o;
  }
  return v;
}

for (const [k, v] of Object.entries(rawData)) checkPairs(v, `data/${k}.json`);

const BASE = normBase(baseArg || site.basePath);
const SITE_URL = String(site.siteUrl || '').replace(/\/+$/, '');
if (!SITE_URL || /example\.(org|com)/.test(SITE_URL)) {
  warnings.push('site.json: siteUrl masih contoh — canonical, hreflang, dan sitemap memakai alamat palsu');
}

compareKeys(content.id, content.en, '');

const pageByKey = Object.fromEntries(PAGES.map((p) => [p.key, p]));
const langsOf = (pg) => pg.langs || LANGS;

for (const lang of LANGS) {
  const routes = getPath(content[lang], 'meta.routes') || {};
  const seen = new Map();
  for (const pg of PAGES) {
    if (!(pg.key in routes)) errors.push(`content/${lang}.json: meta.routes.${pg.key} belum ada`);
    if (!getPath(content[lang], `halaman.${pg.key}.meta.title`)) {
      errors.push(`content/${lang}.json: halaman.${pg.key}.meta.title belum ada`);
    }
    const slug = routes[pg.key];
    if (typeof slug === 'string') {
      if (!/^[a-z0-9-]*$/.test(slug)) errors.push(`content/${lang}.json: slug "${slug}" hanya boleh a-z, 0-9, "-"`);
      if (seen.has(slug)) errors.push(`content/${lang}.json: slug "${slug}" dipakai dua kali (${seen.get(slug)}, ${pg.key})`);
      seen.set(slug, pg.key);
    }
  }
}

function pageHref(lang, key) {
  const slug = content[lang].meta.routes[key] || '';
  return `${BASE}${lang}/${slug ? slug + '/' : ''}`;
}

function absUrl(href) {
  return SITE_URL + href;
}

const assetHashes = new Map();
function assetUrl(rel) {
  const clean = rel.replace(/^\/+/, '');
  const file = path.join(ROOT, clean);
  if (!fs.existsSync(file)) return null;
  if (!assetHashes.has(clean)) {
    const h = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
    assetHashes.set(clean, h);
  }
  return `${BASE}${clean}?v=${assetHashes.get(clean)}`;
}

function makeEnv(lang, ctx, file) {
  return {
    lang,
    ctx,
    err: (line, msg) => errors.push(`${file}:${line} [${lang}]: ${msg}`),
    route(spec, line) {
      const cut = spec.search(/[?#]/);
      const key = cut < 0 ? spec : spec.slice(0, cut);
      const rest = cut < 0 ? '' : spec.slice(cut);
      const pg = pageByKey[key];
      if (!pg) {
        this.err(line, `rute "${key}" tidak dikenal`);
        return '#';
      }
      if (!langsOf(pg).includes(lang)) {
        this.err(line, `halaman "${key}" tidak tersedia dalam bahasa ${lang}`);
        return '#';
      }
      return pageHref(lang, key) + rest;
    },
    asset(rel, line) {
      const u = assetUrl(rel);
      if (!u) {
        this.err(line, `aset "${rel}" tidak ditemukan`);
        return '#';
      }
      return u;
    },
  };
}

// ---------- head (canonical, hreflang, OG) ----------
function buildHead(pg, lang, title, description) {
  const c = content[lang];
  const tags = [];
  const href = pageHref(lang, pg.key);
  if (pg.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow">');
  } else {
    tags.push(`<link rel="canonical" href="${escapeHtml(absUrl(href))}">`);
    for (const l of langsOf(pg)) {
      tags.push(`<link rel="alternate" hreflang="${l}" href="${escapeHtml(absUrl(pageHref(l, pg.key)))}">`);
    }
    tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(absUrl(BASE))}">`);
  }
  tags.push(`<meta property="og:type" content="website">`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(c.meta.situs.nama)}">`);
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  tags.push(`<meta property="og:locale" content="${escapeHtml(c.meta.locale)}">`);
  tags.push(`<meta property="og:url" content="${escapeHtml(absUrl(href))}">`);
  return tags.join('\n    ');
}

// ---------- render semua halaman ----------
const outputs = new Map(); // path relatif → isi
const dataByLang = Object.fromEntries(LANGS.map((l) => [l, resolveLang(rawData, l)]));

for (const lang of LANGS) {
  const c = content[lang];
  const altLang = LANGS.find((l) => l !== lang);
  const navItems = (current) =>
    PAGES.filter((p) => p.menu).map((p) => ({
      key: p.key,
      label: getPath(c, `nav.items.${p.key}`) || p.key,
      pendek: getPath(c, `nav.pendek.${p.key}`) || getPath(c, `nav.items.${p.key}`) || p.key,
      href: pageHref(lang, p.key),
      current: p.key === current,
    }));

  for (const pg of PAGES) {
    if (!langsOf(pg).includes(lang)) continue;
    const hp = c.halaman[pg.key] || {};
    const metaT = getPath(hp, 'meta.title') || pg.key;
    const title = pg.key === 'beranda' ? c.meta.situs.judulBeranda : `${metaT} · ${c.meta.situs.nama}`;
    const description = getPath(hp, 'meta.description') || '';
    if (!description && !pg.noindex) warnings.push(`content/${lang}.json: halaman.${pg.key}.meta.description kosong`);

    const hasAlt = langsOf(pg).includes(altLang);
    const ctx = {
      ...c,
      data: dataByLang[lang],
      site: {
        lang,
        altLang,
        base: BASE,
        tahun: new Date().getFullYear(),
        themeColor: site.themeColor || '#171a21',
      },
      page: {
        key: pg.key,
        title,
        heading: metaT,
        description,
        noindex: Boolean(pg.noindex),
        hasAlt,
        altHref: hasAlt ? pageHref(altLang, pg.key) : '',
        navItems: navItems(pg.key),
        cta: hp.cta || null,
        head: buildHead(pg, lang, title, description),
        body: '',
      },
    };

    const tplRel = fs.existsSync(path.join(ROOT, 'templates', `${pg.key}.html`))
      ? `templates/${pg.key}.html`
      : 'templates/_stub.html';
    if (tplRel.endsWith('_stub.html')) ctx.page.stub = true;

    ctx.page.body = render(loadTemplate(tplRel), {}, makeEnv(lang, ctx, tplRel));
    const html = render(loadTemplate('templates/_layout.html'), {}, makeEnv(lang, ctx, 'templates/_layout.html'));

    const slug = c.meta.routes[pg.key] || '';
    outputs.set(path.join(lang, slug, 'index.html'), html);
  }

  outputs.set(path.join(lang, 'ui.json'), JSON.stringify(c.ui || {}, null, 2) + '\n');
}

const stubCount = PAGES.filter((p) => !fs.existsSync(path.join(ROOT, 'templates', `${p.key}.html`))).length;

// ---------- index.html (pengalih bahasa) ----------
function rootIndex() {
  const id = content.id;
  const en = content.en;
  const css = assetUrl('css/tokens.css');
  const css2 = assetUrl('css/style.css');
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(id.meta.situs.judulBeranda)}</title>
    <meta name="description" content="${escapeHtml(id.halaman.beranda.meta.description)}">
    <link rel="alternate" hreflang="id" href="${escapeHtml(absUrl(pageHref('id', 'beranda')))}">
    <link rel="alternate" hreflang="en" href="${escapeHtml(absUrl(pageHref('en', 'beranda')))}">
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(absUrl(BASE))}">
    <link rel="stylesheet" href="${css}">
    <link rel="stylesheet" href="${css2}">
    <script>
      (function () {
        var base = ${JSON.stringify(BASE)};
        var saved = null;
        try { saved = localStorage.getItem('piggi.lang'); } catch (e) {}
        var list = navigator.languages || [navigator.language || ''];
        var pick = saved === 'id' || saved === 'en' ? saved
          : list.some(function (l) { return /^(id|ms)\\b/i.test(l); }) ? 'id' : 'en';
        location.replace(base + pick + '/');
      })();
    </script>
  </head>
  <body>
    <main class="container section pilih-bahasa">
      <h1>${escapeHtml(id.meta.situs.nama)}</h1>
      <p>${escapeHtml(id.umum.pilihBahasa)} / ${escapeHtml(en.umum.pilihBahasa)}</p>
      <p class="pilih-bahasa__aksi">
        <a class="btn btn--utama" href="${pageHref('id', 'beranda')}" hreflang="id">${escapeHtml(id.bahasa.nama)}</a>
        <a class="btn btn--kedua" href="${pageHref('en', 'beranda')}" hreflang="en" lang="en">${escapeHtml(en.bahasa.nama)}</a>
      </p>
    </main>
  </body>
</html>
`;
}

function notFound() {
  const id = content.id;
  const en = content.en;
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <title>404 · ${escapeHtml(id.meta.situs.nama)}</title>
    <link rel="stylesheet" href="${assetUrl('css/tokens.css')}">
    <link rel="stylesheet" href="${assetUrl('css/style.css')}">
  </head>
  <body>
    <main class="container section pilih-bahasa">
      <p class="eyebrow">404</p>
      <h1>${escapeHtml(id.umum.e404.judul)}</h1>
      <p>${escapeHtml(id.umum.e404.teks)}</p>
      <p lang="en">${escapeHtml(en.umum.e404.judul)}. ${escapeHtml(en.umum.e404.teks)}</p>
      <p class="pilih-bahasa__aksi">
        <a class="btn btn--utama" href="${pageHref('id', 'beranda')}">${escapeHtml(id.umum.e404.kembali)}</a>
        <a class="btn btn--kedua" href="${pageHref('en', 'beranda')}" lang="en">${escapeHtml(en.umum.e404.kembali)}</a>
      </p>
    </main>
  </body>
</html>
`;
}

function sitemap() {
  const urls = [];
  for (const pg of PAGES) {
    if (pg.noindex) continue;
    for (const lang of langsOf(pg)) {
      const alts = langsOf(pg)
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeHtml(absUrl(pageHref(l, pg.key)))}"/>`)
        .join('\n');
      urls.push(`  <url>\n    <loc>${escapeHtml(absUrl(pageHref(lang, pg.key)))}</loc>\n${alts}\n  </url>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absUrl(BASE)}sitemap.xml\n`;
}

if (errors.length === 0) {
  outputs.set('index.html', rootIndex());
  outputs.set('404.html', notFound());
  outputs.set('sitemap.xml', sitemap());
  outputs.set('robots.txt', robots());
}

finish();

// ---------- keluaran ----------
function finish() {
  for (const w of new Set(warnings)) console.warn(`⚠  ${w}`);
  if (errors.length) {
    const unik = [...new Set(errors)];
    console.error(`\n✖ Build GAGAL — ${unik.length} masalah:`);
    for (const e of unik) console.error(`  • ${e}`);
    console.error('\nTidak ada file yang ditulis.');
    process.exit(1);
  }

  const nMarker = (l) => countMarkers(content[l]) + countMarkers(resolveLang(rawData, l));
  const markers = LANGS.map((l) => `${l}: ${nMarker(l)}`).join(', ');
  if (RILIS && LANGS.some((l) => nMarker(l) > 0)) {
    console.error(`\n✖ Mode --rilis: masih ada penanda verifikasi (${markers}). Lengkapi data dulu.`);
    console.error('  Cari teks [VERIFIKASI], [ISI DARI PIGGI], [KONFIRMASI KE PIGGI], [KONSULTASI UU PDP] di content/ dan data/.');
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log(`✔ Check lulus — ${outputs.size} file siap dibangun (tidak ditulis). basePath: ${BASE}`);
  } else {
    for (const lang of LANGS) fs.rmSync(path.join(ROOT, lang), { recursive: true, force: true });
    for (const [rel, data] of outputs) {
      const file = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, data);
    }
    console.log(`✔ Build selesai — ${outputs.size} file ditulis. basePath: ${BASE}`);
  }
  console.log(`  Penanda verifikasi di konten (${markers}). Halaman sementara (stub): ${stubCount}.`);
  process.exit(0);
}
