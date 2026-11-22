// Embeds every chunk once and saves the vectors (the bundled "vector index").
// Run: node --env-file=.env.local scripts/build-index.mjs
// The key is read from process.env only and is never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

export const EMBED_MODEL = process.env.EMBED_MODEL || 'gemini-embedding-001';
export const DIM = 768;

if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY is not set (expected in .env.local).'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const chunks = JSON.parse(readFileSync(new URL('../data/portfolio-chunks.json', import.meta.url), 'utf8'));

const norm = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => +(x / n).toFixed(5)); };
const out = [];
for (let i = 0; i < chunks.length; i += 20) {
  const batch = chunks.slice(i, i + 20);
  const r = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: batch.map((c) => `${c.title}. ${c.text}`),
    config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: DIM },
  });
  if (!r.embeddings || r.embeddings.length !== batch.length) throw new Error('Unexpected embedding response');
  batch.forEach((c, k) => out.push({ ...c, v: norm(r.embeddings[k].values) }));
  console.log(`embedded ${Math.min(i + 20, chunks.length)}/${chunks.length}`);
}
writeFileSync(new URL('../data/portfolio-index.json', import.meta.url), JSON.stringify({ model: EMBED_MODEL, dim: DIM, chunks: out }));
console.log(`saved data/portfolio-index.json (${out.length} vectors, ${DIM} dims, model ${EMBED_MODEL})`);
