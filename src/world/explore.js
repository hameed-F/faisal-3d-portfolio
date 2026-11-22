// Exploration layer for the hut + board worlds: tracks what you've found, shows a banner when you arrive,
// draws a minimap outdoors (pointing to the hut) and a world map with fast travel.
const PLACES = [
  { id: 'car', name: 'The Car', sub: 'Press E next to it to drive' },
  { id: 'hut', name: 'The Hut', sub: 'Game night: the board table' },
  { id: 'projects', name: 'Project Street', sub: 'Walk into each house' },
  { id: 'journey', name: 'Snakes & Ladders', sub: 'Education & experience' },
  { id: 'about', name: 'Ludo Garden', sub: 'About me' },
  { id: 'skills', name: 'Chess Plaza', sub: 'Skills · play vs AI' },
  { id: 'trophy', name: 'Trophy Hall', sub: 'Certificates' },
  { id: 'phone', name: 'The Telephone', sub: 'Contact me' },
];
const AREA_NAMES = { outdoor: 'The Forest', hut: 'The Hut', projects: 'Project Street', journey: 'Snakes & Ladders', about: 'Ludo Garden', skills: 'Chess Plaza', trophy: 'Trophy Hall', house: 'Project House' };
const AREA_SUB = { outdoor: 'Find the hut', hut: 'Click a board on the table to jump in', projects: 'Every house is one project', journey: 'Roll the giant dice to play', about: 'Read the plaques', skills: 'Statues = skill groups', trophy: 'Certificates on the walls', house: 'Read the walls · arcade = link' };

