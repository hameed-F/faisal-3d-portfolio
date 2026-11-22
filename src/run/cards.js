// Retro dialog cards: short, punchy info that pops out of code blocks.
import { profile, journey, CONFIG } from '../content.js';
import { youtubeId } from '../panels.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let el; let onClose = null;
function ensure() {
  if (el) return el;
  el = document.createElement('aside'); el.className = 'rcard'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target.closest('[data-rc-x]')) closeCard(); });
  return el;
}
export const cardOpen = () => !!el && !el.hidden;
export function closeCard() { if (!el || el.hidden) return; el.hidden = true; const f = onClose; onClose = null; f?.(); }
export function showCard({ tag, title, meta, img, lines = [], tiles, actions = [], color = '#ffc93c' }, close) {
  const e = ensure(); onClose = close || null; e.style.setProperty('--rc', color);
  e.innerHTML = `<div class="rc-in"><button class="rc-x" data-rc-x aria-label="Close">✕</button>
    ${tag ? `<span class="rc-tag">${esc(tag)}</span>` : ''}
    ${img ? `<img class="rc-img" src="${img}" alt="" />` : ''}
    <h3>${esc(title)}</h3>${meta ? `<p class="rc-meta">${esc(meta)}</p>` : ''}
    ${lines.length ? `<ul class="rc-lines">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${tiles ? `<div class="rc-tiles">${tiles.map((t) => `<div style="--c:${t.c}"><b>${esc(t.t)}</b><span>${esc(t.d)}</span></div>`).join('')}</div>` : ''}
    ${actions.length ? `<div class="rc-acts">${actions.map((a, i) => (a.href ? `<a class="rbtn ${a.p ? 'p' : ''}" href="${a.href}" ${a.download ? 'download' : 'target="_blank" rel="noopener"'}>${esc(a.label)}</a>` : `<button class="rbtn ${a.p ? 'p' : ''}" data-act="${i}">${esc(a.label)}</button>`)).join('')}</div>` : ''}
    <p class="rc-hint">keep running ▶</p></div>`;
  e.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { const a = actions[+b.dataset.act]; closeCard(); a.onClick?.(); }; });
  e.hidden = false; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
}
const firstSentence = (s, n = 160) => { const m = s.match(/^.*?[.!?](\s|$)/); const t = m ? m[0].trim() : s; return t.length > n ? t.slice(0, t.lastIndexOf(' ', n)) + '…' : t; };

export function cardFor(info, api) {
  switch (info.kind) {
    case 'profile': return { tag: 'Player 1', title: profile.name, meta: `${profile.title} · ${profile.location}`, lines: [profile.tagline, 'BS Computer Science (Gaming & Animation) · NED University · CGPA 3.605/4.00', profile.availability], actions: [{ label: '⬇ Download CV', href: profile.resume, download: true, p: true }, { label: 'GitHub', href: profile.github }], color: '#ff6b5a' };
    case 'about': return { tag: 'About me', title: info.z.title, lines: [info.z.text], color: info.z.color };
    case 'cv': return { tag: 'Power-up', title: 'Résumé', meta: 'One page · PDF', lines: ['Everything in this level, on one page.'], actions: [{ label: '⬇ Download CV', href: profile.resume, download: true, p: true }, { label: '✉ Email me', href: `mailto:${profile.email}` }], color: '#ff6b5a' };
    case 'education': return { tag: 'Journey · step 1', title: 'BS Computer Science', meta: 'Gaming & Animation · NED University, Karachi', lines: ['CGPA 3.605 / 4.00', '2023 → early 2027 (4th year)', 'Game engine architecture · real-time 3D · AI behaviour · semester game production'], color: '#ffb020' };
    case 'journey': return { tag: `Journey · step ${info.step} of ${journey.length}`, title: info.j.title, meta: `${info.j.when} · ${info.j.where}`, lines: [info.j.text], color: '#ffb020' };
    case 'project': { const p = info.p; return { tag: `${p.group}${p.featured ? ' · ★ featured' : ''}`, img: p.image, title: p.name, meta: `${p.stack}${p.year ? ' · ' + p.year : ''}`, lines: [p.role, firstSentence(p.summary), ...(p.points || []).slice(0, 3).map((x) => '▸ ' + x.split(':')[0])], actions: p.links.map(([l, u], i) => ({ label: (/play/i.test(l) ? '▶ ' : '') + l, href: u, p: i === 0 })), color: '#2bb3a3' }; }
    case 'skill': return { tag: 'Power-up unlocked', title: info.g.group, lines: info.g.items.map(([n, w]) => `${n} · ${w}`), color: '#5a8dee' };
    case 'cert': { const c = info.c; return { tag: '🏆 Trophy collected', img: c.image.replace('/certs/', '/certs/thumb/'), title: c.title, meta: `${c.issuer}${c.date ? ' · ' + c.date : ''}`, actions: [{ label: 'View full size', p: true, onClick: () => api.onCert?.(c.id) }, ...(c.verify ? [{ label: 'Verify ↗', href: c.verify }] : [])], color: '#c77dff' }; }
    default: return null;
  }
}
export function promoCard(api) {
  const id = youtubeId(CONFIG.PROMO_VIDEO_URL);
  return { tag: 'Trailer', title: 'Promo video', lines: [id ? 'A short trailer of my work.' : 'The trailer is coming soon. It will play right here.'], actions: id ? [{ label: '▶ Watch', p: true, onClick: () => api.onPromo?.() }] : [], color: '#ff7eb6' };
}
