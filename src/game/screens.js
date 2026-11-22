// Game-menu screens for each level. Real HTML: readable, accessible, fast.
import { profile, aboutZones, journey, skills, projects, certificates, CONFIG } from '../content.js';
import { youtubeId } from '../panels.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GROUP = { Unreal: '#5a8dee', Unity: '#ff6b5a', 'Three.js': '#2bb3a3', Systems: '#c77dff', Motion: '#ffb020' };
const firstSentence = (s) => (s.match(/^[^.]+\./) || [s])[0];

export function renderScreen(id, ctx) {
  switch (id) {
    case 'player': return player();
    case 'quests': return quests();
    case 'library': return library(ctx);
    case 'inventory': return inventory();
    case 'trophies': return trophies();
    case 'multiplayer': return multiplayer();
    default: return '';
  }
}

function head(n, title, sub, color) {
  return `<header class="scr-head" style="--lc:${color}"><span class="scr-n">${n}</span><div><h2>${title}</h2><p>${sub}</p></div><button class="scr-x" data-scr-close aria-label="Back to the map">✕</button></header>`;
}

function player() {
  const stats = [[projects.length, 'projects'], [certificates.length, 'certificates'], ['3', 'game engines'], ['2', 'current internships']];
  return `${head(1, 'Player', 'Character profile', '#ff6b5a')}
  <div class="scr-body">
    <div class="pcard">
      <div class="pc-top"><div class="pc-avatar">MF</div><div><small>PLAYER ONE</small><h3>${esc(profile.name)}</h3><p>${esc(profile.title)}</p></div></div>
      <blockquote>“${esc(profile.tagline)}”</blockquote>
      <dl class="pc-facts">
        <div><dt>Base</dt><dd>${esc(profile.location)}</dd></div>
        <div><dt>Guild</dt><dd>NED University · BS CS (Gaming & Animation)</dd></div>
        <div><dt>CGPA</dt><dd>3.605 / 4.00</dd></div>
        <div><dt>Main engines</dt><dd>Unreal Engine 5 · Unity · Three.js</dd></div>
      </dl>
      <div class="pc-stats">${stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
    </div>
    <h4 class="scr-sub">Four sides of me</h4>
    <div class="tiles">${aboutZones.map((z) => `<div class="tile" style="--c:${z.color}"><b>${esc(z.title)}</b><span>${esc(z.text)}</span></div>`).join('')}</div>
    <div class="scr-acts"><a class="gbtn p" href="${profile.resume}" download>⬇ Download CV</a><a class="gbtn" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a><a class="gbtn" href="${profile.framer}" target="_blank" rel="noopener">Earlier portfolio ↗</a></div>
  </div>`;
}

function quests() {
  const status = (j) => (/present/i.test(j.when) ? ['active', 'Active quest'] : /2023/.test(j.when) ? ['main', 'Main quest · in progress'] : ['done', 'Completed']);
  const ordered = [...journey].sort((a, b) => (status(a)[0] === 'main' ? -1 : status(b)[0] === 'main' ? 1 : status(a)[0] === 'active' ? -1 : status(b)[0] === 'active' ? 1 : 0));
  return `${head(2, 'Quest Log', 'Education & experience', '#ffb020')}
  <div class="scr-body">
    <div class="qmain"><small>MAIN QUEST</small><h3>BS Computer Science · Gaming & Animation</h3><p>NED University of Engineering and Technology, Karachi · CGPA 3.605/4.00</p>
      <div class="qbar"><i style="width:87%"></i></div><span class="qbar-l">Year 4 of 4 · expected early 2027</span></div>
    <ul class="qlist">${ordered.filter((j) => status(j)[0] !== 'main').map((j) => { const [k, l] = status(j); return `<li class="q ${k}"><details><summary><span class="qdot"></span><div><b>${esc(j.title)}</b><small>${esc(j.where)}</small></div><em>${l} · ${esc(j.when)}</em></summary><p>${esc(j.text)}</p></details></li>`; }).join('')}</ul>
  </div>`;
}

