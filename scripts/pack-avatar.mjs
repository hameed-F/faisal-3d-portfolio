// Optimise the raw Blender export of the avatar into public/models/avatar.glb.
// Usage: node scripts/pack-avatar.mjs <raw.glb> <out.glb>
// Steps: drop animation channels that never move away from the bone's rest pose,
// resample (removes redundant keyframes), prune, then meshopt (quantize + compress).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, prune, dedup, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [, , src, dst] = process.argv;
if (!src || !dst) { console.error('usage: node scripts/pack-avatar.mjs <raw.glb> <out.glb>'); process.exit(1); }

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const doc = await io.read(src);

// A channel whose every keyframe equals the node's rest value adds nothing: three.js
// leaves the bone at rest anyway. (Constant channels that differ from rest are kept,
// otherwise a pose from the previous clip could leak through.)
const EPS = 1e-4;
let dropped = 0;
for (const anim of doc.getRoot().listAnimations()) {
  for (const ch of anim.listChannels()) {
    const node = ch.getTargetNode(), path = ch.getTargetPath();
    const rest = path === 'rotation' ? node?.getRotation() : path === 'translation' ? node?.getTranslation() : path === 'scale' ? node?.getScale() : null;
    if (!rest) continue;
    const out = ch.getSampler().getOutput().getArray(), n = rest.length;
    let still = true;
    for (let i = 0; i < out.length && still; i += n) for (let j = 0; j < n; j++) if (Math.abs(out[i + j] - rest[j]) > EPS) { still = false; break; }
    if (still) { const s = ch.getSampler(); ch.dispose(); s.dispose(); dropped++; }
  }
}

await doc.transform(resample(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
console.log(`dropped ${dropped} still channels -> ${dst}`);
