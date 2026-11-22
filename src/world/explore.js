import * as THREE from 'three';
import { ZONES } from './scene.js';

// Exploration layer: tracks what you have found, shows a banner when you arrive somewhere,
// draws a minimap (tap it for the full map + fast travel) and floats beacons over unexplored places.
const PLACES = [
  { id: 'skills', name: 'Chess Plaza', sub: 'Skills · play chess vs AI' },
  { id: 'journey', name: 'Snakes & Ladders Field', sub: 'Journey · you are the token' },
  { id: 'about', name: 'Ludo Garden', sub: 'About me' },
  { id: 'projects', name: 'Project Street', sub: '12 projects' },
  { id: 'achievements', name: 'Trophy Hall', sub: 'Certificates' },
  { id: 'promo', name: 'Drive-in Screen', sub: 'Promo video' },
  { id: 'contact', name: 'Post Box', sub: 'Contact me' },
  { id: 'car', name: 'The Car', sub: 'Press E to drive' },
];
const COLORS = { skills: '#c79a62', journey: '#d9a441', about: '#c8553d', projects: '#5b8a5a', achievements: '#e0b04a', promo: '#2f6f8f', contact: '#a8462a', car: '#8a3e2c' };

export function createExplore({ scene, world, getPlayer, getCar, onTravel, sfx, toast }) {
  let found = new Set(); try { found = new Set(JSON.parse(localStorage.getItem('explored') || '[]')); } catch { /* private mode */ }
  const save = () => { try { localStorage.setItem('explored', JSON.stringify([...found])); } catch { /* ignore */ } };

  // ----- DOM: tracker, banner, minimap, full map -----
  const hud = document.createElement('div'); hud.className = 'explore'; hud.hidden = true;
  hud.innerHTML = `<button class="ex-count" aria-expanded="false"><span class="ex-n">0/8</span> explored</button>
    <ul class="ex-list" hidden>${PLACES.map((p) => `<li data-id="${p.id}"><i></i><b>${p.name}</b><span>${p.sub}</span></li>`).join('')}</ul>
    <canvas class="minimap" width="200" height="200" aria-label="Minimap, tap for the full map" role="button" tabindex="0"></canvas>`;
  document.body.appendChild(hud);
  const banner = document.createElement('div'); banner.className = 'zone-banner'; banner.hidden = true; document.body.appendChild(banner);
  const map = document.createElement('div'); map.className = 'bigmap'; map.hidden = true; map.setAttribute('role', 'dialog'); map.setAttribute('aria-label', 'World map');
  map.innerHTML = `<div class="bm-box"><div class="bm-head"><b>World map</b><span>Tap a place to travel there</span><button class="bm-x" aria-label="Close map">×</button></div><canvas width="560" height="560"></canvas><div class="bm-list"></div></div>`;
  document.body.appendChild(map);
  const countBtn = hud.querySelector('.ex-count'); const list = hud.querySelector('.ex-list'); const mini = hud.querySelector('.minimap'); const mctx = mini.getContext('2d');
  const bigC = map.querySelector('canvas'); const bctx = bigC.getContext('2d');
  countBtn.addEventListener('click', () => { list.hidden = !list.hidden; countBtn.setAttribute('aria-expanded', String(!list.hidden)); });
  const openMap = () => { drawMap(bctx, 560, 1.0, true); renderList(); map.hidden = false; map.querySelector('.bm-x').focus(); };
  mini.addEventListener('click', openMap); mini.addEventListener('keydown', (e) => { if (e.key === 'Enter') openMap(); });
  map.querySelector('.bm-x').addEventListener('click', () => { map.hidden = true; });
  map.addEventListener('click', (e) => { if (e.target === map) map.hidden = true; const b = e.target.closest('[data-travel]'); if (b) { map.hidden = true; onTravel(b.dataset.travel); } });
  addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && !e.target.closest?.('input,textarea,select') && !hud.hidden) { map.hidden ? openMap() : (map.hidden = true); } if (e.key === 'Escape') map.hidden = true; });
  function renderList() { map.querySelector('.bm-list').innerHTML = PLACES.filter((p) => p.id !== 'car').map((p) => `<button data-travel="${p.id}" class="${found.has(p.id) ? 'done' : ''}"><i style="background:${COLORS[p.id]}"></i>${p.name}<span>${found.has(p.id) ? '✓ explored' : 'not yet'}</span></button>`).join(''); }
  function refresh() {
    hud.querySelector('.ex-n').textContent = `${found.size}/${PLACES.length}`;
    list.querySelectorAll('li').forEach((li) => li.classList.toggle('done', found.has(li.dataset.id)));
    beacons.forEach((b) => { b.group.visible = !found.has(b.id); });
  }

  // ----- minimap drawing (world radius ~60 m) -----
  const R = 62;
  function drawMap(ctx, size, scale, big) {
    const p = getPlayer(); const c = size / 2; const k = (size / 2 - 6) / R;
    const toXY = (x, z) => big ? [c + x * k, c + z * k] : [c + (x - p.x) * k * 1.6, c + (z - p.z) * k * 1.6];
    ctx.clearRect(0, 0, size, size); ctx.save(); ctx.beginPath(); ctx.arc(c, c, c - 2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2c3a26'; ctx.fillRect(0, 0, size, size);
    // ring road + paths
    ctx.strokeStyle = '#4a4744'; ctx.lineWidth = Math.max(3, 5 * k * (big ? 1 : 1.6)); ctx.beginPath(); const [rx, ry] = toXY(0, 0); ctx.arc(rx, ry, 48.5 * k * (big ? 1 : 1.6), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#8a6e48'; ctx.lineWidth = Math.max(2, 3 * k * (big ? 1 : 1.6));
    for (const z of Object.values(ZONES)) { ctx.beginPath(); ctx.moveTo(rx, ry); const [x, y] = toXY(z.pad.x, z.pad.z); ctx.lineTo(x, y); ctx.stroke(); }
    // zones
    for (const [id, z] of Object.entries(ZONES)) {
      const [x, y] = toXY(z.center.x, z.center.z); const s = Math.max(6, z.size * k * (big ? 1 : 1.6));
      ctx.fillStyle = found.has(id) ? COLORS[id] : '#5c6266'; ctx.globalAlpha = found.has(id) ? 1 : 0.8; ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.globalAlpha = 1;
      if (big) { ctx.fillStyle = '#fff'; ctx.font = '600 13px "Chakra Petch", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(PLACES.find((q) => q.id === id).name + (found.has(id) ? ' ✓' : ''), x, y - s / 2 - 6); }
      else if (!found.has(id)) { ctx.fillStyle = '#e8b25a'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', x, y + 4); }
    }
    // car
    const cp = getCar(); const [cx, cy] = toXY(cp.x, cp.z); ctx.fillStyle = '#e05a3a'; ctx.fillRect(cx - 3, cy - 3, 6, 6);
    // player arrow
    const [px, py] = toXY(p.x, p.z); ctx.save(); ctx.translate(px, py); ctx.rotate(-p.rot + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14100a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.restore(); ctx.strokeStyle = 'rgba(232,178,90,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, c, c - 2, 0, Math.PI * 2); ctx.stroke();
    if (!big) { ctx.fillStyle = '#e8b25a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', c, 13); }
  }

  // ----- beacons over unexplored zones (visible from far away) -----
  const beacons = [];
  const bGeo = new THREE.OctahedronGeometry(0.55, 0); const bMat = new THREE.MeshBasicMaterial({ color: '#ffcf6a' });
  for (const [id, z] of Object.entries(ZONES)) {
    const g = new THREE.Group(); g.position.copy(z.pad).setY(5.2); const gem = new THREE.Mesh(bGeo, bMat); g.add(gem);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), new THREE.MeshBasicMaterial({ color: '#ffcf6a', transparent: true, opacity: 0.5 })); col.position.y = -1.4; g.add(col);
    scene.add(g); beacons.push({ id, group: g, gem });
  }
  // highlight ring for the nearest interactable
  const hl = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false })); hl.rotation.x = -Math.PI / 2; hl.visible = false; scene.add(hl);

  // ----- arrival detection -----
  let current = null; let bannerT = null;
  function inZone(p) { for (const [id, z] of Object.entries(ZONES)) { const h = z.size / 2 + (id === 'contact' ? 2.5 : 3); if (Math.abs(p.x - z.center.x) < h && Math.abs(p.z - z.center.z) < h) return id; } return null; }
  function discover(id, quiet) {
    if (found.has(id)) return false; found.add(id); save(); refresh();
    if (!quiet) { sfx?.('ladder'); const pl = PLACES.find((q) => q.id === id); toast?.(`<b>Discovered: ${pl.name}</b> · ${found.size}/${PLACES.length} explored${found.size === PLACES.length ? '<br>🎉 You explored the whole world!' : ''}`, 4500); }
    return true;
  }
  function showBanner(id) {
    const pl = PLACES.find((q) => q.id === id); if (!pl) return;
    banner.innerHTML = `<small>${found.has(id) ? 'Welcome back to' : 'Now entering'}</small><b>${pl.name}</b><span>${pl.sub}</span>`; banner.hidden = false; banner.classList.remove('out');
    clearTimeout(bannerT); bannerT = setTimeout(() => { banner.classList.add('out'); setTimeout(() => { banner.hidden = true; }, 400); }, 2400);
  }
  let acc = 0;
  function update(dt, t, nearInteractable, mode) {
    beacons.forEach((b) => { b.gem.rotation.y = t * 1.5; b.group.position.y = 5.2 + Math.sin(t * 2 + b.group.position.x) * 0.25; });
    if (nearInteractable && nearInteractable.pos && mode === 'walk') { hl.visible = true; hl.position.set(nearInteractable.pos.x, 0.06, nearInteractable.pos.z); const s = 1 + Math.sin(t * 5) * 0.08; hl.scale.set(s * (nearInteractable.radius > 2.5 ? 1.6 : 1), s * (nearInteractable.radius > 2.5 ? 1.6 : 1), 1); } else hl.visible = false;
    if (mode !== 'walk' && mode !== 'car') return;
    const p = getPlayer(); const z = inZone(p);
    if (z !== current) { current = z; if (z) { showBanner(z); discover(z); } }
    acc += dt; if (acc > 0.1) { acc = 0; drawMap(mctx, 200, 1, false); }
  }
  refresh();
  return {
    update, discover: (id) => discover(id, false), show: (v) => { hud.hidden = !v; if (v) drawMap(mctx, 200, 1, false); }, get found() { return found; },
    reset: () => { found = new Set(); save(); refresh(); },
  };
}
