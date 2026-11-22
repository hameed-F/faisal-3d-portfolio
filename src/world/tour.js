// FILM mode: a hands-free cinematic tour through all seven chapters, made of drives and kinetic cards.
import { cards, subtitle, stopAll } from '../cinema.js';
import { profile, projects, journey, aboutZones, skills, certificates } from '../content.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let running = false; let cancelled = false;
export const tourRunning = () => running;
export function stopTour() { cancelled = true; stopAll(); }

export async function playTour(api, { onEnd } = {}) {
  if (running) return; running = true; cancelled = false;
  const go = async (fn) => { if (!cancelled) await fn(); };
  try {
    await go(() => cards([{ k: 'a film in 7 chapters', t: 'FAISAL' }, { k: 'starring', t: profile.name }, { k: 'with', t: 'Chotu, a snake who read the whole CV' }], { label: 'Film' }));
    await go(() => api.driveTo('hut'));
    await go(() => cards([{ k: 'The Hut', t: 'Every board game on this table is a part of his life.' }, { k: 'Click a board', t: 'and you fall inside it.' }], { label: 'Chapter 2' }));
    await go(() => api.setArea('projects'));
    await go(() => cards(projects.filter((p) => p.featured).map((p) => ({ img: p.image, k: `${p.stack}${p.year ? ' · ' + p.year : ''}`, t: p.name })).concat([{ k: 'and seven more', t: projects.filter((p) => !p.featured).map((p) => p.name.replace(/\(.*\)|:.*$/g, '').trim()).join(' · ') }]), { label: 'Chapter 3 · The Houses' }));
    await go(() => api.setArea('journey'));
    await go(() => cards(journey.map((j) => ({ k: j.when + ' · ' + j.where, t: j.title })), { label: 'Chapter 4 · The Ladders' }));
    await go(() => api.setArea('about'));
    await go(() => cards(aboutZones.map((z) => ({ k: z.title, t: z.text })), { label: 'Chapter 5 · The Garden' }));
    await go(() => api.setArea('skills'));
    await go(() => cards(skills.map((g) => ({ k: g.group, t: g.items.map((i) => i[0].split(' (')[0]).join(' · ') })), { label: 'Chapter 6 · The Plaza' }));
    await go(() => api.setArea('trophy'));
    await go(() => cards(certificates.map((c) => ({ img: c.image.replace('/certs/', '/certs/thumb/'), k: c.issuer, t: c.title })), { label: 'Chapter 7 · The Trophies' }));
    await go(() => cards([{ k: 'Fin', t: 'Say hello' }, { k: 'email', t: profile.email }, { k: 'phone', t: profile.phone }, { k: 'press Explore', t: 'to play the film yourself' }], { label: 'The End' }));
  } finally {
    running = false; if (!cancelled) subtitle('The film is over. The game begins.', 3500); onEnd?.(cancelled);
  }
  await sleep(10);
}
