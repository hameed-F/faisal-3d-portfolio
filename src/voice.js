// Voice chat for Chotu using the browser's own speech features (no extra service or key).
// Speech-to-text: SpeechRecognition (Chrome, Edge, Safari). Text-to-speech: speechSynthesis (all modern browsers).
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export const canSpeak = 'speechSynthesis' in window;

export function listen({ lang = navigator.language || 'en-US', onResult, onEnd, onError }) {
  if (!SR) return null;
  const r = new SR(); r.lang = lang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let finalText = '';
  r.onresult = (e) => { let txt = ''; for (const res of e.results) { txt += res[0].transcript; if (res.isFinal) finalText = txt; } onResult?.(txt, !!finalText); };
  r.onerror = (e) => onError?.(e.error);
  r.onend = () => onEnd?.(finalText);
  r.start();
  return r;
}

let voice = null;
export function speak(text, { lang } = {}) {
  if (!canSpeak) return;
  const clean = text.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim(); if (!clean) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const isUrdu = /[؀-ۿ]/.test(clean); u.lang = lang || (isUrdu ? 'ur-PK' : 'en-US');
  const voices = speechSynthesis.getVoices(); voice = voices.find((v) => v.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase())) || null;
  if (voice) u.voice = voice; u.rate = 1.03; u.pitch = 1.25; // a slightly higher, friendlier Chotu
  speechSynthesis.speak(u);
}
export function stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); }