function library() {
  const groups = [...new Set(projects.map((p) => p.group))];
  return `${head(3, 'Game Library', `${projects.length} projects · tap a cover`, '#2bb3a3')}
  <div class="scr-body">
    <div class="lib-filter" role="group" aria-label="Filter">${['All', ...groups].map((g, i) => `<button data-lib="${g}" aria-pressed="${i === 0}" style="--c:${GROUP[g] || '#23253a'}">${g}</button>`).join('')}</div>
    <div class="covers">${projects.map((p) => `<button class="cover" data-proj="${p.id}" data-group="${p.group}" style="--c:${GROUP[p.group] || '#23253a'}">
      ${p.image ? `<img loading="lazy" src="${p.image}" alt="" />` : `<div class="cv-ph">${esc(p.name)}</div>`}
      <span class="cv-tag">${esc(p.group)}${p.featured ? ' · ★' : ''}</span><b>${esc(p.name.replace(/\s*\(.*\)/, ''))}</b><small>${esc(p.stack.split('·')[0].trim())}${p.year ? ' · ' + p.year : ''}</small></button>`).join('')}</div>
  </div>`;
}
export function projectDetail(id) {
  const p = projects.find((x) => x.id === id); if (!p) return '';
  return `<div class="pd" style="--c:${GROUP[p.group] || '#23253a'}">
    <button class="pd-back" data-lib-back>← Library</button>
    ${p.image ? `<img class="pd-img" src="${p.image}" alt="${esc(p.name)} screenshot" />` : ''}
    <span class="cv-tag">${esc(p.group)}${p.featured ? ' · featured' : ''}</span>
    <h3>${esc(p.name)}</h3>
    <p class="pd-meta">${esc(p.stack)}${p.year ? ' · ' + p.year : ''}</p>
    <p class="pd-role">${esc(p.role)}</p>
    <p>${esc(p.summary)}</p>
    ${p.points ? `<h4 class="scr-sub">What I did</h4><ul class="pd-points">${p.points.map((x) => { const [h, ...rest] = x.split(':'); return `<li><b>${esc(h)}</b>${rest.length ? ': ' + esc(rest.join(':').trim()) : ''}</li>`; }).join('')}</ul>` : ''}
    <div class="scr-acts">${p.links.map(([l, u], i) => `<a class="gbtn ${i === 0 ? 'p' : ''}" href="${u}" target="_blank" rel="noopener">${/play/i.test(l) ? '▶ ' : ''}${esc(l)} ↗</a>`).join('') || '<span class="muted">No public link yet.</span>'}</div>
  </div>`;
}

function inventory() {
  const icon = { king: '🛠', queen: '⌨', rook: '🎨', bishop: '🧭', knight: '✨' };
  return `${head(4, 'Inventory', 'Skills & tools · tap an item', '#5a8dee')}
  <div class="scr-body">
    ${skills.map((g) => `<section class="inv"><h4 class="scr-sub">${icon[g.piece] || '•'} ${esc(g.group)}</h4><div class="slots">${g.items.map(([n, w]) => `<details class="slot"><summary><b>${esc(n.split(' (')[0])}</b>${n.includes('(') ? `<small>${esc(n.slice(n.indexOf('(') + 1, -1))}</small>` : ''}</summary><p>Used in: ${esc(w)}</p></details>`).join('')}</div></section>`).join('')}
    <div class="sidequest"><div><small>SIDE QUEST</small><b>Beat my chess AI</b><span>I wrote the engine myself: three difficulty levels.</span></div><button class="gbtn p" data-game="chess">Play ♞</button></div>
  </div>`;
}

function trophies() {
  return `${head(5, 'Trophy Room', `${certificates.length} achievements unlocked`, '#c77dff')}
  <div class="scr-body"><ul class="ach">${certificates.map((c) => `<li><button data-cert="${c.id}"><img loading="lazy" src="${c.image.replace('/certs/', '/certs/thumb/')}" alt="" /><div><small>🏆 Achievement unlocked</small><b>${esc(c.title)}</b><span>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</span></div></button>${c.verify ? `<a class="ach-v" href="${c.verify}" target="_blank" rel="noopener">Verify ↗</a>` : ''}</li>`).join('')}</ul></div>`;
}

function multiplayer() {
  const id = youtubeId(CONFIG.PROMO_VIDEO_URL);
  return `${head(6, 'Multiplayer', 'Send an invite · watch the trailer', '#ff7eb6')}
  <div class="scr-body">
    <div class="mp-links"><a class="gbtn p" href="mailto:${profile.email}">✉ ${esc(profile.email)}</a><span class="gbtn ghost">☎ ${esc(profile.phone)}</span><a class="gbtn" href="${profile.github}" target="_blank" rel="noopener">GitHub ↗</a></div>
    <h4 class="scr-sub">Send an invite</h4>
    <div id="mpForm"></div>
    <h4 class="scr-sub">Trailer</h4>
    <div class="trailer" id="trailer">${id ? `<button class="gbtn p" id="trailerPlay" data-id="${id}">▶ Play the promo</button>` : '<div class="trailer-soon"><b>Trailer coming soon</b><span>The promo video will play here.</span></div>'}</div>
  </div>`;
}
export { GROUP };
