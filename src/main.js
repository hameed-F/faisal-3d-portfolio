import './style.css';
import { renderAll, openCert } from './panels.js';
import { detectTier, saveTier, clearSavedTier, TIERS } from './quality.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const hooks = {};
renderAll(hooks);

// ---------- tiny helpers ----------
const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
export function toast(html, ms = 7000) {
  const t = $('#toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- navigation between sections ----------
const PANELS = ['about', 'skills', 'projects', 'journey', 'achievements', 'promo', 'contact', 'credits'];
let current = 'home';
export const nav = { onChange: [] };
let introDone = false;
export function go(id) {
  if (id !== 'home' && !PANELS.includes(id)) return;
  current = id;
  $$('#quickmenu .chip').forEach((c) => c.classList.toggle('active', c.dataset.go === id));
  if (body.dataset.mode === 'page' || body.dataset.tier === 'basic') {
    if (id !== 'home') $('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    $('#home').hidden = !(id === 'home' && !introDone);
    PANELS.forEach((p) => { $('#' + p).hidden = p !== id; });
    if (id !== 'home') $('#' + id).scrollTop = 0;
  }
  if (location.hash.slice(1) !== id) history.replaceState(null, '', id === 'home' ? location.pathname + location.search : '#' + id);
  nav.onChange.forEach((f) => f(id));
}
function showAllForPage() { PANELS.forEach((p) => { $('#' + p).hidden = false; }); $('#home').hidden = true; }

document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  if (e.target.closest('[data-close]')) { go('home'); return; }
  const c = e.target.closest('[data-cert]'); if (c) openCert(c.dataset.cert);
});
$('#lbClose').addEventListener('click', () => { $('#lightbox').hidden = true; });
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').hidden = true; });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!$('#lightbox').hidden) $('#lightbox').hidden = true; else if (current !== 'home' && body.dataset.mode !== 'page') go('home'); }
});

// ---------- theme ----------
const applyTheme = (t) => { body.dataset.theme = t; store.set('theme', t); document.querySelector('meta[name=theme-color]').content = t === 'day' ? '#cfe0e6' : '#14202b'; nav.onTheme?.(t); };
applyTheme(store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'dusk'));
$('#themeChip').addEventListener('click', () => applyTheme(body.dataset.theme === 'day' ? 'dusk' : 'day'));

// ---------- "read as a page" / basic mode ----------
export function enterPageMode() {
  body.dataset.mode = 'page'; showAllForPage();
  $('#chotu').hidden = false;
}
$('#plainBtn').addEventListener('click', () => { enterPageMode(); window.scrollTo(0, 0); });

// ---------- contact form ----------
const form = $('#contactForm');
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validate(d) {
  const e = {};
  if (!d.name.trim() || d.name.trim().length < 2) e.name = 'Please enter your name (at least 2 characters).';
  if (!emailRe.test(d.email.trim())) e.email = 'Please enter a valid email address.';
  if (!d.subject.trim() || d.subject.trim().length < 3) e.subject = 'Please enter a subject (at least 3 characters).';
  if (d.message.trim().length < 10) e.message = 'Please write a message (at least 10 characters).';
  return e;
}
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(form).entries());
  const errs = validate(d);
  $$('[data-err]', form).forEach((s) => { s.textContent = errs[s.dataset.err] || ''; });
  const msg = $('#contactMsg'); msg.className = ''; msg.textContent = '';
  if (Object.keys(errs).length) { msg.className = 'msg err'; msg.textContent = 'Please fix the highlighted fields.'; return; }
  const btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) { msg.className = 'msg ok'; msg.textContent = 'Thank you. Your message was sent and I will reply by email.'; form.reset(); hooks.onContactSent?.(); }
    else { msg.className = 'msg err'; msg.textContent = j.error || 'Sorry, the message could not be sent. Please email me directly.'; if (j.fields) $$('[data-err]', form).forEach((s) => { s.textContent = j.fields[s.dataset.err] || ''; }); }
  } catch { msg.className = 'msg err'; msg.textContent = 'Network problem. Please try again, or email me directly.'; }
  finally { btn.disabled = false; btn.textContent = 'Send message'; }
});

// ---------- boot ----------
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const det = detectTier();
const qp = new URLSearchParams(location.search).get('q'); // ?q=lite|full|basic for testing
let tier = TIERS[qp] ? qp : det.tier;
let stage = null;
const tierLabel = () => { $('#tierLabel').textContent = TIERS[tier].name; };
const loadBar = (f, m) => { $('#loadBar').style.width = Math.round(f * 100) + '%'; if (m) $('#loadMsg').textContent = m; };

