import * as THREE from 'three';
import { LAYOUT } from './world.js';

// Arcade driving: keyboard (WASD / arrows) or on-screen touch pedals.
// Drive up to a signpost and press E (or tap the prompt) to open that section.
export function createFreeDrive({ world, camera, cam, onSection, onCabin, onExit, onSpeed }) {
  const car = world.car; const keys = new Set(); const touch = { up: 0, down: 0, left: 0, right: 0 };
  const st = { speed: 0, heading: car.rotation.y, active: false, near: null };
  const grid = new Map(); const CELL = 6; // spatial hash of tree trunks for collisions
  for (let i = 0; i < world.treesXZ.length; i += 2) { const k = `${Math.floor(world.treesXZ[i] / CELL)},${Math.floor(world.treesXZ[i + 1] / CELL)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(world.treesXZ[i], world.treesXZ[i + 1]); }

  const ui = document.createElement('div'); ui.className = 'drivehud'; ui.hidden = true;
  ui.innerHTML = `<div class="dh-help">Drive with <b>WASD</b> or arrows · <b>E</b> at a signpost · <b>Esc</b> to stop</div>
    <button class="dh-prompt" hidden></button>
    <div class="dh-pad"><button data-k="left" aria-label="Steer left">◀</button><button data-k="right" aria-label="Steer right">▶</button></div>
    <div class="dh-pedals"><button data-k="down" aria-label="Brake or reverse">▼</button><button data-k="up" aria-label="Accelerate">▲</button></div>
    <button class="dh-exit">Exit drive</button>`;
  document.body.appendChild(ui);
  const prompt = ui.querySelector('.dh-prompt');
  ui.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k; const on = (e) => { e.preventDefault(); touch[k] = 1; b.classList.add('on'); }; const off = () => { touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  ui.querySelector('.dh-exit').addEventListener('click', () => stop(true));
  prompt.addEventListener('click', () => activate());
  const kd = (e) => { if (!st.active) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); } if (k === 'e' || k === 'enter') activate(); if (k === 'escape') stop(true); };
  const ku = (e) => keys.delete(e.key.toLowerCase());
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  function activate() { if (!st.near) return; const n = st.near; stop(false); if (n === 'cabin') onCabin(); else onSection(n); }
  function start() { st.active = true; st.speed = 0; st.heading = car.rotation.y; ui.hidden = false; keys.clear(); }
  function stop(toTitle) { onSpeed?.(null); st.active = false; ui.hidden = true; prompt.hidden = true; keys.clear(); Object.keys(touch).forEach((k) => { touch[k] = 0; }); if (toTitle) onExit(); }

  const fwd = new THREE.Vector3(); const camPos = new THREE.Vector3(); const camTgt = new THREE.Vector3();
  function collide(x, z) {
    const cx = Math.floor(x / CELL); const cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = grid.get(`${cx + i},${cz + j}`); if (!a) continue; for (let k = 0; k < a.length; k += 2) if (Math.hypot(a[k] - x, a[k + 1] - z) < 1.25) return true; }
    if (Math.abs(x) < 4.4 && z > -3.4 && z < 3.4) return true; // cabin
    return Math.hypot(x, z) > 105;
  }
  function update(dt) {
    if (!st.active) return;
    const up = keys.has('w') || keys.has('arrowup') || touch.up; const dn = keys.has('s') || keys.has('arrowdown') || touch.down;
    const lf = keys.has('a') || keys.has('arrowleft') || touch.left; const rt = keys.has('d') || keys.has('arrowright') || touch.right;
    const acc = up ? 9 : dn ? (st.speed > 0.5 ? -16 : -6) : 0;
    st.speed += acc * dt; st.speed *= Math.pow(up || dn ? 0.985 : 0.95, dt * 60); st.speed = THREE.MathUtils.clamp(st.speed, -5, 16);
    const steer = (lf ? 1 : 0) - (rt ? 1 : 0); st.heading += steer * dt * 1.8 * THREE.MathUtils.clamp(st.speed / 6, -1, 1);
    fwd.set(Math.sin(st.heading), 0, Math.cos(st.heading));
    const nx = car.position.x + fwd.x * st.speed * dt; const nz = car.position.z + fwd.z * st.speed * dt;
    if (collide(nx, nz)) { st.speed *= -0.35; } else { car.position.x = nx; car.position.z = nz; }
    car.rotation.y = st.heading; onSpeed?.(st.speed);
    world.carState.wheels.forEach((w) => { w.rotation.x += st.speed * dt * 2.8; });
    // chase camera
    camPos.copy(car.position).addScaledVector(fwd, -6.2).add(new THREE.Vector3(0, 2.6, 0)); camTgt.copy(car.position).addScaledVector(fwd, 4).add(new THREE.Vector3(0, 0.9, 0));
    camera.position.lerp(camPos, Math.min(1, dt * 3.5)); cam.tgt.lerp(camTgt, Math.min(1, dt * 5));
    // nearest signpost or the cabin door
    let near = null; let label = '';
    for (const s of world.signs) if (s.pos.distanceTo(car.position) < 5.5) { near = s.section; label = s.label.charAt(0) + s.label.slice(1).toLowerCase(); }
    if (!near && car.position.distanceTo(LAYOUT.carStop) < 6) { near = 'cabin'; label = 'the cabin'; }
    if (near !== st.near) { st.near = near; prompt.hidden = !near; if (near) prompt.textContent = `Press E or tap here to open ${label}`; }
  }
  return { start, stop, update, get active() { return st.active; } };
}
