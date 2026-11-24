import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Clips that loop; every other clip plays once and holds its last pose.
const LOOPS = new Set(['Idle', 'Walk', 'Talk', 'Think', 'Dance', 'Sit', 'Climb', 'Fly', 'Run']);

/** Loads avatar.glb (meshopt, 18 clips) and returns a small player. */
export async function loadAvatar(url, onProgress) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url, (e) => e.total && onProgress?.(e.loaded / e.total));
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    if (old.map) { old.map.anisotropy = 4; }
    // cheaper lit material, keeps the textures
    o.material = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.color, transparent: old.transparent, alphaTest: old.alphaTest || 0, side: old.side });
    old.dispose(); o.frustumCulled = false;
  });
  const group = new THREE.Group(); const pivot = new THREE.Group(); pivot.add(model); group.add(pivot);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) { const a = mixer.clipAction(clip); actions[clip.name] = a; }
  let current = null; let acc = 0; let hz = 60;
  const head = model.getObjectByName('mixamorigHead');
  const lookBones = [['mixamorigSpine2', .25], ['mixamorigNeck', .35], ['mixamorigHead', .4]].map(([n, k]) => [model.getObjectByName(n), k]).filter((x) => x[0]);
  // look: turn the head/upper body up toward a world point (e.g. the camera) on top of any clip
  const look = { w: 0, cur: 0, target: null }; const saved = lookBones.map(() => new THREE.Quaternion()); let applied = false;
  const _hp = new THREE.Vector3(); const _ax = new THREE.Vector3(); const _q = new THREE.Quaternion(); const _pw = new THREE.Quaternion(); const _bw = new THREE.Quaternion();
  function applyLook(d) {
    look.cur += (look.w - look.cur) * Math.min(1, d * 4); if (look.cur < .01 || !look.target || !head) return;
    head.getWorldPosition(_hp); const dx = look.target.x - _hp.x; const dz = look.target.z - _hp.z; const dy = look.target.y - _hp.y;
    const pitch = Math.max(-.3, Math.min(.75, Math.atan2(dy, Math.hypot(dx, dz)))) * look.cur;
    _ax.set(1, 0, 0).applyQuaternion(pivot.getWorldQuaternion(_q)).normalize();
    lookBones.forEach(([b], i) => saved[i].copy(b.quaternion)); applied = true;
    for (const [b, k] of lookBones) { _q.setFromAxisAngle(_ax, -pitch * k); b.parent.getWorldQuaternion(_pw); _bw.copy(_pw).multiply(b.quaternion); _bw.premultiply(_q); b.quaternion.copy(_pw.invert().multiply(_bw)); }
  }

  /** Play a clip with a cross-fade. opts: { fade, speed, loop } (loop defaults to the clip's nature). Returns the clip duration in seconds (at that speed). */
  function play(name, { fade = 0.3, speed = 1, loop } = {}) {
    const a = actions[name]; if (!a) return 0;
    const looping = loop ?? LOOPS.has(name);
    a.setLoop(looping ? THREE.LoopRepeat : THREE.LoopOnce, looping ? Infinity : 1); a.clampWhenFinished = !looping;
    a.setEffectiveTimeScale(speed).setEffectiveWeight(1).reset();
    if (current && current !== a) { a.crossFadeFrom(current, fade, false); } else a.fadeIn(fade);
    a.play(); current = a;
    return a.getClip().duration / speed;
  }
  const duration = (name, speed = 1) => (actions[name]?.getClip().duration || 0) / speed;
  function update(dt) { acc += dt; const step = 1 / hz; if (acc < step) return; const d = acc; acc = 0; if (applied) { lookBones.forEach(([b], i) => b.quaternion.copy(saved[i])); applied = false; } mixer.update(d); group.updateMatrixWorld(true); applyLook(d); }
  play('Idle', { fade: 0 });
  return { group, pivot, model, mixer, actions, play, duration, update, head, look, clips: gltf.animations.map((c) => c.name), setHz(v) { hz = v; } };
}