function startBasic(reason) {
  body.dataset.tier = 'basic'; tier = 'basic'; tierLabel();
  enterPageMode(); $('#loader').classList.add('done');
  if (reason) toast(`Showing the text version because ${reason}. <button data-tier="full">Try 3D</button>`, 9000);
}

function setTier(t, manual = false) {
  if (t === tier) return;
  if (manual) saveTier(t);
  if (t === 'basic' || tier === 'basic') { if (!manual) saveTier(t); location.reload(); return; }
  tier = t; body.dataset.tier = t; tierLabel(); stage?.setTier(t);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tier]'); if (!b) return;
  const t = b.dataset.tier; if (t === 'auto') { clearSavedTier(); location.reload(); return; }
  setTier(t, true); $('#toast').hidden = true;
});
$('#tierChip').addEventListener('click', () => {
  toast('Quality: <button data-tier="full">Full</button><button data-tier="lite">Lite</button><button data-tier="basic">Text only</button><button data-tier="auto">Auto</button>', 10000);
});

async function boot3D() {
  body.dataset.tier = tier; body.dataset.mode = '3d'; tierLabel();
  $('#home').hidden = false;
  let switchedOnLoad = false;
  const slowLoad = setTimeout(() => {
    if (tier === 'full' && !det.manual && !qp) { tier = 'lite'; switchedOnLoad = true; body.dataset.tier = 'lite'; tierLabel(); toast('Loading slowly, so I switched to <b>Lite mode</b>. <button data-tier="full">Back to Full</button>'); }
  }, 6000);
  try {
    const { initStage } = await import('./stage/index.js');
    stage = await initStage({
      canvas: $('#stage'), tierName: tier, reducedMotion, onProgress: loadBar,
      onSection: (id) => go(id), onCert: (id) => openCert(id), onChotu: () => hooks.openChat?.(),
      onIntroDone: () => { introDone = true; $('#home').hidden = true; body.classList.add('in-world'); },
      onSlow: (fps, cur, why) => {
        if (new URLSearchParams(location.search).has('nogov') && why !== 'context') return;
        if (why === 'context') { startBasic('the graphics driver stopped responding'); return; }
        if (tier === 'full') { setTier('lite'); toast(`<b>You're in Lite mode.</b> The full version was running slowly on this device (${fps | 0} fps), so I switched to a lighter one. <button data-tier="full">Switch back</button>`, 10000); }
        else if (tier === 'lite' && fps < 14) { toast(`This device is struggling with 3D (${fps | 0} fps). <button data-tier="basic">Use the text version</button>`, 12000); }
      },
    });
    clearTimeout(slowLoad);
    if (switchedOnLoad) stage.setTier('lite');
    stage.setTheme(body.dataset.theme); nav.onTheme = (t) => stage.setTheme(t);
    nav.onChange.push((id) => { if (id === 'home') stage.closePanel(); else stage.focusSection(id); });
    hooks.stage = stage;
    loadBar(1, 'Ready'); setTimeout(() => $('#loader').classList.add('done'), 250);
    if (det.reasons.length && tier === 'lite' && !det.manual) toast(`<b>Lite mode</b> is on (${det.reasons[0]}). <button data-tier="full">Switch to Full</button>`, 8000);
    const start = location.hash.slice(1);
    if (PANELS.includes(start)) { stage.skipIntro(); go(start); }
  } catch (err) {
    clearTimeout(slowLoad); console.error(err); startBasic('the 3D scene could not start');
  }
}

$('#chotu').hidden = false;
$('#startBtn').addEventListener('click', () => { $('#home').hidden = true; stage?.startDrive(); });
$('#creditsBtn').addEventListener('click', () => { stage?.skipIntro(); go('credits'); });
$('#driveBtn').addEventListener('click', () => {
  if (stage?.startFreeDrive) { $('#home').hidden = true; stage.startFreeDrive(); }
  else toast('Free Drive is being built right now. Check back soon.');
});
if (tier === 'basic') startBasic(det.reasons[0]); else boot3D();
document.addEventListener('visibilitychange', () => stage?.pause(document.hidden));
window.__app = { go, toast, hooks, store, nav, get stage() { return stage; } };
