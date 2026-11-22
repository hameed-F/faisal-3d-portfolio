// MIDNIGHT REEL: the HTML layer. Intertitle cards, iris wipes, and the "reels" (dialogs) each building opens.
import { profile, aboutZones, skills, journey, projects, certificates } from '../content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- intertitle card (black card, ornate frame, one or two lines) ----------
let inter;
export async function intertitle(line, sub = '', ms = 1300) {
  if (!inter) { inter = document.createElement('div'); inter.className = 'intertitle'; inter.setAttribute('aria-live', 'polite'); document.body.appendChild(inter); }
  inter.innerHTML = `<div class="it-frame"><span class="it-orn">❦</span><p class="it-line">${esc(line)}</p>${sub ? `<p class="it-sub">${esc(sub)}</p>` : ''}<span class="it-orn">❦</span></div>`;
  inter.classList.add('on'); await wait(ms); inter.classList.remove('on'); await wait(260);
}

// ---------- iris wipe: closes to a dot, runs fn, opens again ----------
let iris;
export async function irisWipe(fn, x = innerWidth / 2, y = innerHeight / 2) {
  if (!iris) { iris = document.createElement('div'); iris.className = 'iris'; iris.innerHTML = '<i></i>'; document.body.appendChild(iris); }
  iris.style.setProperty('--ix', x + 'px'); iris.style.setProperty('--iy', y + 'px');
  iris.classList.remove('open'); iris.classList.add('on'); void iris.offsetWidth; iris.classList.add('shut');
  await wait(480); await fn?.(); await wait(80);
  iris.classList.remove('shut'); iris.classList.add('open'); await wait(520); iris.classList.remove('on', 'open');
}

