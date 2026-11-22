// Chotu chat panel (works in 3D, Lite and the text-only page).
import { canListen, canSpeak, listen, speak, stopSpeaking } from './voice.js';
import { play } from './audio.js';
const $ = (s) => document.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initChat({ go, hooks }) {
  const chat = $('#chat'); const log = $('#chatLog'); const form = $('#chatForm'); const input = $('#chatInput');
  const history = []; let busy = false; let speakOn = false; let rec = null;
  const mic = $('#micBtn'); const spk = $('#speakBtn');
  if (canListen) { mic.hidden = false; mic.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    stopSpeaking(); mic.classList.add('on'); input.placeholder = 'Listening… speak now';
    rec = listen({ onResult: (t) => { input.value = t; }, onError: (err) => { input.placeholder = err === 'not-allowed' ? 'Microphone permission was blocked.' : 'Could not hear you. Try again.'; },
      onEnd: (finalText) => { rec = null; mic.classList.remove('on'); input.placeholder = 'Ask about projects, skills, experience…'; if (finalText.trim()) { speakOn = speakOn || canSpeak; spk.setAttribute('aria-pressed', String(speakOn)); form.requestSubmit(); } } });
  }); }
  if (canSpeak) { spk.hidden = false; spk.addEventListener('click', () => { speakOn = !speakOn; spk.setAttribute('aria-pressed', String(speakOn)); if (!speakOn) stopSpeaking(); }); }

  $('#ragInfo').innerHTML = `<ol>
    <li><b>Collect:</b> my profile, projects, skills, journey and certificates are split into 47 small passages ("chunks"), each tagged with where it came from.</li>
    <li><b>Embed:</b> each chunk was turned into a 768-number vector with Google's <code>gemini-embedding-001</code> model, once, and saved with the site (no work at start-up).</li>
    <li><b>Retrieve:</b> your question is embedded the same way, then compared to every chunk with cosine similarity. The 4 closest chunks are kept.</li>
    <li><b>Generate:</b> only those chunks go to Gemini Flash, with strict instructions to answer from them alone and to say so when the portfolio does not cover something.</li>
    <li><b>Cite:</b> the chips under each answer show which chunks were used; tap one to open that section.</li></ol>`;

  const bubble = (who, html) => { const d = document.createElement('div'); d.className = `b ${who}`; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const open = () => {
    chat.hidden = false; input.focus();
    if (!log.children.length) bubble('bot', "Hiss-llo! I'm <b>Chotu</b>. Ask me anything about Faisal's projects, skills, studies or experience. I only answer from his portfolio.");
    hooks.stage?.chotu.setMode('listening'); play('chotu');
  };
  const close = () => { chat.hidden = true; stopSpeaking(); hooks.stage?.chotu.setMode('idle'); };
  hooks.openChat = open;
  $('#chotuBtn').addEventListener('click', () => (chat.hidden ? open() : close()));
  $('#chatClose').addEventListener('click', close);
  chat.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); $('#chotuBtn').focus(); } });

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const q = input.value.trim(); if (!q || busy) return;
    busy = true; input.value = ''; bubble('me', esc(q)); play('send');
    const wait = bubble('bot', '<i>Chotu is thinking…</i>');
    hooks.stage?.chotu.setMode('thinking'); hooks.stage?.avatar.play('Think');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, history }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.answer) throw new Error(j.error || 'Chotu could not answer right now.');
      const used = (j.sources || []).filter((s) => s.used); const shown = used.length ? used : (j.sources || []).slice(0, 2);
      wait.innerHTML = esc(j.answer).replace(/\[(\d+)\]/g, '<sup>[$1]</sup>')
        + (shown.length ? `<div class="src">${shown.map((s) => `<button data-sec="${esc(s.section)}" title="relevance ${s.score}">[${s.n}] ${esc(s.title)}</button>`).join('')}</div>` : '');
      history.push({ role: 'user', text: q }, { role: 'bot', text: j.answer }); history.splice(0, Math.max(0, history.length - 6));
      hooks.stage?.chotu.setMode('answer'); hooks.stage?.avatar.play('Talk'); play('chotu');
      if (speakOn) speak(j.answer);
      setTimeout(() => hooks.stage?.avatar.play('Idle'), 3500);
    } catch (err) {
      wait.innerHTML = esc(err.message || 'Something went wrong.'); hooks.stage?.chotu.setMode('idle'); hooks.stage?.avatar.play('Idle');
    } finally { busy = false; log.scrollTop = log.scrollHeight; }
  });
  log.addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) go(b.dataset.sec); });
  hooks.ask = (q) => { open(); input.value = q; form.requestSubmit(); };
}
