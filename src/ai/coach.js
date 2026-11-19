'use strict';

const llm = require('../services/llm');
const prompts = require('./prompts');

/** Latin-script languages need fewer tokens than Indic, Arabic or Chinese scripts. */
const COMPACT_SCRIPT_LANGS = ['en', 'es', 'fr', 'pt', 'pl', 'de'];
const TOKENS = { personalise: 1400, translateCompact: 2400, translateWide: 3500, letter: 700, chat: 600 };

/**
 * Pull the first JSON object out of a model reply (models sometimes wrap it in prose).
 * @param {string} text
 * @returns {object|null}
 */
function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

/**
 * Ask the large model for a household-specific summary, per-action tailoring and tips.
 * @returns {Promise<{summary: string, personalized: object, extra_tips: object[], week_tip: string}>}
 */
async function personalise(facts, profile, note, lang) {
  const text = await llm.complete({
    system: prompts.SYSTEM,
    messages: [{ role: 'user', content: prompts.personalisePrompt(facts, profile, note, lang) }],
    json: true,
    max: TOKENS.personalise,
  });
  const parsed = extractJson(text);
  if (!parsed) throw new Error('No JSON from model');
  return parsed;
}

/** Translate every action's title, detail and rationale into the target language. */
async function translateActions(facts, lang) {
  const source = Object.fromEntries(facts.actions.map((a) => [a.id, { title: a.title, detail: a.detail, why: a.why }]));
  const text = await llm.complete({
    system: prompts.TRANSLATOR_SYSTEM,
    messages: [{ role: 'user', content: prompts.translationPrompt(source, lang) }],
    json: true,
    fast: true,
    temperature: 0.2,
    max: COMPACT_SCRIPT_LANGS.includes(lang) ? TOKENS.translateCompact : TOKENS.translateWide,
  });
  return extractJson(text);
}

/** Plain-text letter without markdown markers. */
async function writeLetter(input) {
  const text = await llm.complete({
    system: prompts.SYSTEM,
    messages: [{ role: 'user', content: prompts.letterPrompt(input) }],
    max: TOKENS.letter,
    temperature: 0.6,
    fast: true,
  });
  return text.replace(/\*\*|^#+\s*/gm, '').trim();
}

/** Non-streaming chat reply. */
const chatReply = (system, messages) => llm.complete({ system, messages, max: TOKENS.chat, fast: true });

module.exports = { personalise, translateActions, writeLetter, chatReply, extractJson };
