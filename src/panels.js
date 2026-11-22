import { CONFIG, profile, aboutZones, skills, journey, projects, certificates, credits } from './content.js';

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GROUP_COLORS = { Unreal: '#2f6f8f', Unity: '#8a3a1c', 'Three.js': '#5b8a5a', Systems: '#6a5aa0', Motion: '#c88a1c' };
const GLYPH = { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞' };
const closeBtn = '<button class="close" data-close aria-label="Close panel">×</button>';

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}

export function renderAll(hooks = {}) {
  document.getElementById('tagline').textContent = profile.tagline;

  // ABOUT (Ludo home zones)
  document.getElementById('about').innerHTML = `${closeBtn}
    <h2>About me</h2><p class="sub">${esc(profile.title)} · ${esc(profile.location)}</p>
    <p>${esc(profile.summary)}</p>
    <div class="zones">${aboutZones.map((z) => `<div class="zone" style="background:${z.color}"><h3>${esc(z.title)}</h3><p>${esc(z.text)}</p></div>`).join('')}</div>
    <div class="row"><a class="btn" href="${profile.resume}" download>Download CV</a>
      <a class="btn alt" href="${profile.github}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn alt" href="${profile.framer}" target="_blank" rel="noopener">Earlier portfolio</a></div>`;

  // SKILLS (chess)
  document.getElementById('skills').innerHTML = `${closeBtn}
    <h2>Skills &amp; technologies</h2><p class="sub">Each chess piece is a skill group.</p>
    <div class="pieces">${skills.map((g) => `<div class="skill"><h3><span class="glyph" aria-hidden="true">${GLYPH[g.piece]}</span>${esc(g.group)}</h3>
      <ul>${g.items.map(([n, d]) => `<li>${esc(n)} <span>· ${esc(d)}</span></li>`).join('')}</ul></div>`).join('')}</div>
    <div class="chess-cta"><b>Play chess against my AI.</b> Easy, medium or hard.
      <div class="row"><button class="btn" data-game="chess">Play chess</button></div></div>`;

  // PROJECTS
  const groups = [...new Set(projects.map((p) => p.group))];
  document.getElementById('projects').innerHTML = `${closeBtn}
    <h2>Projects &amp; achievements</h2><p class="sub">${projects.length} projects. Each colour group on the property board is an engine or discipline.</p>
    <div class="tools"><input type="search" id="pSearch" placeholder="Search projects…" aria-label="Search projects" />
      <select id="pSort" aria-label="Sort projects"><option value="feat">Featured first</option><option value="year">Newest first</option><option value="name">A to Z</option></select></div>
    <div class="groups" id="pGroups"><button class="gbtn" data-g="" aria-pressed="true">All</button>${groups.map((g) => `<button class="gbtn" data-g="${esc(g)}" style="--gc:${GROUP_COLORS[g] || '#22160d'}" aria-pressed="false">${esc(g)}</button>`).join('')}</div>
    <div class="cards" id="pCards" style="margin-top:1rem"></div>`;
  const state = { q: '', g: '', sort: 'feat' };
  const draw = () => {
    let list = projects.filter((p) => (!state.g || p.group === state.g) &&
      (!state.q || (p.name + ' ' + p.summary + ' ' + p.stack + ' ' + p.role).toLowerCase().includes(state.q)));
    list = [...list].sort((a, b) => state.sort === 'name' ? a.name.localeCompare(b.name)
      : state.sort === 'year' ? (b.year || 0) - (a.year || 0) : (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    document.getElementById('pCards').innerHTML = list.map((p) => `<article class="card" style="--gc:${GROUP_COLORS[p.group] || '#22160d'}">
      ${p.image ? `<img loading="lazy" decoding="async" src="${p.image}" alt="${esc(p.name)} screenshot" />` : '<div class="ph">No image yet</div>'}
      <div class="body"><h3>${esc(p.name)}${p.featured ? '<span class="badge">FEATURED</span>' : ''}</h3>
        <div class="meta">${esc(p.stack)}${p.year ? ' · ' + p.year : ''}<br>${esc(p.role)}</div><p>${esc(p.summary)}</p>
        ${p.points ? `<details><summary>What I did</summary><ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
        <div class="links">${p.links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div></div></article>`).join('')
      || '<p>No project matches that search.</p>';
  };
  draw();
  const root = document.getElementById('projects');
  root.querySelector('#pSearch').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); draw(); });
  root.querySelector('#pSort').addEventListener('change', (e) => { state.sort = e.target.value; draw(); });
  root.querySelector('#pGroups').addEventListener('click', (e) => {
    const b = e.target.closest('.gbtn'); if (!b) return; state.g = b.dataset.g;
    root.querySelectorAll('.gbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw();
  });
  hooks.setProjectGroup = (g) => { state.g = g || ''; root.querySelectorAll('.gbtn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.g === state.g))); draw(); };

  // JOURNEY (Snakes & Ladders)
  document.getElementById('journey').innerHTML = `${closeBtn}
    <h2>Education &amp; experience</h2><p class="sub">Each square on the Snakes &amp; Ladders board is a step of my journey.</p>
    <ol class="timeline">${journey.map((j) => `<li><div class="when">${esc(j.when)}</div><h3>${esc(j.title)}</h3><div class="where">${esc(j.where)}</div><p>${esc(j.text)}</p></li>`).join('')}</ol>
    <div class="chess-cta"><b>Play Snakes &amp; Ladders against the computer.</b>
      <div class="row"><button class="btn" data-game="snakes">Play Snakes &amp; Ladders</button></div></div>`;

  // ACHIEVEMENTS (trophy shelf)
  document.getElementById('achievements').innerHTML = `${closeBtn}
    <h2>Achievements &amp; certificates</h2><p class="sub">Tap a frame to open the certificate.</p>
    <div class="shelf">${certificates.map((c) => `<button class="frame" data-cert="${c.id}"><img loading="lazy" decoding="async" src="${c.image}" alt="${esc(c.title)}" /><b>${esc(c.title)}</b><span>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</span></button>`).join('')}</div>`;

  // PROMO (CRT TV)
  const id = youtubeId(CONFIG.PROMO_VIDEO_URL);
  document.getElementById('promo').innerHTML = `${closeBtn}
    <h2>Promo video</h2><p class="sub">A short introduction to my work.</p>
    <div class="tv"><div class="screen" id="tvScreen">${id
      ? `<button class="btn" id="tvPlay">▶ Play video</button>`
      : '<div><b>Coming soon</b><br><small>The promo video will appear here.</small></div>'}</div></div>`;
  const play = document.getElementById('tvPlay');
  if (play) play.addEventListener('click', () => {
    document.getElementById('tvScreen').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="Promo video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });

  // CONTACT
  document.getElementById('contact').innerHTML = `${closeBtn}
    <h2>Contact</h2><p class="sub">${esc(profile.availability)}</p>
    <div class="contact-info"><span>✉ <a href="mailto:${profile.email}">${profile.email}</a></span><span>☎ ${profile.phone}</span><span>⌖ ${esc(profile.location)}</span></div>
    <form class="contact" id="contactForm" novalidate>
      <label>Name<input name="name" autocomplete="name" maxlength="80" required /><span class="field-err" data-err="name"></span></label>
      <label>Email<input name="email" type="email" autocomplete="email" maxlength="120" required /><span class="field-err" data-err="email"></span></label>
      <label>Subject<input name="subject" maxlength="120" required /><span class="field-err" data-err="subject"></span></label>
      <label>Message<textarea name="message" maxlength="2000" required></textarea><span class="field-err" data-err="message"></span></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <div id="contactMsg" role="status" aria-live="polite"></div>
      <div class="row"><button class="btn" id="sendBtn" type="submit">Send message</button></div>
    </form>`;

  // CREDITS
  document.getElementById('credits').innerHTML = `${closeBtn}
    <h2>Credits</h2>
    <p>Avatar: 3D character customised in Blender (skin tone, rig, animation set); animations from Mixamo. Original base-model credit: to be added (see the owner's notes).</p>
    <p>Built with Three.js, Vite, chess.js and Google Gemini; hosted on Vercel. Fonts: Bowlby One and Inter (SIL OFL).</p>
    ${credits.length ? `<ul>${credits.map((c) => `<li>${esc(c.name)} by ${esc(c.author)} (${esc(c.license)}) <a href="${c.url}" target="_blank" rel="noopener">source</a></li>`).join('')}</ul>` : '<p>3D props: built for this site. No third-party models are used yet; every one added will be listed here.</p>'}`;
}

export function openCert(id) {
  const c = certificates.find((x) => x.id === id); if (!c) return;
  const lb = document.getElementById('lightbox');
  document.getElementById('lbBody').innerHTML = `<img src="${c.image}" alt="${esc(c.title)}" /><h3 style="margin:.8rem 0 .2rem;color:#f3ead8">${esc(c.title)}</h3><p>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</p>${c.verify ? `<p><a href="${c.verify}" target="_blank" rel="noopener">Verify this certificate ↗</a></p>` : ''}`;
  lb.hidden = false; document.getElementById('lbClose').focus();
}
