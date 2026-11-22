import * as THREE from 'three';
import { blocked } from './city.js';

// Third-person controller: the avatar walks/runs where you steer, the camera orbits behind.
// Desktop: WASD/arrows, Shift = run, drag = look, wheel = zoom.  Phone: left thumb joystick, drag right side to look.
export function createPlayer({ avatar, camera, colliders, dom }) {
  const body = avatar.group; const keys = new Set(); const manualKeys = () => ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].some((k) => keys.has(k));
  const st = { yaw: Math.PI, pitch: 0.32, dist: 7.5, targetDist: 7.5, speed: 0, enabled: false, run: false, moving: false, lockCam: false };
  const joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
  const look = { id: null, x: 0, y: 0 };
  const camTarget = new THREE.Vector3(); const camPos = new THREE.Vector3(); const move = new THREE.Vector3();

  // ----- keyboard -----
  addEventListener('keydown', (e) => { if (e.target.closest?.('input,textarea,select')) return; const k = e.key.toLowerCase(); keys.add(k); if (k === 'shift') st.run = true; if (st.enabled && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'shift') st.run = false; });
  addEventListener('blur', () => { keys.clear(); st.run = false; });

  // ----- pointer: drag to look (mouse anywhere / touch on the right half), joystick on the left half -----
  const joyEl = document.createElement('div'); joyEl.className = 'joy'; joyEl.innerHTML = '<i></i>'; joyEl.hidden = true; document.body.appendChild(joyEl);
  const knob = joyEl.firstChild;
  dom.addEventListener('pointerdown', (e) => {
    if (!st.enabled) return;
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && joy.id === null) {
      joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joyEl.hidden = false; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; knob.style.transform = 'translate(-50%,-50%)';
    } else if (look.id === null) { st.dragged = 0; look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
  });
  addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) { const dx = e.clientX - joy.ox; const dy = e.clientY - joy.oy; const L = Math.min(48, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx); joy.x = Math.cos(a) * L / 48; joy.y = Math.sin(a) * L / 48; knob.style.transform = `translate(calc(-50% + ${Math.cos(a) * L}px), calc(-50% + ${Math.sin(a) * L}px))`; st.run = L > 44; }
    else if (e.pointerId === look.id && !st.lockCam) { st.yaw -= (e.clientX - look.x) * 0.006; st.dragged = (st.dragged || 0) + Math.abs(e.clientX - look.x) + Math.abs(e.clientY - look.y); st.pitch = THREE.MathUtils.clamp(st.pitch + (e.clientY - look.y) * 0.004, 0.08, 1.1); look.x = e.clientX; look.y = e.clientY; }
  });
  const up = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; joyEl.hidden = true; st.run = false; } if (e.pointerId === look.id) look.id = null; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  dom.addEventListener('wheel', (e) => { if (!st.enabled) return; st.targetDist = THREE.MathUtils.clamp(st.targetDist + e.deltaY * 0.006, 3.5, 14); }, { passive: true });

  function update(dt) {
    if (!st.enabled) return;
    // input → direction relative to the camera
    let ix = 0; let iz = 0;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1; if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1; if (keys.has('d') || keys.has('arrowright')) ix += 1;
    ix += joy.x; iz += joy.y;
    let mag = Math.min(1, Math.hypot(ix, iz)); let worldAng = null;
    if (mag > 0.12) st.auto = null; // manual input cancels auto-walk
    else if (st.auto) { worldAng = Math.atan2(st.auto.x, st.auto.z); mag = 1; }
    const fast = st.run || (st.auto && st.auto.run);
    const want = mag > 0.12 ? (fast ? 5.6 : 2.4) * Math.max(mag, 0.5) : 0;
    st.speed += (want - st.speed) * Math.min(1, dt * 8);
    if (mag > 0.12) {
      const ang = worldAng ?? (Math.atan2(ix, iz) + st.yaw); // camera-relative (yaw points from player to camera)
      move.set(Math.sin(ang), 0, Math.cos(ang));
      let d = ang - body.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); body.rotation.y += d * Math.min(1, dt * 10);
    }
    if (st.speed > 0.05) {
      const nx = body.position.x + move.x * st.speed * dt; const nz = body.position.z + move.z * st.speed * dt;
      st.blockedNow = false;
      if (!blocked(colliders, nx, nz, 0.35)) { body.position.x = nx; body.position.z = nz; }
      else if (!blocked(colliders, nx, body.position.z, 0.35)) body.position.x = nx; // slide along walls
      else if (!blocked(colliders, body.position.x, nz, 0.35)) body.position.z = nz;
      else st.blockedNow = true;
    }
    // animation: Walk clip in place, sped up for running
    const moving = st.speed > 0.4;
    if (moving !== st.moving) { st.moving = moving; avatar.setBase(moving ? 'Walk' : 'Idle'); }
    if (moving && avatar.actions.Walk) avatar.actions.Walk.timeScale = THREE.MathUtils.clamp(st.speed / 2.2, 0.8, 2.3);
    followCamera(dt);
  }
  function followCamera(dt, snap = false) {
    st.dist += (st.targetDist - st.dist) * Math.min(1, dt * 6);
    camTarget.set(body.position.x, body.position.y + 1.45, body.position.z);
    camPos.set(camTarget.x + Math.sin(st.yaw) * Math.cos(st.pitch) * st.dist, camTarget.y + Math.sin(st.pitch) * st.dist, camTarget.z + Math.cos(st.yaw) * Math.cos(st.pitch) * st.dist);
    camPos.y = Math.max(camPos.y, 0.6);
    if (snap) camera.position.copy(camPos); else camera.position.lerp(camPos, Math.min(1, dt * 10));
    camera.lookAt(camTarget);
  }
  return {
    st, update, followCamera, manualKeys,
    enable(v) { st.enabled = v; if (!v) { keys.clear(); st.speed = 0; st.auto = null; if (st.moving) { st.moving = false; avatar.setBase('Idle'); } joyEl.hidden = true; joy.id = null; joy.x = joy.y = 0; } },
    teleport(p, yaw) { body.position.copy(p); if (yaw !== undefined) { body.rotation.y = yaw; st.yaw = yaw + Math.PI; } followCamera(0, true); },
    faceCameraBehind() { st.yaw = body.rotation.y + Math.PI; },
  };
}
