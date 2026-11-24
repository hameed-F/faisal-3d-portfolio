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
  function update(dt) { acc += dt; const step = 1 / hz; if (acc < step) return; const d = acc; acc = 0; mixer.update(d); }
  play('Idle', { fade: 0 });
  return { group, pivot, model, mixer, actions, play, duration, update, head, clips: gltf.animations.map((c) => c.name), setHz(v) { hz = v; } };
}
