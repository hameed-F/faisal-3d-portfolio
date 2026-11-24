import './style.css';
import { html, bind, openCert, openProject, SECTION_TITLES } from './panels.js';
import { CONFIG, profile } from './content.js';
import { detectTier, saveTier, clearSavedTier, TIERS, FpsGovernor } from './quality.js';
import { initChat } from './chat.js';
import { toggleRead, canRead, stopReading } from './read.js';
import { SECTIONS } from './board/layout.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const params = new URLSearchParams(location.search);
const hooks = {}; let world = null; let story = null; let tier = 'full'; let theme = params.get('theme') || store.get('theme', 'light');
if (theme !== 'dark') theme = 'light';

function toast(h, ms = 5000) { const t = $('#toast'); t.innerHTML = h; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms); }

// ---------- theme ----------
function applyTheme(t, save = true) {
  theme = t; body.dataset.theme = t; if (save) store.set('theme', t);
  const c = $('#themeChip'); c.setAttribute('aria-pressed', String(t === 'dark')); $('.lbl', c).textContent = t === 'dark' ? 'Light' : 'Dark'; $('.ic', c).textContent = t === 'dark' ? '☀' : '☾';
  c.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode (lamps over the board)' : 'Switch to dark mode (glowing snakes)');
  world?.setTheme(t); document.querySelector('meta[name=theme-color]').content = '#0a0f26';
}
applyTheme(theme, false);
$('#themeChip').addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));
$('#mTheme').addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));
$('#mRead').addEventListener('click', () => { $('#menu').hidden = true; world?.setActive(false); enterPageMode(); });

// ---------- loader: a folded board that unfolds ----------
const fold = $('#fold'); const t0 = performance.now(); let real = 0; let shown = 0; let doneCb = null;
const ltiles = [...document.querySelectorAll('#fold .lt')];
function setFold(p) {
  // a loading bar made of board tiles: each tile flips face-up as the files arrive
  ltiles.forEach((t, i) => { const o = Math.min(1, Math.max(0, p * 10 - i)); t.style.setProperty('--o', o.toFixed(3)); });
  $('#ldPct').textContent = Math.round(p * 100);
}
function tickLoader() { const target = Math.min(real, (performance.now() - t0) / 2100); shown += (target - shown) * 0.18 + 0.002; shown = Math.min(shown, target); setFold(shown); if (shown >= 0.995 && real >= 1) { setFold(1); doneCb?.(); return; } requestAnimationFrame(tickLoader); }
function onProgress(f, msg) { real = Math.max(real, f); if (msg) $('#ldMsg').textContent = msg + '…'; }
setFold(0); requestAnimationFrame(tickLoader);

// ---------- menu ----------
$('#menuGrid').innerHTML = SECTIONS.map((s) => `<button type="button" data-section-go="${s.id}" style="--c:${s.color}"><i></i>${s.title}</button>`).join('');
const menu = $('#menu');
const openMenu = () => { menu.hidden = false; $('#menuClose').focus(); };
const closeMenu = () => { menu.hidden = true; $('#menuChip').focus(); };
$('#menuChip').addEventListener('click', openMenu); $('#menuClose').addEventListener('click', closeMenu);
menu.addEventListener('click', (e) => { if (e.target === menu) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!menu.hidden) closeMenu(); else if (!$('#lightbox').hidden) $('#lightbox').hidden = true; } });

function go(id) {
  if (body.dataset.mode === 'page') { (id === 'credits' ? $('#s-credits') : $('#s-' + id))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (id === 'credits') { $('#lbBody').innerHTML = html.credits(); $('#lightbox').hidden = false; $('#lbClose').focus(); return; }
  story?.go(id);
}
document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-section-go]'); if (s) { menu.hidden = true; go(s.dataset.sectionGo); return; }
  const g = e.target.closest('[data-go]'); if (g) { menu.hidden = true; go(g.dataset.go); return; }
  const c = e.target.closest('[data-cert]'); if (c) { openCert(c.dataset.cert); return; }
  const r = e.target.closest('[data-read]'); if (r) { toggleRead(r); return; }
  const t = e.target.closest('button[data-tier]'); if (t) { const v = t.dataset.tier; menu.hidden = true; if (v === 'auto') { clearSavedTier(); location.reload(); } else setTier(v, true); }
});
$('#lbClose').addEventListener('click', () => { $('#lightbox').hidden = true; });
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').hidden = true; });
$('#brandChip').addEventListener('click', () => { if (story && !story.S.busy && story.S.mode !== 'game') { story.closeSection(); } });
if (!canRead) document.documentElement.classList.add('no-speech');

