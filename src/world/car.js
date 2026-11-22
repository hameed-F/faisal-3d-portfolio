import * as THREE from 'three';
import { blocked } from './scene.js';

// Arcade car the avatar can get into (E) and out of (E again).
export function createCar({ car, wheels, headlight, camera, colliders, onSpeed }) {
  const keys = new Set(); const st = { active: false, speed: 0, heading: car.rotation.y };
  const touch = { up: 0, down: 0, left: 0, right: 0 };
  addEventListener('keydown', (e) => { if (st.active) { const k = e.key.toLowerCase(); keys.add(k); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault(); } });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  const pad = document.createElement('div'); pad.className = 'carpad'; pad.hidden = true;
  pad.innerHTML = '<div class="cp-l"><button data-k="left" aria-label="Steer left">◀</button><button data-k="right" aria-label="Steer right">▶</button></div><div class="cp-r"><button data-k="down" aria-label="Brake">▼</button><button data-k="up" aria-label="Accelerate">▲</button></div>';
  document.body.appendChild(pad);
  pad.querySelectorAll('[data-k]').forEach((b) => { const k = b.dataset.k; const on = (e) => { e.preventDefault(); touch[k] = 1; b.classList.add('on'); }; const off = () => { touch[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerdown', on); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off)); });

  const fwd = new THREE.Vector3(); const cp = new THREE.Vector3(); const ct = new THREE.Vector3();
  function update(dt) {
    if (!st.active) return;
    const up = keys.has('w') || keys.has('arrowup') || touch.up; const dn = keys.has('s') || keys.has('arrowdown') || touch.down;
    const lf = keys.has('a') || keys.has('arrowleft') || touch.left; const rt = keys.has('d') || keys.has('arrowright') || touch.right;
    st.speed += (up ? 10 : dn ? (st.speed > 0.5 ? -18 : -7) : 0) * dt; st.speed *= Math.pow(up || dn ? 0.986 : 0.955, dt * 60); st.speed = THREE.MathUtils.clamp(st.speed, -6, 18);
    st.heading += ((lf ? 1 : 0) - (rt ? 1 : 0)) * dt * 1.9 * THREE.MathUtils.clamp(st.speed / 6, -1, 1);
    fwd.set(Math.sin(st.heading), 0, Math.cos(st.heading));
    const nx = car.position.x + fwd.x * st.speed * dt; const nz = car.position.z + fwd.z * st.speed * dt;
    if (blocked(colliders, nx, nz, 1.3)) st.speed *= -0.3; else { car.position.x = nx; car.position.z = nz; }
    car.rotation.y = st.heading; wheels.forEach((w) => { w.rotation.x += st.speed * dt * 2.8; }); onSpeed?.(st.speed);
    cp.copy(car.position).addScaledVector(fwd, -7).add(new THREE.Vector3(0, 3, 0)); ct.copy(car.position).addScaledVector(fwd, 4).add(new THREE.Vector3(0, 1, 0));
    camera.position.lerp(cp, Math.min(1, dt * 4)); camera.lookAt(ct);
  }
  return {
    st, update,
    enter() { st.active = true; st.speed = 0; st.heading = car.rotation.y; pad.hidden = false; headlight.intensity = 40; keys.clear(); },
    exit() { st.active = false; pad.hidden = true; onSpeed?.(null); keys.clear(); Object.keys(touch).forEach((k) => { touch[k] = 0; }); headlight.intensity = 0;
      // a free spot beside the driver's door
      const side = new THREE.Vector3(Math.cos(st.heading), 0, -Math.sin(st.heading));
      for (const s of [1.9, -1.9, 3, -3]) { const p = car.position.clone().addScaledVector(side, s); if (!blocked(colliders, p.x, p.z, 0.4)) return p; }
      return car.position.clone().addScaledVector(fwd, -3.5);
    },
  };
}
