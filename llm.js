// LLM layer: Groq only (OpenAI-compatible API). Set GROQ_API_KEY.
const GROQ_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';

const provider = GROQ_KEY ? 'groq' : null;
const reason = (m) => (m.includes('gpt-oss') ? { reasoning_effort: 'low' } : {});
const info = () => ({ provider, model: provider ? MODEL : null, vision: !!provider });

async function groq(body, signal, attempt = 0, noWait = false) {
  if (!GROQ_KEY) throw new Error('No GROQ_API_KEY configured');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ ...reason(body.model), ...body, max_tokens: (body.max_tokens || 800) + (body.model.includes('gpt-oss') ? 500 : 0) }), signal,
  });
  if (r.ok) return r;
  const d = await r.json().catch(() => ({}));
  const msg = d.error?.message || `Groq error ${r.status}`;
  if (r.status === 429) {
    const secs = Number((msg.match(/try again in (\d+(?:\.\d+)?)s/i) || [])[1]) || 0;
    if (!noWait && attempt < 1 && secs > 0 && secs <= 25) { await new Promise((ok) => setTimeout(ok, secs * 1000 + 300)); return groq(body, signal, attempt + 1); }
    throw Object.assign(new Error(`The AI is busy right now (free-tier rate limit). Try again in about ${Math.ceil(secs) || 30} seconds.`), { rateLimited: true });
  }
  throw new Error(msg);
}

// Full text. json:true asks for a JSON object (prompt must mention JSON).
async function complete({ system, messages, max = 1500, json = false, temperature = 0.4, fast = false }) {
  const body = (model) => ({ model, max_tokens: max, temperature, messages: [{ role: 'system', content: system }, ...messages], ...(json ? { response_format: { type: 'json_object' } } : {}) });
  let r;
  try { r = await groq(body(fast ? FAST_MODEL : MODEL), AbortSignal.timeout(60_000), 0, !fast); }
  catch (e) { if (!e.rateLimited || fast) throw e; r = await groq(body(FAST_MODEL), AbortSignal.timeout(60_000)); }
  return (await r.json()).choices[0].message.content || '';
}

// Streams text deltas to onDelta.
async function stream({ system, messages, max = 700, temperature = 0.4, fast = true }, onDelta) {
  const r = await groq({ model: fast ? FAST_MODEL : MODEL, max_tokens: max, temperature, stream: true, messages: [{ role: 'system', content: system }, ...messages] }, AbortSignal.timeout(60_000));
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith('data:')) continue;
      const p = l.slice(5).trim();
      if (!p || p === '[DONE]') continue;
      try { const t = JSON.parse(p).choices[0].delta?.content; if (t) onDelta(t); } catch { /* partial line */ }
    }
  }
}

// image is a data URL (data:image/jpeg;base64,...)
async function vision({ system, prompt, image, max = 700 }) {
  const r = await groq({ model: VISION_MODEL, max_tokens: max, temperature: 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: image } }] }] }, AbortSignal.timeout(60_000));
  return (await r.json()).choices[0].message.content || '';
}

module.exports = { complete, stream, vision, info };
