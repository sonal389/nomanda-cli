'use strict';
// ═══════════════════════════════════════════
// FRABULA 1.2 — NOMANDA's free, keyless, open-source AI brain
// Zero setup: no install, no API key, no sign-up, no terminal tricks.
// Fallback chain so an answer ALWAYS appears:
//   1. NOMANDA_BRAIN_URL  (override / test endpoint)
//   2. Frabula cloud — Pollinations.ai (keyless)
//   3. NOMANDA server proxy — localhost:3001/api/cloud
//   4. Local open-source brain — localhost:5500/api/chat (+ :3001/api/franbu/chat)
// Accepts SSE, NDJSON (Ollama-style) or plain JSON replies.
// ═══════════════════════════════════════════

const FRABULA_DIRECT = 'https://text.pollinations.ai/openai';
const PROXY          = 'http://localhost:3001/api/cloud';
const LOCAL_BRAINS   = ['http://localhost:5500/api/chat', 'http://localhost:3001/api/franbu/chat'];

function extractText(d) {
  return d?.choices?.[0]?.message?.content || d?.content || d?.choices?.[0]?.text || d?.response || '';
}

// Parse a (possibly streaming) body incrementally; call onToken with deltas.
async function consumeBody(res, onToken) {
  const ctype = res.headers.get('content-type') || '';

  // Plain JSON reply
  if (ctype.includes('application/json')) {
    const text = extractText(await res.json());
    if (text && onToken) onToken(text);
    return text;
  }

  // Streamed: SSE ("data: {...}") or NDJSON ("{...}") — parse line by line
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (let line of lines) {
      line = line.trim();
      if (!line || line === '[DONE]') continue;
      if (line.startsWith('data:')) line = line.slice(5).trim();
      if (!line || line === '[DONE]') continue;
      try {
        const d = JSON.parse(line);
        const delta = d.choices?.[0]?.delta?.content
                   ?? d.message?.content
                   ?? d.content
                   ?? d.response
                   ?? '';
        if (delta) { full += delta; if (onToken) onToken(delta); }
      } catch (_) { /* keep partial JSON for next line */ }
    }
  }
  // leftover buffer (no trailing newline)
  if (buf.trim()) {
    try {
      const d = JSON.parse(buf.replace(/^data:\s*/, ''));
      const delta = extractText(d);
      if (delta) { full += delta; if (onToken) onToken(delta); }
    } catch (_) {}
  }
  return full;
}

async function tryFetch(url, payload, timeoutMs = 45000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally { clearTimeout(t); }
}

// ── Streaming chat — the main entry ─────────
// messages: [{role, content}] · onToken(delta) · returns full text
export async function streamChat(messages, { model = 'openai', onToken } = {}) {
  const payload = { model, messages, stream: true };
  const attempts = [];
  if (process.env.NOMANDA_BRAIN_URL) attempts.push(['custom', process.env.NOMANDA_BRAIN_URL]);
  attempts.push(['frabula', FRABULA_DIRECT], ['proxy', PROXY],
    ...LOCAL_BRAINS.map(u => ['local', u]));

  let lastErr = null;
  for (const [kind, url] of attempts) {
    try {
      const res = await tryFetch(url, payload);
      const full = await consumeBody(res, onToken);
      if (!full.trim()) throw new Error('empty reply');
      return { text: full, via: kind };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Frabula 1.2 unreachable');
}

// ── One-shot (no streaming) for internal jobs ──
export async function quick(prompt, system = 'You are NOMANDA, a helpful concise assistant.', opts = {}) {
  const { text } = await streamChat(
    [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    { model: opts.model || 'openai' }
  );
  return text;
}

export function brainName(via) {
  return { frabula: 'Frabula 1.2', proxy: 'Frabula 1.2 (local proxy)', local: 'local open-source brain', custom: 'custom brain' }[via] || 'Frabula 1.2';
}

// ── System prompt (mirrors web buildSys) ────
export function buildSys(memory, now = new Date()) {
  const name = memory.name || 'friend';
  const prof = memory.profession || 'professional';
  const interests = (memory.interests || []).slice(0, 5).join(', ') || 'general topics';
  const gmail = memory.gmail || 'not set';
  return `You are NOMANDA, an advanced AI assistant. You are powered by Frabula 1.2.
User: ${name} | Profession: ${prof} | Interests: ${interests} | Gmail: ${gmail}
Time: ${now.toLocaleString()}
Address the user warmly as ${name}. Be concise and professional. Use markdown for code and lists.`;
}
