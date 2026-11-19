'use strict';

/**
 * Groq client (OpenAI-compatible chat completions API). Two text models are used:
 * a larger one for the personalised plan, and a smaller/faster one for chat, translation and
 * letters. Free-tier quotas are per model, so a busy large model transparently falls back to the
 * smaller one.
 */

const { TIMEOUT_MS } = require('../config');

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';

/** Reasoning models spend completion tokens thinking; leave headroom so answers are not cut off. */
const REASONING_HEADROOM_TOKENS = 500;
const MAX_RATE_LIMIT_WAIT_SECONDS = 25;

const apiKey = () => process.env.GROQ_API_KEY;
const isReasoningModel = (model) => model.includes('gpt-oss');

/** @returns {{provider: string|null, model: string|null, vision: boolean}} what the server can do */
function info() {
  const enabled = Boolean(apiKey());
  return { provider: enabled ? 'groq' : null, model: enabled ? MODEL : null, vision: enabled };
}

/** Error raised when Groq reports a rate limit that is not worth waiting for. */
class RateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super(
      `The AI is busy right now (free-tier rate limit). Try again in about ${Math.ceil(retryAfterSeconds) || 30} seconds.`,
    );
    this.rateLimited = true;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryAfterSeconds = (message) => Number((message.match(/try again in (\d+(?:\.\d+)?)s/i) || [])[1]) || 0;

/** Request body for Groq: reasoning models get low effort and extra token headroom. */
function payloadFor(body) {
  const reasoning = isReasoningModel(body.model);
  return {
    ...(reasoning ? { reasoning_effort: 'low' } : {}),
    ...body,
    max_tokens: (body.max_tokens || 800) + (reasoning ? REASONING_HEADROOM_TOKENS : 0),
  };
}

/** True when a rate-limit failure is short enough to wait out once. */
const worthWaiting = (failure, wait, attempt) =>
  failure.rateLimited && wait && attempt < 1 && failure.seconds > 0 && failure.seconds <= MAX_RATE_LIMIT_WAIT_SECONDS;

/**
 * POST to Groq, optionally waiting once for a short rate-limit window.
 * @param {object} body chat completion request
 * @param {{wait?: boolean, attempt?: number}} [options]
 */
async function request(body, { wait = true, attempt = 0 } = {}) {
  if (!apiKey()) throw new Error('No GROQ_API_KEY configured');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(payloadFor(body)),
    signal: AbortSignal.timeout(TIMEOUT_MS.llm),
  });
  if (response.ok) return response;

  const failure = await describeFailure(response);
  if (worthWaiting(failure, wait, attempt)) {
    await sleep(failure.seconds * 1000 + 300);
    return request(body, { wait, attempt: attempt + 1 });
  }
  throw failure.rateLimited ? new RateLimitError(failure.seconds) : new Error(failure.message);
}

/** Read an error response from Groq into {message, rateLimited, seconds}. */
async function describeFailure(response) {
  const payload = await response.json().catch(() => ({}));
  const message = payload.error?.message || `Groq error ${response.status}`;
  return { message, rateLimited: response.status === 429, seconds: retryAfterSeconds(message) };
}

const withSystem = (system, messages) => [{ role: 'system', content: system }, ...messages];

/**
 * Get a full text completion.
 * @param {{system: string, messages: object[], max?: number, json?: boolean, temperature?: number, fast?: boolean}} options
 *   `json` requests a JSON object (the prompt must mention JSON); `fast` uses the smaller model.
 */
async function complete({ system, messages, max = 1500, json = false, temperature = 0.4, fast = false }) {
  const build = (model) => ({
    model,
    max_tokens: max,
    temperature,
    messages: withSystem(system, messages),
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  try {
    const response = await request(build(fast ? FAST_MODEL : MODEL), { wait: fast });
    return (await response.json()).choices[0].message.content || '';
  } catch (error) {
    if (!error.rateLimited || fast) throw error;
    const response = await request(build(FAST_MODEL));
    return (await response.json()).choices[0].message.content || '';
  }
}

/** Parse one SSE line from Groq and return its text delta, if any. */
function deltaFromSseLine(line) {
  if (!line.startsWith('data:')) return null;
  const data = line.slice(5).trim();
  if (!data || data === '[DONE]') return null;
  try {
    return JSON.parse(data).choices[0].delta?.content || null;
  } catch {
    return null; // partial JSON; the rest arrives in the next chunk
  }
}

/**
 * Stream a completion, calling `onDelta` for every text fragment.
 * @param {{system: string, messages: object[], max?: number, temperature?: number}} options
 * @param {(text: string) => void} onDelta
 */
async function stream({ system, messages, max = 700, temperature = 0.4 }, onDelta) {
  const response = await request({
    model: FAST_MODEL,
    max_tokens: max,
    temperature,
    stream: true,
    messages: withSystem(system, messages),
  });
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const delta = deltaFromSseLine(line);
      if (delta) onDelta(delta);
    }
  }
}

/**
 * Describe an image.
 * @param {{system: string, prompt: string, image: string, max?: number}} options image is a data URL
 */
async function vision({ system, prompt, image, max = 700 }) {
  const userContent = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: image } },
  ];
  const response = await request({
    model: VISION_MODEL,
    max_tokens: max,
    temperature: 0.3,
    messages: withSystem(system, [{ role: 'user', content: userContent }]),
  });
  return (await response.json()).choices[0].message.content || '';
}

module.exports = { complete, stream, vision, info, deltaFromSseLine };
