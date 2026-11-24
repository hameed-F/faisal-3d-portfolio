// HTML for every section. The same builders feed the 3D screens and the plain text version.
import { CONFIG, profile, aboutZones, skills, journey, projects, certificates, credits } from './content.js';

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const youtubeId = (url) => { const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return m ? m[1] : ''; };
const GROUP_COLORS = { Unreal: '#2f6f8f', Unity: '#b0502c', 'Three.js': '#5b8a5a', Systems: '#6a5aa0', Motion: '#c88a1c' };

export const SECTION_TITLES = { about: 'About me', edu: 'Education & experience', projects: 'Projects', skills: 'Skills & technologies', contact: 'Contact me', video: 'Promo video', credits: 'Credits' };

export const html = {
  about: () => `<h2>About me</h2><p class="sub">${esc(profile.title)} · ${esc(profile.location)}</p>
    <p>${esc(profile.summary)}</p>
    <div class="zones">${aboutZones.map((z) => `<div class="zone" style="--zc:${z.color}"><h3>${esc(z.title)}</h3><p>${esc(z.text)}</p></div>`).join('')}</div>
    <h3 class="strip-h">Trophies</h3>
    <div class="trophies">${certificates.map((c) => `<button type="button" class="trophy" data-cert="${c.id}" aria-label="Open certificate: ${esc(c.title)}"><img loading="lazy" decoding="async" src="${c.image}" alt="" /><span>${esc(c.title)}</span></button>`).join('')}</div>
    <div class="row"><a class="btn" href="${profile.resume}" download>Download CV</a><a class="btn alt" href="${profile.github}" target="_blank" rel="noopener">GitHub</a><a class="btn alt" href="${profile.framer}" target="_blank" rel="noopener">Earlier portfolio</a></div>`,

  edu: () => `<h2>Education &amp; experience</h2>
    <ol class="timeline">${journey.map((j) => `<li><div class="when">${esc(j.when)}</div><h3>${esc(j.title)}</h3><div class="where">${esc(j.where)}</div><p>${esc(j.text)}</p></li>`).join('')}</ol>`,

  skills: () => `<h2>Skills &amp; technologies</h2>
    <div class="skillgrid">${skills.map((g) => `<div class="skill"><h3>${esc(g.group)}</h3><ul>${g.items.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ul></div>`).join('')}</div>`,

  projects: () => {
    const groups = [...new Set(projects.map((p) => p.group))];
    return `<h2>Projects</h2><p class="sub">${projects.length} projects. Tap the arrow on a card for the details.</p>
      <div class="groups" id="pGroups"><button type="button" class="gbtn" data-g="" aria-pressed="true">All</button>${groups.map((g) => `<button type="button" class="gbtn" data-g="${esc(g)}" style="--gc:${GROUP_COLORS[g] || '#444'}" aria-pressed="false">${esc(g)}</button>`).join('')}</div>
      <div class="pgrid" id="pGrid">${projects.map((p) => `<article class="pcard" data-g="${esc(p.group)}" style="--gc:${GROUP_COLORS[p.group] || '#444'}">
        ${p.image ? `<img loading="lazy" decoding="async" src="${p.image}" alt="${esc(p.name)} screenshot" />` : '<div class="ph">No image yet</div>'}
        <div class="pbody"><h3>${esc(p.name)}</h3><div class="meta">${esc(p.stack)}${p.year ? ' · ' + p.year : ''}</div>
          <button type="button" class="arrow" aria-expanded="false" aria-label="Show details of ${esc(p.name)}"><span aria-hidden="true">▾</span></button>
          <div class="pdetail" hidden><p class="meta">${esc(p.role)}</p><p>${esc(p.summary)}</p>
            ${p.points ? `<ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            <div class="links">${p.links.map(([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</div></div></div></article>`).join('')}</div>`;
  },

  contact: () => `<h2>Contact me</h2><p class="sub">${esc(profile.availability)}</p>
    <div class="contact-info"><a href="mailto:${profile.email}">✉ ${profile.email}</a><span>☎ ${profile.phone}</span><span>⌖ ${esc(profile.location)}</span></div>
    <form class="contact" id="contactForm" novalidate>
      <label>Name<input name="name" autocomplete="name" maxlength="80" required /><span class="field-err" data-err="name"></span></label>
      <label>Email<input name="email" type="email" autocomplete="email" maxlength="120" required /><span class="field-err" data-err="email"></span></label>
      <label>Subject<input name="subject" maxlength="120" required /><span class="field-err" data-err="subject"></span></label>
      <label>Message<textarea name="message" maxlength="2000" rows="4" required></textarea><span class="field-err" data-err="message"></span></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <div id="contactMsg" role="status" aria-live="polite"></div>
      <div class="row"><button class="btn" id="sendBtn" type="submit">Send message</button></div>
    </form>`,

  video: () => {
    const id = youtubeId(CONFIG.PROMO_VIDEO_URL);
    return `<h2>Promo video</h2><p class="sub">A short introduction to my work.</p>
      <div class="vid" id="vidBox">${id ? `<button type="button" class="btn big" id="vidPlay">▶ Play the video</button>` : '<div class="soon"><b>Coming soon</b><span>The promo video will appear here.</span></div>'}</div>`;
  },

  credits: () => `<h2>Credits</h2>
    <p>Avatar: a 3D character customised in Blender (skin tone, rig); animations from Mixamo. Everything else on the board (tiles, icons, ladders, snakes, dice, lamps) is built in code for this site.</p>
    <p>Built with Three.js and Vite, hosted on Vercel. Chat answers use Google Gemini. Fonts: Fredoka, Nunito Sans and Noto Naskh Arabic (SIL OFL).</p>
    ${credits.length ? `<ul>${credits.map((c) => `<li>${esc(c.name)} by ${esc(c.author)} (${esc(c.license)}) <a href="${c.url}" target="_blank" rel="noopener">source</a></li>`).join('')}</ul>` : '<p>No third-party 3D models are used.</p>'}`,
};

/** Wire up interactions inside a freshly mounted section (collapsible project cards, group filter, video player, contact form). */
export function bind(root, id, { onSent } = {}) {
  if (id === 'projects') {
    root.querySelector('#pGroups')?.addEventListener('click', (e) => {
      const b = e.target.closest('.gbtn'); if (!b) return;
      root.querySelectorAll('.gbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      root.querySelectorAll('.pcard').forEach((c) => { c.hidden = !!b.dataset.g && c.dataset.g !== b.dataset.g; });
    });
    root.querySelectorAll('.arrow').forEach((a) => a.addEventListener('click', () => {
      const card = a.closest('.pcard'); const d = card.querySelector('.pdetail'); const open = a.getAttribute('aria-expanded') !== 'true';
      a.setAttribute('aria-expanded', String(open)); a.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} details of ${card.querySelector('h3').textContent}`); d.hidden = !open; card.classList.toggle('open', open);
    }));
  }
  if (id === 'video') {
    const id2 = youtubeId(CONFIG.PROMO_VIDEO_URL);
    root.querySelector('#vidPlay')?.addEventListener('click', () => { root.querySelector('#vidBox').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id2}?autoplay=1&rel=0" title="Promo video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; });
  }
  if (id === 'contact') bindContact(root, onSent);
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validate(d) {
  const e = {};
  if (!d.name.trim() || d.name.trim().length < 2) e.name = 'Please enter your name (at least 2 characters).';
  if (!emailRe.test(d.email.trim())) e.email = 'Please enter a valid email address.';
  if (!d.subject.trim() || d.subject.trim().length < 3) e.subject = 'Please enter a subject (at least 3 characters).';
  if (d.message.trim().length < 10) e.message = 'Please write a message (at least 10 characters).';
  return e;
}
function bindContact(root, onSent) {
  const form = root.querySelector('#contactForm'); if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries()); const errs = validate(d);
    form.querySelectorAll('[data-err]').forEach((s) => { s.textContent = errs[s.dataset.err] || ''; });
    const msg = form.querySelector('#contactMsg'); msg.className = ''; msg.textContent = '';
    if (Object.keys(errs).length) { msg.className = 'msg err'; msg.textContent = 'Please fix the highlighted fields.'; return; }
    const btn = form.querySelector('#sendBtn'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { msg.className = 'msg ok'; msg.textContent = 'Message sent! Thank you, I will reply by email.'; form.reset(); onSent?.(); }
      else { msg.className = 'msg err'; msg.textContent = j.error || 'Sorry, the message could not be sent. Please email me directly.'; if (j.fields) form.querySelectorAll('[data-err]').forEach((s) => { s.textContent = j.fields[s.dataset.err] || ''; }); }
    } catch { msg.className = 'msg err'; msg.textContent = 'Network problem. Please try again, or email me directly.'; }
    finally { btn.disabled = false; btn.textContent = 'Send message'; }
  });
}

export function openCert(id) {
  const c = certificates.find((x) => x.id === id); if (!c) return;
  document.getElementById('lbBody').innerHTML = `<img src="${c.image}" alt="${esc(c.title)}" /><h3>${esc(c.title)}</h3><p>${esc(c.issuer)}${c.date ? ' · ' + esc(c.date) : ''}</p>${c.verify ? `<p><a href="${c.verify}" target="_blank" rel="noopener">Verify ↗</a></p>` : ''}`;
  const lb = document.getElementById('lightbox'); lb.hidden = false; document.getElementById('lbClose').focus();
}
