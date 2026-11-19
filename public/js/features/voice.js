import { $ } from '../lib/dom.js';
import { state } from '../state.js';
import { allActions } from '../actions.js';
import { toast } from '../ui/toast.js';
import { ask } from '../views/chat.js';
import { speechLocale } from './i18n.js';

const SPEECH_RATE = 0.95;
const SPOKEN_ACTIONS = 3;

/** Read today's summary and top actions aloud (tap again to stop). */
function toggleReadAloud() {
  if (!('speechSynthesis' in window)) return toast('Read-aloud is not supported in this browser');
  if (speechSynthesis.speaking) return speechSynthesis.cancel();
  const { facts, ai } = state.data;
  const actions = allActions()
    .slice(0, SPOKEN_ACTIONS)
    .map((a) => a.title)
    .join('. ');
  const utterance = new SpeechSynthesisUtterance(`${ai?.summary || facts.air.headline} ${actions}`);
  utterance.lang = speechLocale();
  utterance.rate = SPEECH_RATE;
  return speechSynthesis.speak(utterance);
}

/** Dictate a question into the chat. */
function listen(Recognition) {
  const recognition = new Recognition();
  recognition.lang = speechLocale();
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    $('msg').value = event.results[0][0].transcript;
    ask();
  };
  recognition.onerror = () => toast('Could not hear you. Check microphone permission.');
  recognition.start();
  toast('Listening…');
}

export function initVoice() {
  $('speak').addEventListener('click', toggleReadAloud);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Recognition) $('mic').addEventListener('click', () => listen(Recognition));
  else $('mic').classList.add('hidden');
}
