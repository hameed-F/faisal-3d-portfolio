import './style.css';
import './theme.css';
import './noir/noir.css';
import { renderAll, openCert } from './panels.js';
import { detectTier, saveTier, clearSavedTier, TIERS } from './quality.js';
import { initChat } from './chat.js';
import { setEnabled as setSound, isEnabled as soundOn, play, savedPreference } from './audio.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const hooks = {};
renderAll(hooks);

const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
export function toast(html, ms = 6000) {
  const t = $('#toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- HTML panels (contact, promo, credits in 3D; everything in Read mode) ----------
const PANELS = ['about', 'skills', 'projects', 'journey', 'achievements', 'promo', 'contact', 'credits'];
const OVERLAY = ['promo', 'contact', 'credits']; // panels that open on top of the 3D tower
let stage = null;
export function go(id) {
  if (body.dataset.mode === 'page' || body.dataset.tier === 'basic') {
    if (id === 'home' || !PANELS.includes(id)) window.scrollTo({ top: 0, behavior: 'smooth' }); else $('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  PANELS.forEach((p) => { $('#' + p).hidden = p !== id || !OVERLAY.includes(id); });
  if (OVERLAY.includes(id)) { $('#' + id).scrollTop = 0; play('open'); }
}
function showAllForPage() { PANELS.forEach((p) => { $('#' + p).hidden = false; }); $('#home').hidden = true; }
export function enterPageMode() { body.dataset.mode = 'page'; const f = $('#contactForm'); if (f && !$('#contact').contains(f)) $('#contact').appendChild(f); showAllForPage(); $('#chotu').hidden = false; document.querySelectorAll('.nhud,.nlabels,.reel').forEach((e) => { e.hidden = true; }); }

document.addEventListener('click', (e) => {
  const zn = e.target.closest('[data-zone]'); if (zn) { const i = +zn.dataset.zone; if (stage && body.dataset.mode === '3d') { $('#home').hidden = true; go('home'); stage.warp(i); } else go(['about', 'journey', 'projects', 'skills', 'achievements', 'contact'][i]); return; }
  if (e.target.closest('[data-chotu]')) { hooks.openChat?.(); return; }
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go); return; }
  if (e.target.closest('[data-close]')) { go('home'); return; }
  const c = e.target.closest('[data-cert]'); if (c) openCert(c.dataset.cert);
});
$('#lbClose').addEventListener('click', () => { $('#lightbox').hidden = true; });
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') $('#lightbox').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('#lightbox').hidden) $('#lightbox').hidden = true; else if (body.dataset.mode !== 'page') go('home'); } });
body.dataset.theme = 'day';

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
    if (r.ok && j.ok) { msg.className = 'msg ok'; msg.textContent = 'Invite sent! Thank you, I will reply by email.'; form.reset(); stage?.avatar.play('Victory'); stage?.unlock?.('invite'); play('win'); }
    else { msg.className = 'msg err'; msg.textContent = j.error || 'Sorry, the message could not be sent. Please email me directly.'; if (j.fields) $$('[data-err]', form).forEach((s) => { s.textContent = j.fields[s.dataset.err] || ''; }); }
  } catch { msg.className = 'msg err'; msg.textContent = 'Network problem. Please try again, or email me directly.'; }
  finally { btn.disabled = false; btn.textContent = 'Send message'; }
});

// ---------- boot ----------
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const det = detectTier();
const qp = new URLSearchParams(location.search).get('q'); // ?q=lite|full|basic for testing
let tier = TIERS[qp] ? qp : det.tier;
const loadBar = (f, m) => { $('#loadBar').style.width = Math.round(f * 100) + '%'; if (m) $('#loadMsg').textContent = m; };

