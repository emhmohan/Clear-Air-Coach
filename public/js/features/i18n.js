import { $ } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { api } from '../lib/api.js';
import { store } from '../lib/storage.js';
import { emit } from '../lib/bus.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';

/** Speech-synthesis and recognition locale for each supported language. */
export const SPEECH_LOCALES = {
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ur: 'ur-PK',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  pt: 'pt-BR',
  ar: 'ar-SA',
  zh: 'zh-CN',
  pl: 'pl-PL',
  de: 'de-DE',
};
const RTL_LANGUAGES = ['ar', 'ur'];

export const speechLocale = () => SPEECH_LOCALES[state.lang] || 'en-US';

/** Set the page language and direction (right-to-left for Arabic and Urdu). */
function applyDocumentLanguage() {
  document.documentElement.dir = RTL_LANGUAGES.includes(state.lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = state.lang;
}

/** Fill the language picker from the server's list and re-plan when the choice changes. */
export async function initLanguage() {
  try {
    const status = await api('/api/status');
    $('lang').innerHTML = Object.entries(status.langs)
      .map(([code, name]) => `<option value="${esc(code)}">${esc(name)}</option>`)
      .join('');
    $('lang').value = state.lang;
    applyDocumentLanguage();
  } catch {
    $('lang').classList.add('hidden');
  }
  $('lang').addEventListener('change', () => {
    state.lang = $('lang').value;
    store.set('cac.lang', state.lang);
    applyDocumentLanguage();
    toast('Translating your plan…');
    emit('reload');
  });
}
