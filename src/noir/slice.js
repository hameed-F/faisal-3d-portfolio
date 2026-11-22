// SKILL SLICE: a swipe game. Film cans fly up, each holds one of my skills. Slice them; don't slice the dynamite.
import { skills } from '../content.js';

const short = (n) => n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+&\s+/g, ' & ').trim();
export function startSlice({ onEnd, sfx = () => {}, lite = false }) {
  const all = skills.flatMap((g) => g.items.map(([n, w]) => ({ name: short(n), full: n, where: w, group: g.group })));
  const wrap = document.createElement('div'); wrap.className = 'slice'; wrap.innerHTML = `<canvas></canvas><div class="sl-hud"><span class="sl-score">0 / ${all.length}</span><span class="sl-lives">✦✦✦</span><span class="sl-time">60</span><button class="sl-x" aria-label="Quit">✕</button></div><div class="sl-got" aria-live="polite"></div><div class="sl-start"><div><p class="it-orn">❦</p><h2>Skill Slice</h2><p>Swipe across the film cans to cut out my skills.<br/>Leave the dynamite alone. Three sparks and you're out.</p><div class="reel-acts" style="justify-content:center"><button class="rb p sl-go">Play ▸</button><button class="rb sl-x2">Back to the street</button></div><details class="skill-list"><summary>Just show me the skills list</summary>${skills.map((g) => `<h3>${g.group}</h3><ul>${g.items.map(([n, w]) => `<li><b>${n}</b> <span>${w}</span></li>`).join('')}</ul>`).join('')}</details></div></div>`;
  document.body.appendChild(wrap);
  const cv = wrap.querySelector('canvas'); const g = cv.getContext('2d'); const dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
  const $ = (s) => wrap.querySelector(s);
  let W = 0; let H = 0; const resize = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }; resize(); addEventListener('resize', resize);
  const objs = []; const bits = []; const trail = []; let lives = 3; let left = 60; let running = false; let got = new Set(); let spawnT = 0; let raf = 0; let last = 0; let queue = [];
  const R = () => Math.max(34, Math.min(W, H) * 0.06);
  function spawn() {
    const bomb = Math.random() < 0.18 && got.size > 1; if (!queue.length) queue = all.filter((s) => !got.has(s.name)).sort(() => Math.random() - 0.5);
    const s = bomb ? null : queue.pop(); if (!bomb && !s) return;
    const x = W * (0.2 + Math.random() * 0.6); const vy = -(H * (0.95 + Math.random() * 0.3)); const vx = (W / 2 - x) * (0.3 + Math.random() * 0.5);
    objs.push({ x, y: H + R(), vx, vy, r: R(), rot: 0, vr: (Math.random() - 0.5) * 4, s, bomb });
  }
  function slice(o) {
    o.dead = true;
    if (o.bomb) { lives--; sfx('lose'); $('.sl-lives').textContent = '✦'.repeat(Math.max(0, lives)) + '·'.repeat(3 - Math.max(0, lives)); flash = 1; if (lives <= 0) end(); return; }
    sfx('tick'); got.add(o.s.name); $('.sl-score').textContent = `${got.size} / ${all.length}`;
    [-1, 1].forEach((d) => bits.push({ x: o.x, y: o.y, vx: o.vx * 0.4 + d * 120, vy: -160, r: o.r, rot: o.rot, vr: d * 5, half: d, life: 1.4 }));
    const chip = document.createElement('div'); chip.className = 'sl-chip'; chip.innerHTML = `<b>${o.s.full}</b><span>${o.s.where}</span>`; $('.sl-got').prepend(chip); setTimeout(() => chip.classList.add('old'), 2200);
    if (got.size === all.length) end(true);
  }
  let flash = 0;
  function seg(ax, ay, bx, by, o) { const dx = bx - ax; const dy = by - ay; const L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((o.x - ax) * dx + (o.y - ay) * dy) / L)); const px = ax + dx * t - o.x; const py = ay + dy * t - o.y; return px * px + py * py < o.r * o.r; }
  let down = false; let lx = 0; let ly = 0;
  cv.addEventListener('pointerdown', (e) => { down = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { const x = e.clientX; const y = e.clientY; if (down || e.pointerType === 'mouse') { trail.push({ x, y, t: performance.now() }); if (running) for (const o of objs) if (!o.dead && seg(lx, ly, x, y, o)) slice(o); } lx = x; ly = y; });
  const upH = () => { down = false; }; cv.addEventListener('pointerup', upH); cv.addEventListener('pointercancel', upH);
  function drawCan(o) {
    g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
    if (o.half) { g.beginPath(); g.rect(o.half < 0 ? -o.r * 1.2 : 0, -o.r * 1.2, o.r * 1.2, o.r * 2.4); g.clip(); }
    if (o.bomb) { g.fillStyle = '#7a1c18'; g.fillRect(-o.r * 0.35, -o.r * 0.9, o.r * 0.7, o.r * 1.8); g.fillStyle = '#d8c9a8'; g.fillRect(-o.r * 0.38, -o.r * 0.2, o.r * 0.76, o.r * 0.4); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -o.r * 0.9); g.quadraticCurveTo(o.r * 0.4, -o.r * 1.3, o.r * 0.2, -o.r * 1.5); g.stroke(); g.fillStyle = Math.random() < 0.5 ? '#ffd28a' : '#fff'; g.beginPath(); g.arc(o.r * 0.2, -o.r * 1.5, 4 + Math.random() * 3, 0, 7); g.fill(); g.restore(); return; }
    g.fillStyle = '#2a2622'; g.beginPath(); g.arc(0, 0, o.r, 0, 7); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#14110e'; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * o.r * 0.55, Math.sin(a) * o.r * 0.55, o.r * 0.17, 0, 7); g.fill(); }
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(0, 0, o.r * 0.14, 0, 7); g.fill();
    g.rotate(-o.rot); g.fillStyle = '#f3e6c4'; g.font = `600 ${Math.max(11, o.r * 0.32)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = o.s.name.split(' '); const lines = []; let cur = ''; words.forEach((w) => { if ((cur + ' ' + w).trim().length > 12) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); lines.push(cur.trim());
    g.fillStyle = 'rgba(10,8,6,.78)'; const bh = lines.length * o.r * 0.36 + 8; g.fillRect(-o.r * 1.15, o.r + 4, o.r * 2.3, bh); g.fillStyle = '#f3e6c4'; lines.forEach((l, i) => g.fillText(l, 0, o.r + 4 + 4 + o.r * 0.18 + i * o.r * 0.36));
    g.restore();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (running) { left -= dt; $('.sl-time').textContent = Math.ceil(Math.max(0, left)); if (left <= 0) end(); spawnT -= dt; if (spawnT <= 0) { spawn(); if (Math.random() < 0.55) spawn(); if (Math.random() < 0.2) spawn(); spawnT = 0.65 + Math.random() * 0.4; } }
    const grav = H * 1.1;
    // background: dark theatre, sepia grain, film scratches
    g.fillStyle = '#100d0b'; g.fillRect(0, 0, W, H); const rg = g.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H / 2, Math.max(W, H) * 0.7); rg.addColorStop(0, 'rgba(201,162,74,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const cw = Math.max(28, W * 0.07); for (const side of [0, 1]) { const x0 = side ? W - cw : 0; const cg = g.createLinearGradient(x0, 0, x0 + cw, 0); for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, i % 2 ? '#3a0f0c' : '#6e1f1a'); g.fillStyle = cg; g.fillRect(x0, 0, cw, H); }
    g.fillStyle = '#4a120e'; g.fillRect(0, 0, W, Math.max(18, H * 0.04)); g.fillStyle = '#c9a24a'; g.fillRect(0, Math.max(18, H * 0.04), W, 2); g.fillStyle = '#1d1712'; g.fillRect(0, H - H * 0.06, W, H * 0.06); g.fillStyle = 'rgba(201,162,74,.4)'; g.fillRect(0, H - H * 0.06, W, 1);
    if (!lite) { g.fillStyle = 'rgba(243,230,196,.05)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); if (Math.random() < 0.3) g.fillRect(Math.random() * W, 0, 1, H); }
    for (const o of objs) { o.vy += grav * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.y > H + o.r * 3 && o.vy > 0) o.dead = true; if (!o.dead) drawCan(o); }
    for (let i = objs.length - 1; i >= 0; i--) if (objs[i].dead) objs.splice(i, 1);
    for (const b of bits) { b.vy += grav * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.life -= dt; g.globalAlpha = Math.max(0, Math.min(1, b.life)); drawCan({ ...b, s: { name: '' } }); g.globalAlpha = 1; }
    for (let i = bits.length - 1; i >= 0; i--) if (bits[i].life <= 0) bits.splice(i, 1);
    while (trail.length && now - trail[0].t > 140) trail.shift();
    if (trail.length > 1) { g.strokeStyle = '#f3e6c4'; g.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { g.lineWidth = 1 + i * 0.6; g.globalAlpha = i / trail.length; g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke(); } g.globalAlpha = 1; }
    if (flash > 0) { g.fillStyle = `rgba(255,236,200,${flash * 0.5})`; g.fillRect(0, 0, W, H); flash -= dt * 3; }
  }
  function begin() { $('.sl-start').hidden = true; running = true; lives = 3; left = 60; got = new Set(); queue = []; objs.length = 0; $('.sl-got').innerHTML = ''; $('.sl-score').textContent = `0 / ${all.length}`; $('.sl-lives').textContent = '✦✦✦'; spawnT = 0.3; sfx('dice'); }
  function end(perfect = false) {
    if (!running) return; running = false; const n = got.size; sfx(n >= all.length / 2 ? 'win' : 'lose');
    const s = $('.sl-start'); s.hidden = false; s.innerHTML = `<div><p class="it-orn">❦</p><h2>${perfect ? 'A perfect reel!' : lives <= 0 ? 'Kaboom.' : 'That’s a wrap.'}</h2><p>You sliced <b>${n}</b> of ${all.length} skills.</p><ul class="sl-list">${all.map((x) => `<li class="${got.has(x.name) ? 'on' : ''}">${x.full}</li>`).join('')}</ul><div class="reel-acts"><button class="rb p sl-go">Again ▸</button><button class="rb sl-x2">Back to the street</button></div></div>`;
    s.querySelector('.sl-go').onclick = begin; s.querySelector('.sl-x2').onclick = quit; onEnd?.(n, all.length, false);
  }
  function quit() { cancelAnimationFrame(raf); removeEventListener('resize', resize); wrap.remove(); onEnd?.(got.size, all.length, true); }
  $('.sl-go').onclick = begin; $('.sl-x').onclick = quit; $('.sl-x2').onclick = quit;
  raf = requestAnimationFrame(frame);
  return { quit };
}