// ---------- the reel dialog ----------
let el; let onClose = null;
function ensure() {
  if (el) return el;
  el = document.createElement('section'); el.className = 'reel'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-reel-x]')) closeReel(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden && $('#lightbox')?.hidden !== false) closeReel(); });
  return el;
}
export const reelOpen = () => !!el && !el.hidden;
export function closeReel() { if (!el || el.hidden) return; el.hidden = true; const f = onClose; onClose = null; f?.(); }
function frame(kicker, title, inner, cls = '') {
  return `<div class="reel-card ${cls}"><button class="reel-x" data-reel-x aria-label="Close">✕</button><header class="reel-head"><span class="reel-kick">${esc(kicker)}</span><h2>${esc(title)}</h2></header><div class="reel-body">${inner}</div></div>`;
}
const posterHTML = (p, i) => `<button class="poster" data-p="${i}" style="--h:${(i * 37) % 360}">${p.image ? `<img src="${p.image}" alt="" loading="lazy" />` : `<span class="poster-type"><b>${esc(p.name)}</b><i>${esc(p.group)}</i></span>`}<span class="poster-cap">${esc(p.name)}${p.featured ? ' <em>★</em>' : ''}</span></button>`;
function projectDetail(p) {
  return `<article class="film"><button class="reel-back" data-back>‹ All films</button>${p.image ? `<img class="film-img" src="${p.image}" alt="${esc(p.name)} still" />` : ''}
    <p class="film-meta">${esc(p.group)}${p.year ? ' · ' + p.year : ''} · ${esc(p.stack)}</p><h3>${esc(p.name)}</h3><p class="film-role">${esc(p.role)}</p><p>${esc(p.summary)}</p>
    ${(p.points || []).length ? `<ul>${p.points.map((x) => { const [h, ...r] = x.split(':'); return r.length ? `<li><b>${esc(h)}:</b>${esc(r.join(':'))}</li>` : `<li>${esc(x)}</li>`; }).join('')}</ul>` : ''}
    <div class="reel-acts">${(p.links || []).map(([l, u], i) => `<a class="rb ${i === 0 ? 'p' : ''}" href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div></article>`;
}

export function openReel(kind, api = {}) {
  const e = ensure(); onClose = api.onClose || null; let html = '';
  if (kind === 'cinema') {
    html = frame('The Picture House · Now showing', 'Twelve films by Faisal', `<p class="reel-lede">Pick a poster. Every one is a real project.</p><div class="posters">${projects.map(posterHTML).join('')}</div>`, 'wide');
  } else if (kind === 'campus') {
    html = frame('The Academy', 'The story so far', `<ol class="strip">${journey.map((j, i) => `<li><span class="strip-n">Reel ${i + 1}</span><span class="strip-when">${esc(j.when)}</span><h3>${esc(j.title)}</h3><p class="strip-where">${esc(j.where)}</p><p>${esc(j.text)}</p></li>`).join('')}</ol>`);
  } else if (kind === 'pawn') {
    html = frame('Trophies & Pawn · Not for sale', 'Certificates', `<div class="certs">${certificates.map((c) => `<figure class="cert"><button data-cert="${c.id}" aria-label="View ${esc(c.title)} full size"><img src="${c.image.replace('/certs/', '/certs/thumb/')}" alt="" loading="lazy" /></button><figcaption><b>${esc(c.title)}</b><span>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</span>${c.verify ? `<a href="${c.verify}" target="_blank" rel="noopener">Verify ↗</a>` : ''}</figcaption></figure>`).join('')}</div>`, 'wide');
  } else if (kind === 'kiosk') {
    html = frame('The Daily Reel · Extra! Extra!', profile.name, `<p class="paper-dek">${esc(profile.title)} · ${esc(profile.location)}</p><p class="paper-lede">${esc(profile.tagline)}</p>
      <div class="paper-cols">${aboutZones.map((z) => `<div><h3>${esc(z.title)}</h3><p>${esc(z.text)}</p></div>`).join('')}</div>
      <div class="reel-acts"><a class="rb p" href="${profile.resume}" download>Download CV</a><a class="rb" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a><a class="rb" href="mailto:${profile.email}">Email</a><button class="rb" data-reel-go="contact">Phone booth (contact form)</button></div>`, 'paper');
  } else if (kind === 'arcade') {
    html = frame('Penny Arcade · One coin per play', 'Pick a cabinet', `<div class="cabs">
      <button class="cab" data-play="slice"><span class="cab-scr">✂</span><b>Skill Slice</b><span>Swipe the flying film cans to slice out my skills. Mind the dynamite.</span></button>
      <button class="cab" data-play="chess"><span class="cab-scr">♞</span><b>Chess</b><span>Play my own chess engine. Three levels.</span></button>
      <button class="cab" data-play="snakes"><span class="cab-scr">⚄</span><b>Snakes & Ladders</b><span>Race me up the board of my journey.</span></button></div>
      <details class="skill-list"><summary>Just show me the skills list</summary>${skills.map((g) => `<h3>${esc(g.group)}</h3><ul>${g.items.map(([n, w]) => `<li><b>${esc(n)}</b> <span>${esc(w)}</span></li>`).join('')}</ul>`).join('')}</details>`);
  }
  e.innerHTML = html; e.hidden = false; e.scrollTop = 0; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  const body = $('.reel-body', e);
  e.onclick = (ev) => {
    if (ev.target === e || ev.target.closest('[data-reel-x]')) return;
    const p = ev.target.closest('[data-p]'); if (p) { const pr = projects[+p.dataset.p]; body.dataset.list = body.innerHTML; body.innerHTML = projectDetail(pr); body.scrollTop = 0; e.scrollTop = 0; api.onProject?.(pr); return; }
    if (ev.target.closest('[data-back]')) { body.innerHTML = body.dataset.list; return; }
    const pl = ev.target.closest('[data-play]'); if (pl) { const k = pl.dataset.play; closeReel(); api.onPlay?.(k); return; }
    const g = ev.target.closest('[data-reel-go]'); if (g) { closeReel(); api.onGo?.(g.dataset.reelGo); }
  };
  setTimeout(() => $('.reel-x', e)?.focus({ preventScroll: true }), 50);
}
