import { $ } from '../lib/dom.js';
import { md } from '../lib/format.js';
import { api } from '../lib/api.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';
import { unlockBadge } from './impact.js';

const MAX_SIDE_PX = 1024;
const JPEG_QUALITY = 0.82;

let photo = null; // data URL of the resized photo

/** Downscale a photo to keep uploads small and fast, returning a JPEG data URL. */
function resizeToDataUrl(img) {
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function onFileChosen() {
  const file = $('lensFile').files[0];
  if (!file) return;
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    photo = resizeToDataUrl(img);
    $('lensPrev').src = photo;
    $('lensPrev').classList.remove('hidden');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

async function analyse() {
  if (!photo) return toast('Choose a photo first');
  $('lensGo').disabled = true;
  $('lensOut').classList.remove('hidden');
  $('lensOut').textContent = 'Analysing…';
  try {
    const result = await api('/api/vision', {
      image: photo,
      question: $('lensQ').value,
      pm25: state.data?.facts.air.pm25,
      lang: state.lang,
    });
    $('lensOut').innerHTML = md(result.reply);
    unlockBadge('lens');
  } catch (error) {
    $('lensOut').textContent = error.message;
  }
  $('lensGo').disabled = false;
  return undefined;
}

export function initLens() {
  $('lensFile').addEventListener('change', onFileChosen);
  $('lensGo').addEventListener('click', analyse);
}
