// Small, clean info card: a title, a meta line, a few short lines, optional image and buttons.
let el; let onCloseCb = null;
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function ensure() {
  if (el) return el;
  el = document.createElement('aside'); el.className = 'icard'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) closeCard(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.hidden) closeCard(); });
  return el;
}
/** card({ tag, title, meta, img, lines: [..], tiles: [{t, d, c}], actions: [{label, href|onClick, primary}] }) */
export function showCard(c, onClose) {
  const e = ensure(); onCloseCb = onClose || null;
  e.style.setProperty('--accent', c.accent || '#d64b3a');
  e.innerHTML = `<button class="ic-x" data-x aria-label="Close">×</button>
    ${c.img ? `<img class="ic-img" src="${c.img}" alt="" />` : ''}
    ${c.tag ? `<span class="ic-tag">${esc(c.tag)}</span>` : ''}
    <h3>${esc(c.title)}</h3>
    ${c.meta ? `<p class="ic-meta">${esc(c.meta)}</p>` : ''}
    ${c.lines?.length ? `<ul class="ic-lines">${c.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
    ${c.tiles?.length ? `<div class="ic-tiles">${c.tiles.map((t) => `<div style="--c:${t.c || '#3d6b8c'}"><b>${esc(t.t)}</b><span>${esc(t.d)}</span></div>`).join('')}</div>` : ''}
    ${c.actions?.length ? `<div class="ic-acts">${c.actions.map((a, i) => (a.href ? `<a class="ic-btn ${a.primary ? 'p' : ''}" href="${a.href}" ${a.download ? 'download' : 'target="_blank" rel="noopener"'}>${esc(a.label)}</a>` : `<button class="ic-btn ${a.primary ? 'p' : ''}" data-act="${i}">${esc(a.label)}</button>`)).join('')}</div>` : ''}`;
  e.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => { const a = c.actions[+b.dataset.act]; closeCard(true); a.onClick?.(); }; });
  e.hidden = false; e.classList.remove('in'); void e.offsetWidth; e.classList.add('in');
}
export function closeCard(silent) { if (!el || el.hidden) return; el.hidden = true; const cb = onCloseCb; onCloseCb = null; if (!silent) cb?.(); else cb?.(true); }
export const cardOpen = () => el && !el.hidden;