// ---------- text version ----------
function enterPageMode(reason) {
  stopReading(); body.dataset.mode = 'page'; $('#loader').classList.add('done'); $('#hud').hidden = true; $('#cta').hidden = true; $('#scr').hidden = true;
  const order = ['about', 'edu', 'projects', 'skills', 'contact', 'video', 'credits'];
  const page = $('#page'); page.hidden = false;
  page.innerHTML = `<header class="pg-head"><p class="kick">${profile.title}</p><h1>${profile.name}</h1><p class="lead">${profile.tagline}</p>
    <nav aria-label="Sections">${order.map((id) => `<a href="#s-${id}">${SECTION_TITLES[id]}</a>`).join('')}</nav>
    <div class="row"><button class="btn alt" id="toggleTheme" type="button">${theme === 'dark' ? 'Light' : 'Dark'} mode</button><button class="btn" id="try3d" type="button">See the 3D board</button></div></header>
    ${order.map((id) => `<section class="pg-sec" id="s-${id}" data-section="${id}"><div class="panel-bar"><button class="btn ghost small" data-read type="button">🔊 Read aloud</button></div><div class="panel-body">${html[id]()}</div></section>`).join('')}`;
  order.forEach((id) => bind($('#s-' + id), id));
  $('#toggleTheme')?.addEventListener('click', (e) => { applyTheme(theme === 'dark' ? 'light' : 'dark'); e.target.textContent = (theme === 'dark' ? 'Light' : 'Dark') + ' mode'; });
  $('#try3d')?.addEventListener('click', () => { saveTier('full'); location.href = location.pathname + '?q=full'; });
  $('#chatFab').hidden = false; window.scrollTo(0, 0);
  if (reason) toast(`Showing the text version because ${reason}.`, 8000);
}
$('#ldPage').addEventListener('click', () => { tier = 'basic'; enterPageMode(); });

function setTier(t, manual = false) {
  if (!TIERS[t] || t === tier) return; if (manual) saveTier(t);
  if (t === 'basic' || tier === 'basic') { location.reload(); return; }
  tier = t; body.dataset.tier = t; world?.setTier(t); toast(`Quality: <b>${TIERS[t].name}</b>`, 2000);
}

// ---------- boot ----------
const det = detectTier(); const qp = params.get('q');
tier = TIERS[qp] ? qp : det.tier; body.dataset.tier = tier;
const name = CONFIG.COMPANION || 'Pappu Pansa';
initChat({ go, hooks, name });
let moodTimer = 0;
hooks.onChat = (s) => { if (!world) return; clearTimeout(moodTimer); const D = world.D; if (s === 'open') D.hide = 0; D.mood = s === 'open' ? 'listen' : s === 'think' ? 'think' : s === 'talk' ? 'talk' : 'idle'; if (s === 'talk') moodTimer = setTimeout(() => { D.mood = 'listen'; }, 3200); if (s === 'close') D.mood = 'idle'; };

async function boot3D() {
  try {
    onProgress(0.02, 'fetching the board');
    const [{ createWorld }, { createStory }] = await Promise.all([import('./board/world.js'), import('./board/story.js')]);
    onProgress(0.08, 'setting up the lamps');
    world = await createWorld({
      canvas: $('#stage'), tier, theme, onProgress, FpsGovernor,
      onSlow: (fps) => {
        if (params.has('nogov')) return;
        if (tier === 'full') { setTier('lite'); toast(`<b>Lite mode is on</b> to keep things smooth (${fps | 0} fps). <button type="button" data-tier="full">Switch back</button>`, 9000); }
        else if (tier === 'lite' && fps < 14) toast('This device is struggling with 3D. <button type="button" id="toPage">Read it as a page</button>', 12000);
      },
    });
    story = createStory({ world, toast, onSection: () => {} });
    window.__app = { world, story, go, toast, applyTheme };
    world.canvas = $('#stage');
    // dice + tile picking
    const cv = $('#stage'); let down = null;
    cv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    cv.addEventListener('pointerup', (e) => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) { down = null; return; } down = null; const scrK = story.S.screen; if (scrK && scrK !== 'home' && scrK !== 'holo') return; const h = world.pick(e.clientX, e.clientY); if (!h) return; if (h.project) { openProject(h.project); return; } if (scrK === 'holo') return; if (h.dice) { hooks.openChat?.(); return; } if (h.section && !story.S.busy && story.S.mode !== 'game') story.go(h.section); });
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const h = world.pick(e.clientX, e.clientY); cv.style.cursor = h ? 'pointer' : ''; world.D.hover = !!h?.dice; });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => story.resize(), 200); });
    doneCb = () => {
      body.dataset.mode = '3d'; $('#hud').hidden = false; $('#loader').classList.add('done'); world.start(); story.intro(); world.govReset();
      if (det.reasons.length && tier === 'lite' && !det.manual) toast(`<b>Lite mode</b> is on (${det.reasons[0]}). <button type="button" data-tier="full">Switch to Full</button>`, 7000);
    };
    onProgress(1, 'ready');
  } catch (err) { console.error(err); tier = 'basic'; body.dataset.tier = 'basic'; enterPageMode('the 3D scene could not start'); }
}
document.addEventListener('click', (e) => { if (e.target.id === 'toPage') { tier = 'basic'; enterPageMode(); } });
addEventListener('webglcontextlost', () => { if (body.dataset.mode === '3d') { tier = 'basic'; enterPageMode('the graphics driver stopped responding'); } }, true);
if (tier === 'basic') enterPageMode(det.reasons[0] && !qp ? det.reasons[0] : '');
else boot3D();
