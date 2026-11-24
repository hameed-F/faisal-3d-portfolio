// Vercel serverless function: POST /api/tts  { text, mode? }
// Reads Urdu answers aloud reliably on any device (most browsers have no Urdu voice of their own).
//  1) If AZURE_SPEECH_KEY + AZURE_SPEECH_REGION are set: returns MP3 audio from Azure's female Urdu voice (ur-PK-UzmaNeural).
//  2) Otherwise (mode "hindi"): returns the same Urdu text spelled in Hindi (Devanagari) letters, so the browser's
//     female Hindi voice (e.g. "Google हिन्दी" in Chrome) can read it. Spoken Urdu and Hindi sound alike.
// Results are cached in memory per instance. Keys are read only from process.env.
import { GoogleGenAI } from '@google/genai';

const cache = new Map(); // key -> { type, body }
const remember = (k, v) => { cache.set(k, v); if (cache.size > 200) cache.delete(cache.keys().next().value); return v; };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function azure(text) {
  const key = process.env.AZURE_SPEECH_KEY; const region = process.env.AZURE_SPEECH_REGION; if (!key || !region) return null;
  const ssml = `<speak version="1.0" xml:lang="ur-PK"><voice name="ur-PK-UzmaNeural"><prosody rate="-4%">${xml(text)}</prosody></voice></speak>`;
  const r = await withTimeout(fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'portfolio-tts' }, body: ssml }), 9000);
  if (!r.ok) throw new Error('azure ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

async function toDevanagari(text) {
  if (!process.env.GEMINI_API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Rewrite the following Urdu text (Perso-Arabic script) in Hindi Devanagari script, word for word (transliteration, NOT translation), so a Hindi voice pronounces it as spoken Urdu. Keep English names and words (like Aerox ERP, Unity) in Latin letters. Output only the Devanagari text.
Example input: محمد فیصل حمید انٹرن شپ کر رہے ہیں۔
Example output: मुहम्मद फ़ैसल हमीद इंटर्नशिप कर रहे हैं।

Input: ${text}
Output:`;
  for (let k = 0; k < 4; k++) {
    try {
      const r = await withTimeout(ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: prompt, config: { temperature: 0, maxOutputTokens: 800 } }), 9000);
      const t = (r.text || '').trim(); if (t && /[ऀ-ॿ]/.test(t) && !/[؀-ۿ]/.test(t)) return t;
    } catch (err) { if (!/503|429|unavailable|high demand|timeout/i.test(String(err?.message))) throw err; await new Promise((ok) => setTimeout(ok, 600 + k * 500)); }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const text = String(body?.text || '').replace(/\[\d+\]/g, '').replace(/[*_#`~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!text) return res.status(400).json({ error: 'No text.' });
  const mode = body?.mode === 'hindi' ? 'hindi' : 'audio';
  const key = mode + '|' + text;
  try {
    if (mode === 'audio') {
      const hit = cache.get(key) || (await azure(text).then((b) => (b ? remember(key, { type: 'audio/mpeg', body: b }) : null)));
      if (!hit) return res.status(200).json({ configured: false }); // no Azure key: the browser falls back to its own voices
      res.setHeader('Content-Type', hit.type); res.setHeader('Cache-Control', 'public, max-age=86400'); return res.status(200).send(hit.body);
    }
    const hit = cache.get(key) || (await toDevanagari(text).then((t) => (t ? remember(key, { type: 'text', body: t }) : null)));
    if (!hit) return res.status(503).json({ error: 'Transliteration unavailable.' });
    return res.status(200).json({ text: hit.body });
  } catch (err) {
    console.error('tts:', err?.message);
    return res.status(502).json({ error: 'Voice unavailable.' });
  }
}
