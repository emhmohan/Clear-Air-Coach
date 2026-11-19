import { $ } from './lib/dom.js';
import { api } from './lib/api.js';
import { store } from './lib/storage.js';
import { emit } from './lib/bus.js';
import { state } from './state.js';

const STEPS = 3;
const FLAG_FIELDS = ['kids', 'elders', 'asthma', 'pregnant', 'exercise', 'purifier'];
const CHOICE_FIELDS = ['heating', 'cooking', 'commute', 'budget'];
const FOCUS_DELAY_MS = 30;

let step = 1;
let opener = null; // element that opened the dialog, so focus can return to it

const modal = () => $('modal');
const chips = () => document.querySelectorAll('.chip[data-k]');

function setChip(chip, on) {
  chip.classList.toggle('on', on);
  chip.setAttribute('aria-pressed', String(on));
}

function paintStep() {
  for (let n = 1; n <= STEPS; n++) $(`step${n}`).classList.toggle('hidden', n !== step);
  [...$('steps').children].forEach((bar, i) => bar.classList.toggle('on', i < step));
  $('back').style.visibility = step === 1 ? 'hidden' : 'visible';
  $('next').textContent = step === STEPS ? 'Build my plan' : 'Next';
  $('err').textContent = '';
}

/** Open the setup dialog, pre-filled with the saved profile. */
export function openOnboarding() {
  const profile = state.profile || {};
  chips().forEach((chip) => setChip(chip, !!profile[chip.dataset.k]));
  for (const field of CHOICE_FIELDS) if (profile[field]) $(field).value = profile[field];
  if (profile.commuteKm != null) $('km').value = profile.commuteKm;
  $('note').value = profile.note || '';
  $('manual').value = state.manual || '';
  $('picked').textContent = state.place ? `📍 ${state.place.label}` : '';
  step = 1;
  paintStep();
  opener = document.activeElement;
  modal().classList.remove('hidden');
  setTimeout(() => $('q').focus(), FOCUS_DELAY_MS);
}

function closeOnboarding() {
  modal().classList.add('hidden');
  if (opener?.focus) opener.focus();
}

/** Keyboard behaviour for the open dialog: Escape closes (once set up), Tab stays inside. */
function handleDialogKeys(event) {
  if (modal().classList.contains('hidden')) return;
  if (event.key === 'Escape' && state.profile) {
    closeOnboarding();
    return;
  }
  if (event.key === 'Tab') trapFocus(event);
}

/** Wrap Tab and Shift+Tab around the dialog's focusable controls. */
function trapFocus(event) {
  const focusable = [...modal().querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')].filter(
    (el) => el.offsetParent !== null && !el.disabled,
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function readProfileFromForm() {
  const profile = {};
  for (const field of FLAG_FIELDS)
    profile[field] = document.querySelector(`.chip[data-k="${field}"]`).classList.contains('on');
  for (const field of CHOICE_FIELDS) profile[field] = $(field).value;
  profile.commuteKm = Math.max(0, Number($('km').value) || 0);
  profile.note = $('note').value.trim();
  return profile;
}

function next() {
  if (step === 1 && !state.place && $('manual').value === '') {
    $('err').textContent = 'Search for your city, use your location, or enter a PM2.5 value.';
    return;
  }
  if (step < STEPS) {
    step += 1;
    paintStep();
    return;
  }
  state.profile = readProfileFromForm();
  state.manual = $('manual').value;
  store.set('cac.profile', state.profile);
  store.set('cac.place', state.place);
  store.set('cac.manual', state.manual);
  closeOnboarding();
  emit('reload');
}

const placeLabel = (p) => [p.name, p.admin, p.country].filter(Boolean).join(', ');

function choosePlace(result) {
  state.place = {
    lat: result.lat,
    lon: result.lon,
    label: placeLabel(result),
    short: [result.name, result.country].filter(Boolean).join(', '),
  };
  $('picked').textContent = `📍 ${state.place.label}`;
  $('hits').innerHTML = '';
}

async function searchPlaces() {
  $('hits').innerHTML = '';
  $('err').textContent = '';
  const query = $('q').value.trim();
  if (!query) return;
  try {
    const results = await api(`/api/geocode?q=${encodeURIComponent(query)}`);
    if (!results.length) {
      $('hits').innerHTML = '<p class="note">No matches. Try another spelling or enter PM2.5 manually.</p>';
      return;
    }
    for (const result of results) {
      const hit = document.createElement('div');
      hit.className = 'hit';
      hit.textContent = placeLabel(result);
      hit.addEventListener('click', () => choosePlace(result));
      $('hits').appendChild(hit);
    }
  } catch (error) {
    $('err').textContent = error.message;
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    $('err').textContent = 'Location is not available in this browser.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.place = {
        lat: +coords.latitude.toFixed(3),
        lon: +coords.longitude.toFixed(3),
        label: 'Your current location',
        short: 'Your location',
      };
      $('picked').textContent = '📍 Your current location';
      $('err').textContent = '';
    },
    () => {
      $('err').textContent = 'Could not get your location. Search for your city instead.';
    },
  );
}

export function initOnboarding() {
  chips().forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => setChip(chip, !chip.classList.contains('on')));
  });
  $('back').addEventListener('click', () => {
    step -= 1;
    paintStep();
  });
  $('next').addEventListener('click', next);
  $('find').addEventListener('click', searchPlaces);
  $('q').addEventListener('keydown', (event) => event.key === 'Enter' && searchPlaces());
  $('geo').addEventListener('click', useMyLocation);
  $('profileBtn').addEventListener('click', openOnboarding);
  document.addEventListener('keydown', handleDialogKeys);
}
