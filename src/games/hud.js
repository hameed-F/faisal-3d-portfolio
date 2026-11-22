// Small game HUD at the bottom of the screen (shared by both games).
let el;
export function hud() {
  if (el) return el;
  el = document.createElement('div'); el.className = 'gamehud'; el.hidden = true; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Game controls');
  el.innerHTML = `<div class="gh-top"><b class="gh-title"></b><span class="gh-status" aria-live="polite"></span></div>
    <div class="gh-board"></div>
    <div class="gh-row"><span class="gh-extra"></span><button class="gh-btn go gh-main"></button><button class="gh-btn gh-restart">Restart</button><button class="gh-btn gh-exit">Exit game</button></div>`;
  document.body.appendChild(el);
  return el;
}
export function setHud({ title, status, main, extra }) {
  const h = hud();
  if (title !== undefined) h.querySelector('.gh-title').textContent = title;
  if (status !== undefined) h.querySelector('.gh-status').innerHTML = status;
  if (main !== undefined) { const b = h.querySelector('.gh-main'); b.hidden = !main; if (main) { b.textContent = main.label; b.disabled = !!main.disabled; } }
  if (extra !== undefined) h.querySelector('.gh-extra').innerHTML = extra;
}