export function createExplore({ getPlayer, getCar, getArea, hut, onTravel, sfx, toast, onDiscover }) {
  let found = new Set(); try { found = new Set(JSON.parse(localStorage.getItem('explored2') || '[]')); } catch { /* private mode */ }
  const save = () => { try { localStorage.setItem('explored2', JSON.stringify([...found])); } catch { /* ignore */ } };

  const hudEl = document.createElement('div'); hudEl.className = 'explore'; hudEl.hidden = true;
  hudEl.innerHTML = `<button class="ex-count" aria-expanded="false"><span class="ex-n">0/8</span> explored</button>
    <ul class="ex-list" hidden>${PLACES.map((p) => `<li data-id="${p.id}"><i></i><b>${p.name}</b><span>${p.sub}</span></li>`).join('')}</ul>
    <div class="ex-where"><b></b><span></span></div>
    <canvas class="minimap" width="200" height="200" aria-label="Minimap, tap for the world map" role="button" tabindex="0"></canvas>`;
  document.body.appendChild(hudEl);
  const banner = document.createElement('div'); banner.className = 'zone-banner'; banner.hidden = true; document.body.appendChild(banner);
  const map = document.createElement('div'); map.className = 'bigmap'; map.hidden = true; map.setAttribute('role', 'dialog'); map.setAttribute('aria-label', 'World map');
  map.innerHTML = '<div class="bm-box"><div class="bm-head"><b>World map</b><span>Tap a place to travel there</span><button class="bm-x" aria-label="Close map">×</button></div><div class="bm-list"></div></div>';
  document.body.appendChild(map);
  const countBtn = hudEl.querySelector('.ex-count'); const list = hudEl.querySelector('.ex-list'); const mini = hudEl.querySelector('.minimap'); const ctx = mini.getContext('2d');
  countBtn.addEventListener('click', () => { list.hidden = !list.hidden; countBtn.setAttribute('aria-expanded', String(!list.hidden)); });
  const TRAVEL = [['outdoor', 'The Forest'], ['hut', 'The Hut'], ['projects', 'Project Street'], ['journey', 'Snakes & Ladders'], ['about', 'Ludo Garden'], ['skills', 'Chess Plaza'], ['trophy', 'Trophy Hall']];
  const openMap = () => { map.querySelector('.bm-list').innerHTML = TRAVEL.map(([id, n]) => `<button data-travel="${id}" class="${found.has(id) || id === 'outdoor' ? 'done' : ''}">${n}<span>${getArea() === id ? 'you are here' : found.has(id) ? '✓ explored' : 'not yet'}</span></button>`).join(''); map.hidden = false; map.querySelector('.bm-x').focus(); };
  mini.addEventListener('click', openMap); mini.addEventListener('keydown', (e) => { if (e.key === 'Enter') openMap(); });
  hudEl.querySelector('.ex-where').addEventListener('click', openMap);
  map.querySelector('.bm-x').addEventListener('click', () => { map.hidden = true; });
  map.addEventListener('click', (e) => { if (e.target === map) map.hidden = true; const b = e.target.closest('[data-travel]'); if (b) { map.hidden = true; onTravel(b.dataset.travel); } });
  addEventListener('keydown', (e) => { if ((e.key === 'm' || e.key === 'M') && !e.target.closest?.('input,textarea,select') && !hudEl.hidden) { map.hidden ? openMap() : (map.hidden = true); } if (e.key === 'Escape') map.hidden = true; });

  function refresh() { hudEl.querySelector('.ex-n').textContent = `${found.size}/${PLACES.length}`; list.querySelectorAll('li').forEach((li) => li.classList.toggle('done', found.has(li.dataset.id))); }
  function setWhere(id) { hudEl.querySelector('.ex-where b').textContent = AREA_NAMES[id] || ''; hudEl.querySelector('.ex-where span').textContent = AREA_SUB[id] || ''; mini.hidden = id !== 'outdoor'; }

  // outdoor minimap: north-up, centred on the player, with the hut marked and an arrow at the edge if it's off-map
  function drawMini() {
    const p = getPlayer(); const s = 200; const c = s / 2; const k = 1.25; const tx = (x) => c + (x - p.x) * k; const tz = (z) => c + (z - p.z) * k;
    ctx.clearRect(0, 0, s, s); ctx.save(); ctx.beginPath(); ctx.arc(c, c, c - 2, 0, 7); ctx.clip(); ctx.fillStyle = '#2c3a26'; ctx.fillRect(0, 0, s, s);
    // road
    ctx.strokeStyle = '#5a5450'; ctx.lineWidth = 6; ctx.beginPath(); [[5, 52], [12, 30], [-7, 10], [4, -10], [0, -21]].forEach(([x, z], i) => (i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z)))); ctx.stroke();
    // hut
    const hx = tx(hut.x); const hz = tz(hut.z); ctx.fillStyle = '#e8b25a'; ctx.fillRect(hx - 9, hz - 7, 18, 14); ctx.fillStyle = '#14100a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HUT', hx, hz + 4);
    // car
    const cp = getCar(); ctx.fillStyle = '#e05a3a'; ctx.fillRect(tx(cp.x) - 4, tz(cp.z) - 4, 8, 8);
    ctx.restore();
    // arrow at the rim pointing to the hut when it's off the map
    const dx = hut.x - p.x; const dz = hut.z - p.z; const dist = Math.hypot(dx, dz);
    if (dist * k > c - 12) { const an = Math.atan2(dz, dx); ctx.save(); ctx.translate(c + Math.cos(an) * (c - 14), c + Math.sin(an) * (c - 14)); ctx.rotate(an); ctx.fillStyle = '#e8b25a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
    // player arrow
    ctx.save(); ctx.translate(c, c); ctx.rotate(-p.rot + Math.PI); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#14100a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = 'rgba(232,178,90,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, c, c - 2, 0, 7); ctx.stroke();
    ctx.fillStyle = '#e8b25a'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', c, 13);
    ctx.fillStyle = '#fff'; ctx.font = '600 12px sans-serif'; ctx.fillText(`${Math.round(dist)} m to the hut`, c, s - 12);
  }
  function discover(id) {
    if (found.has(id)) return false; found.add(id); save(); refresh(); sfx?.('ladder'); onDiscover?.(id);
    const pl = PLACES.find((q) => q.id === id); if (pl) toast?.(`<b>Discovered: ${pl.name}</b> · ${found.size}/${PLACES.length} explored${found.size === PLACES.length ? '<br>🎉 You explored everything!' : ''}`, 4200);
    return true;
  }
  let bannerT = null;
  function enterArea(id) {
    setWhere(id); if (id === 'house') return;
    banner.innerHTML = `<small>${id === 'outdoor' ? 'Back in' : 'Now entering'}</small><b>${AREA_NAMES[id]}</b><span>${AREA_SUB[id]}</span>`; banner.hidden = false; banner.classList.remove('out');
    clearTimeout(bannerT); bannerT = setTimeout(() => { banner.classList.add('out'); setTimeout(() => { banner.hidden = true; }, 400); }, 2600);
  }
  let acc = 0;
  function update(dt) { if (hudEl.hidden || mini.hidden) return; acc += dt; if (acc > 0.1) { acc = 0; drawMini(); } }
  refresh(); setWhere('outdoor');
  return { update, discover, enterArea, show: (v) => { hudEl.hidden = !v; }, get found() { return found; } };
}
