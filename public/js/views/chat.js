import { $ } from '../lib/dom.js';
import { esc, md } from '../lib/format.js';
import { postRaw } from '../lib/api.js';
import { state } from '../state.js';

const MAX_SUGGESTIONS = 5;

function suggestions(profile) {
  const questions = ['What is the single most useful thing I can do today?'];
  if (profile.kids) questions.push('Is it safe for my kids to go to school today?');
  if (profile.asthma) questions.push('What should I do if my asthma gets worse?');
  if (profile.cooking === 'gas') questions.push('How do I cook with less indoor smoke?');
  questions.push('Which mask should I buy?', 'How can we cut our own emissions this winter?');
  return questions.slice(0, MAX_SUGGESTIONS);
}

function addBubble(role, text, extraClass = '') {
  const el = document.createElement('div');
  el.className = `msg ${role === 'user' ? 'u' : 'a'} ${extraClass}`.trim();
  if (role === 'user') el.textContent = text;
  else el.innerHTML = md(text);
  $('chatlog').appendChild(el);
  $('chatlog').scrollTop = $('chatlog').scrollHeight;
  return el;
}

/** Render the chat page: suggested questions and a welcome message. */
export function renderChat() {
  $('suggest').innerHTML = suggestions(state.profile)
    .map((q) => `<button class="chip">${esc(q)}</button>`)
    .join('');
  if ($('chatlog').children.length === 0) {
    addBubble(
      'assistant',
      state.data.aiEnabled
        ? "Hi! Ask me anything about today's air, your plan or your home."
        : 'Chat needs an AI key on the server (GROQ_API_KEY). Your plan and tools work without it.',
    );
  }
}

/** Parse one SSE block ("data: {...}") into its JSON payload, or null for [DONE]/blank. */
function parseEvent(block) {
  const line = block.replace(/^data: /, '');
  if (!line || line === '[DONE]') return null;
  try {
    return JSON.parse(line);
  } catch {
    return null; // partial block; ignore
  }
}

/** Read a streamed reply, updating the bubble as text arrives. @returns {Promise<string>} full reply */
async function readStream(response, bubble) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let reply = '';
  let buffer = '';
  bubble.textContent = '';
  bubble.classList.remove('typing');
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop();
    for (const block of blocks) {
      const event = parseEvent(block);
      if (!event) continue;
      if (event.e) throw new Error(event.e);
      reply += event.t || '';
      bubble.innerHTML = md(reply);
      $('chatlog').scrollTop = $('chatlog').scrollHeight;
    }
  }
  return reply;
}

/** Send the question in the input box and show the (streamed) answer. */
export async function ask() {
  const message = $('msg').value.trim();
  if (!message || !state.data) return;
  $('msg').value = '';
  addBubble('user', message);
  const bubble = addBubble('assistant', 'Thinking…', 'typing');
  $('send').disabled = true;
  try {
    const response = await postRaw('/api/chat', {
      message,
      history: state.history,
      facts: state.data.facts,
      profile: state.profile,
      lang: state.lang,
      stream: true,
    });
    const streaming = (response.headers.get('content-type') || '').includes('event-stream');
    if (!response.ok || !streaming) {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Request failed');
      bubble.innerHTML = md(data.reply);
      bubble.classList.remove('typing');
    } else {
      const reply = await readStream(response, bubble);
      state.history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
    }
  } catch (error) {
    bubble.textContent = `Sorry, that did not work: ${error.message}`;
    bubble.classList.remove('typing');
  }
  $('send').disabled = false;
}

export function initChat() {
  $('send').addEventListener('click', ask);
  $('msg').addEventListener('keydown', (event) => event.key === 'Enter' && ask());
  $('suggest').addEventListener('click', (event) => {
    if (!event.target.classList.contains('chip')) return;
    $('msg').value = event.target.textContent;
    ask();
  });
}
