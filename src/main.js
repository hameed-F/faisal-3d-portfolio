import './style.css';
import { renderAll, openCert } from './panels.js';

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
export function go(id) {
  if (id !== 'home' && !PANELS.includes(id)) return;
  current = id;
  $('#home').hidden = id !== 'home';
  PANELS.forEach((p) => { $('#' + p).hidden = p !== id; });
  $$('#quickmenu .chip').forEach((c) => c.classList.toggle('active', c.dataset.go === id));
  if (body.dataset.mode === 'page' || body.dataset.tier === 'basic') {
    // page mode shows everything; scroll to the section instead
    if (id !== 'home') $('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (location.hash.slice(1) !== id) history.replaceState(null, '', id === 'home' ? location.pathname : '#' + id);
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

// ---------- boot (phase 1: HTML only; the 3D stage is added in phase 2+) ----------
body.dataset.mode = '3d';
$('#loader').classList.add('done');
$('#chotu').hidden = false;
const start = location.hash.slice(1);
if (PANELS.includes(start)) go(start);
$('#startBtn').addEventListener('click', () => go('about'));
$('#creditsBtn').addEventListener('click', () => go('credits'));
$('#driveBtn').addEventListener('click', () => toast('Free Drive arrives with the 3D world.'));
window.__app = { go, toast, hooks, store, nav };
