import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { psxify } from './psx.js';
function blobShadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const LOOPS = new Set(['Idle', 'Walk', 'Talk', 'Think', 'Dance', 'Sit']);

export async function loadAvatar(url, onProgress) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url, (e) => e.total && onProgress?.(e.loaded / e.total));
  const root = gltf.scene;
  // Swap PBR materials for cheaper Lambert ones (keeps textures), and add PS1 vertex snapping
  root.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    const m = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.color, transparent: old.transparent, alphaTest: old.alphaTest || 0, side: old.side });
    if (m.map) { m.map.magFilter = THREE.NearestFilter; }
    psxify(m); o.material = m; old.dispose();
    o.frustumCulled = false; // skinned bounds can be wrong mid-animation
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobShadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01;
  const group = new THREE.Group(); group.add(root, shadow);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    if (!LOOPS.has(clip.name)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    actions[clip.name] = a;
  }
  let current = null; let base = 'Idle'; let onceTimer = null;
  function play(name, { fade = 0.35, then = null } = {}) {
    const a = actions[name]; if (!a) return;
    clearTimeout(onceTimer);
    if (current && current !== a) current.fadeOut(fade);
    a.reset().setEffectiveWeight(1).fadeIn(fade).play(); current = a;
    if (!LOOPS.has(name)) {
      const back = then || base;
      onceTimer = setTimeout(() => play(back, { fade: 0.45 }), (a.getClip().duration - fade) * 1000);
    }
  }
  function setBase(name) { base = name; play(name); }

  // head/neck look-at (applied after the mixer each frame)
  const headBone = root.getObjectByName('mixamorigHead') || root.getObjectByName('mixamorig:Head');
  const neckBone = root.getObjectByName('mixamorigNeck') || root.getObjectByName('mixamorig:Neck');
  const look = { x: 0, y: 0, tx: 0, ty: 0, enabled: true };
  const qx = new THREE.Quaternion(); const qy = new THREE.Quaternion(); const AX = new THREE.Vector3(1, 0, 0); const AY = new THREE.Vector3(0, 1, 0);
  function lookAtScreen(nx, ny) { look.tx = THREE.MathUtils.clamp(nx, -1, 1) * 0.55; look.ty = THREE.MathUtils.clamp(ny, -1, 1) * 0.3; }

  let acc = 0;
  function update(dt, hz = 60) {
    acc += dt; const step = 1 / hz; if (acc < step) return; const d = acc; acc = 0;
    mixer.update(d);
    if (look.enabled && headBone) {
      look.x += (look.tx - look.x) * Math.min(1, d * 5); look.y += (look.ty - look.y) * Math.min(1, d * 5);
      qy.setFromAxisAngle(AY, look.x * 0.6); qx.setFromAxisAngle(AX, -look.y * 0.6);
      headBone.quaternion.multiply(qy).multiply(qx);
      if (neckBone) { qy.setFromAxisAngle(AY, look.x * 0.4); neckBone.quaternion.multiply(qy); }
    }
  }
  play('Idle', { fade: 0 });
  return { group, root, actions, play, setBase, update, lookAtScreen, look, clips: gltf.animations.map((c) => c.name) };
}
