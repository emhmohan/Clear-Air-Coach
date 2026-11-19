import { $ } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';
import { unlockBadge } from './impact.js';

async function writeLetter() {
  if (!state.data) return;
  $('letGo').disabled = true;
  $('letOut').classList.remove('hidden');
  $('letOut').value = 'Writing…';
  try {
    const result = await api('/api/letter', {
      kind: $('letKind').value,
      details: $('letDet').value,
      facts: state.data.facts,
      profile: state.profile,
      lang: state.lang,
    });
    $('letOut').value = result.letter;
    $('letCopy').classList.remove('hidden');
    unlockBadge('letter');
  } catch (error) {
    $('letOut').value = error.message;
  }
  $('letGo').disabled = false;
}

async function copyLetter() {
  try {
    await navigator.clipboard.writeText($('letOut').value);
    toast('Letter copied');
  } catch {
    $('letOut').select();
  }
}

export function initLetter() {
  $('letGo').addEventListener('click', writeLetter);
  $('letCopy').addEventListener('click', copyLetter);
}
