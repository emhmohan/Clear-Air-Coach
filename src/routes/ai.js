'use strict';

const { LIMITS } = require('../config');
const { HttpError, sendJson, startEventStream } = require('../http/respond');
const { readJsonBody } = require('../http/body');
const { clip, isImageDataUrl } = require('../validation');
const llm = require('../services/llm');
const coach = require('../ai/coach');
const prompts = require('../ai/prompts');

const MAX_HISTORY_MESSAGES = 10;
const NO_KEY_CHAT_REPLY = 'Chat needs an AI key. Set GROQ_API_KEY and restart the server. Your plan works without it.';

const requireAi = (feature) => {
  if (!llm.info().provider) throw new HttpError(400, `${feature} needs an AI key on the server.`);
};

/** Conversation so far, normalised and size-capped, ending with the new user message. */
function buildHistory(body) {
  const history = (body.history || []).slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: clip(m.content, 2000),
  }));
  history.push({ role: 'user', content: clip(body.message, 1000) });
  return history;
}

/** POST /api/chat: answer a question about the household's plan, streaming when asked. */
async function handleChat(req, res) {
  const body = await readJsonBody(req, LIMITS.jsonBodyBytes);
  if (!llm.info().provider) return sendJson(res, 200, { reply: NO_KEY_CHAT_REPLY });

  const system = prompts.chatSystem(body);
  const messages = buildHistory(body);
  if (!body.stream) return sendJson(res, 200, { reply: await coach.chatReply(system, messages) });

  const events = startEventStream(res);
  try {
    await llm.stream({ system, messages }, (text) => events.send({ t: text }));
  } catch (error) {
    events.send({ e: error.message });
  }
  return events.done();
}

/** POST /api/vision: analyse a photo for air-quality risks. */
async function handleVision(req, res) {
  const body = await readJsonBody(req, LIMITS.imageBodyBytes);
  requireAi('Photo analysis');
  if (!isImageDataUrl(body.image)) throw new HttpError(400, 'Upload a JPEG, PNG or WebP image.');
  const reply = await llm.vision({
    system: prompts.visionSystem(body.lang),
    prompt: prompts.visionPrompt(body.pm25, body.question),
    image: body.image,
  });
  sendJson(res, 200, { reply });
}

/** POST /api/letter: draft an advocacy letter grounded in today's facts. */
async function handleLetter(req, res) {
  const body = await readJsonBody(req, LIMITS.jsonBodyBytes);
  requireAi('The letter writer');
  sendJson(res, 200, { letter: await coach.writeLetter(body) });
}

module.exports = { handleChat, handleVision, handleLetter };
