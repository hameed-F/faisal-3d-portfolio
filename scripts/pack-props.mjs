// Packs the CC0 props (asset_inspo/downloads/polypizza/*.glb) into one optimized GLB: public/models/props.glb
// Each source file becomes one top-level node named after the file. Run: node scripts/pack-props.mjs
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, weld, quantize, meshopt, unpartition, flatten, join } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { readdirSync, statSync } from 'node:fs';
const SRC = new URL('../../asset_inspo/downloads/polypizza/', import.meta.url);
const SKIP = new Set(['pine.glb', 'bushflower.glb']);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = new Document(); doc.createBuffer(); const scene = doc.createScene('props'); doc.getRoot().setDefaultScene(scene);
for (const f of readdirSync(SRC).filter((f) => f.endsWith('.glb') && !SKIP.has(f)).sort()) {
  const src = await io.read(new URL(f, SRC).pathname.replace(/^\/([A-Z]:)/, '$1'));
  src.getRoot().listTextures().forEach((t) => t.dispose()); // these props use flat colours; drop any textures
  const map = mergeDocuments(doc, src);
  const holder = doc.createNode(f.replace('.glb', ''));
  for (const s of src.getRoot().listScenes()) for (const n of s.listChildren()) holder.addChild(map.get(n));
  scene.addChild(holder);
  for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
}
doc.getRoot().listBuffers().slice(1).forEach((b) => b.dispose());
for (const a of doc.getRoot().listAccessors()) a.setBuffer(doc.getRoot().listBuffers()[0]);
await doc.transform(dedup(), prune(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }), prune());
await io.write(new URL('../public/models/props.glb', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), doc);
console.log('props.glb', (statSync(new URL('../public/models/props.glb', import.meta.url)).size / 1024).toFixed(0), 'KB', scene.listChildren().map((n) => n.getName()).join(','));
