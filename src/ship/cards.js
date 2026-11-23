// HTML layer for THE FAISAL SESSIONS: episode title cards and the room panels.
import { profile, aboutZones, journey, projects, certificates } from '../content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- episode title card: colour blocks slide in, big type, slide out ----------
let tc;
export async function titleCard(num, title, sub = '', ms = 1000) {
  if (!tc) { tc = document.createElement('div'); tc.className = 'tcard'; tc.setAttribute('aria-live', 'polite'); document.body.appendChild(tc); }
  tc.innerHTML = `<i class="tc-a"></i><i class="tc-b"></i><i class="tc-c"></i><div class="tc-in"><span class="tc-n">SESSION #${esc(num)}</span><b class="tc-t">${esc(title)}</b>${sub ? `<span class="tc-s">${esc(sub)}</span>` : ''}</div>`;
  tc.classList.remove('out'); tc.classList.add('on'); await wait(ms); tc.classList.add('out'); await wait(380); tc.classList.remove('on', 'out');
}

// ---------- room panel ----------
let el; let onClose = null;
function ensure() {
  if (el) return el;
  el = document.createElement('section'); el.className = 'spanel'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden && $('#lightbox')?.hidden !== false) closePanel(); });
  return el;
}
export const panelOpen = () => !!el && !el.hidden;
export function closePanel() { if (!el || el.hidden) return; el.hidden = true; const f = onClose; onClose = null; f?.(); }
const frame = (num, kicker, title, inner, cls = '') => `<div class="sp-card ${cls}"><header class="sp-head"><span class="sp-num">#${esc(num)}</span><div><span class="sp-kick">${esc(kicker)}</span><h2>${esc(title)}</h2></div><button class="sp-x" data-sp-x aria-label="Close">✕</button></header><div class="sp-body">${inner}</div></div>`;
const bounty = (p, i) => `<button class="bounty" data-p="${i}"><span class="b-top">WANTED</span>${p.image ? `<img src="${p.image}" alt="" loading="lazy" />` : `<span class="b-noimg">${esc(p.name)}</span>`}<b>${esc(p.name)}</b><span class="b-meta">${esc(p.group)}${p.year ? ' · ' + p.year : ''}</span>${p.featured ? '<span class="b-star">★ featured</span>' : ''}</button>`;
function projectDetail(p) {
  return `<article class="dossier"><button class="sp-back" data-back>‹ All bounties</button>
    <div class="dos-grid">${p.image ? `<img src="${p.image}" alt="${esc(p.name)}" />` : ''}<div><span class="sp-kick">${esc(p.group)}${p.year ? ' · ' + p.year : ''}</span><h3>${esc(p.name)}</h3><p class="dos-stack">${esc(p.stack)}</p><p class="dos-role">${esc(p.role)}</p></div></div>
    <p>${esc(p.summary)}</p>${(p.points || []).length ? `<ul>${p.points.map((x) => { const [h, ...r] = x.split(':'); return r.length ? `<li><b>${esc(h)}:</b>${esc(r.join(':'))}</li>` : `<li>${esc(x)}</li>`; }).join('')}</ul>` : ''}
    <div class="sp-acts">${(p.links || []).map(([l, u], i) => `<a class="sb ${i === 0 ? 'p' : ''}" href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div></article>`;
}

export function openPanel(kind, api = {}) {
  const e = ensure(); onClose = api.onClose || null; let html = '';
  if (kind === 'lounge') html = frame('03', 'The bounty board', 'Twelve projects, all wanted', `<div class="bounties">${projects.map(bounty).join('')}</div>`, 'wide');
  else if (kind === 'hangar') html = frame('07', 'The flight log', 'Where I have been', `<ol class="log">${journey.map((j) => `<li><span class="log-when">${esc(j.when)}</span><div><h3>${esc(j.title)}</h3><p class="log-where">${esc(j.where)}</p><p>${esc(j.text)}</p></div></li>`).join('')}</ol>`);
  else if (kind === 'bunks') html = frame('05', 'Medals on the wall', 'Certificates', `<div class="medals">${certificates.map((c) => `<figure><button data-cert="${c.id}" aria-label="View ${esc(c.title)} full size"><img src="${c.image.replace('/certs/', '/certs/thumb/')}" alt="" loading="lazy" /></button><figcaption><b>${esc(c.title)}</b><span>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</span>${c.verify ? `<a href="${c.verify}" target="_blank" rel="noopener">Verify ↗</a>` : ''}</figcaption></figure>`).join('')}</div>`, 'wide');
  else if (kind === 'cockpit') html = frame('01', 'Meet the pilot', profile.name, `<p class="pilot-dek">${esc(profile.title)} · ${esc(profile.location)}</p><p class="pilot-lede">${esc(profile.tagline)}</p>
      <div class="pilot-grid">${aboutZones.map((z, i) => `<div style="--c:${['#d9a23a', '#2f6f73', '#c8562b', '#6b7a3a'][i % 4]}"><h3>${esc(z.title)}</h3><p>${esc(z.text)}</p></div>`).join('')}</div>
      <div class="sp-acts"><a class="sb p" href="${profile.resume}" download>Download CV</a><a class="sb" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a><a class="sb" href="mailto:${profile.email}">Email</a><button class="sb" data-sp-go="comms">Send a message</button></div>`);
  e.innerHTML = html; e.hidden = false; e.scrollTop = 0; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
  const body = $('.sp-body', e);
  e.onclick = (ev) => {
    if (ev.target === e || ev.target.closest('[data-sp-x]')) { closePanel(); return; }
    const p = ev.target.closest('[data-p]'); if (p) { const pr = projects[+p.dataset.p]; body.dataset.list = body.innerHTML; body.innerHTML = projectDetail(pr); $('.sp-card', e).scrollTop = 0; api.onProject?.(pr); return; }
    if (ev.target.closest('[data-back]')) { body.innerHTML = body.dataset.list; return; }
    const g = ev.target.closest('[data-sp-go]'); if (g) { closePanel(); api.onGo?.(g.dataset.spGo); }
  };
  setTimeout(() => $('.sp-x', e)?.focus({ preventScroll: true }), 50);
}