function startBasic(reason) {
  body.dataset.tier = 'basic'; tier = 'basic';
  enterPageMode(); $('#loader').classList.add('done');
  if (reason) toast(`Showing the text version because ${reason}. <button data-tier="full">Try 3D</button>`, 9000);
}
function setTier(t, manual = false) {
  if (t === tier) return;
  if (manual) saveTier(t);
  if (t === 'basic' || tier === 'basic') { location.reload(); return; }
  tier = t; body.dataset.tier = t; stage?.setTier(t);
  toast(`Quality: <b>${TIERS[t].name}</b>`, 2000);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tier]'); if (!b) return;
  const t = b.dataset.tier; if (t === 'auto') { clearSavedTier(); location.reload(); return; }
  setTier(t, true);
});

async function boot3D() {
  body.dataset.tier = tier; body.dataset.mode = '3d';
  $('#home').hidden = false;
  try {
    const { initNoir } = await import('./noir/index.js');
    stage = await initNoir({
      canvas: $('#stage'), tierName: tier, reducedMotion, onProgress: loadBar, toast: (h, ms) => toast(h, ms), playSfx: (n) => play(n),
      onCert: (id) => openCert(id), onChotu: () => hooks.openChat?.(),
      onContact: () => go('contact'), onPromo: () => go('promo'),
      onReady: () => { body.classList.add('in-world'); },
      onSlow: (fps, cur, why) => {
        if (new URLSearchParams(location.search).has('nogov') && why !== 'context') return;
        if (why === 'context') { startBasic('the graphics driver stopped responding'); return; }
        if (tier === 'full') { setTier('lite'); toast(`<b>Lite mode is on</b> to keep things smooth (${fps | 0} fps). <button data-tier="full">Switch back</button>`, 9000); }
        else if (tier === 'lite' && fps < 14) toast(`This device is struggling with 3D. <button id="toRead">Read as a page</button>`, 12000);
      },
    });
    hooks.stage = stage; stage.sfx = play;
    loadBar(1, 'READY'); setTimeout(() => $('#loader').classList.add('done'), Math.max(300, 1600 - performance.now()));
    if (det.reasons.length && tier === 'lite' && !det.manual) toast(`<b>Lite mode</b> is on (${det.reasons[0]}). <button data-tier="full">Switch to Full</button>`, 7000);
  } catch (err) { console.error(err); startBasic('the 3D scene could not start'); }
}

$('#chotu').hidden = false;
initChat({ go, hooks });
const readMode = () => { enterPageMode(); window.scrollTo(0, 0); $('#menuSheet').hidden = true; };
$('#startBtn').addEventListener('click', () => { $('#home').hidden = true; stage?.startPlay(); });
$('#plainBtn').addEventListener('click', readMode);
$('#readBtn').addEventListener('click', readMode);
document.addEventListener('click', (e) => { if (e.target.id === 'toRead') readMode(); });
$('#brandChip').addEventListener('click', () => { if (body.dataset.mode === 'page') { location.reload(); } });
if (tier === 'basic') startBasic(det.reasons[0]); else boot3D();
document.addEventListener('visibilitychange', () => stage?.pause(document.hidden));
window.__app = { go, toast, hooks, store, get stage() { return stage; } };

// ---------- sound ----------
const soundChip = $('#soundChip');
const showSound = () => { soundChip.textContent = soundOn() ? '♪ on' : '♪ off'; soundChip.setAttribute('aria-pressed', String(soundOn())); };
soundChip.addEventListener('click', () => { setSound(!soundOn()); showSound(); });
if (savedPreference()) { const once = () => { setSound(true); showSound(); removeEventListener('pointerdown', once); }; addEventListener('pointerdown', once); }

// ---------- menu sheet ----------
const sheet = $('#menuSheet');
$('#menuChip').addEventListener('click', () => { sheet.hidden = false; $('#sheetClose').focus(); });
$('#sheetClose').addEventListener('click', () => { sheet.hidden = true; });
sheet.addEventListener('click', (e) => { if (e.target === sheet || e.target.closest('[data-go],[data-tier],[data-zone],[data-chotu]')) sheet.hidden = true; });
