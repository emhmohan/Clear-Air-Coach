'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// tiny safe markdown: escape first, then allow bold, italics, code, bullets and line breaks
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/^\s*[-•*]\s+(.*)$/gm, '&bull; $1')
  .replace(/^#{1,4}\s*(.*)$/gm, '<b>$1</b>')
  .replace(/\n/g, '<br>');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
const LEVELS = [[9, '#2e9e5b'], [35.4, '#c9a400'], [55.4, '#e67e22'], [125.4, '#d93a3a'], [225.4, '#8e3fa8'], [Infinity, '#7a1f3d']];
const levelColor = (pm) => LEVELS.find((l) => pm <= l[0])[1];
const today = () => new Date().toISOString().slice(0, 10);

let state = { profile: store.get('cac.profile', null), place: store.get('cac.place', null), manual: store.get('cac.manual', ''), data: null, cat: 'all', history: [], lang: store.get('cac.lang', 'en'), scenario: null };

/* ---------- helpers ---------- */
async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }

/* ---------- theme & nav ---------- */
function applyTheme(t) { document.documentElement.dataset.theme = t; store.set('cac.theme', t); }
applyTheme(store.get('cac.theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

function show(v) {
  document.querySelectorAll('.view').forEach((s) => s.classList.toggle('on', s.id === 'v-' + v));
  document.querySelectorAll('.side [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  window.scrollTo({ top: 0 });
}
document.querySelector('.side').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) show(b.dataset.v); });
$('aboutLink').onclick = (e) => { e.preventDefault(); show('about'); };

/* ---------- onboarding ---------- */
let step = 1, draft = {};
const BOOL = ['kids', 'elders', 'asthma', 'pregnant', 'exercise', 'purifier'];
function openModal() {
  const p = state.profile || {};
  draft = { ...p };
  document.querySelectorAll('.chip[data-k]').forEach((c) => c.classList.toggle('on', !!p[c.dataset.k]));
  ['heating', 'cooking', 'commute', 'budget'].forEach((k) => { if (p[k]) $(k).value = p[k]; });
  if (p.commuteKm != null) $('km').value = p.commuteKm;
  $('note').value = p.note || ''; $('manual').value = state.manual || '';
  $('picked').textContent = state.place ? '📍 ' + state.place.label : '';
  step = 1; paintStep(); $('modal').classList.remove('hidden');
}
function paintStep() {
  [1, 2, 3].forEach((n) => $('step' + n).classList.toggle('hidden', n !== step));
  [...$('steps').children].forEach((el, i) => el.classList.toggle('on', i < step));
  $('back').style.visibility = step === 1 ? 'hidden' : 'visible';
  $('next').textContent = step === 3 ? 'Build my plan' : 'Next'; $('err').textContent = '';
}
document.querySelectorAll('.chip[data-k]').forEach((c) => (c.onclick = () => c.classList.toggle('on')));
$('back').onclick = () => { step--; paintStep(); };
$('next').onclick = async () => {
  if (step === 1) {
    if (!state.place && $('manual').value === '') { $('err').textContent = 'Search for your city, use your location, or enter a PM2.5 value.'; return; }
    step = 2; return paintStep();
  }
  if (step === 2) { step = 3; return paintStep(); }
  const p = {};
  BOOL.forEach((k) => (p[k] = document.querySelector(`.chip[data-k="${k}"]`).classList.contains('on')));
  ['heating', 'cooking', 'commute', 'budget'].forEach((k) => (p[k] = $(k).value));
  p.commuteKm = Math.max(0, Number($('km').value) || 0); p.note = $('note').value.trim();
  state.profile = p; state.manual = $('manual').value;
  store.set('cac.profile', p); store.set('cac.place', state.place); store.set('cac.manual', state.manual);
  $('modal').classList.add('hidden'); load();
};
$('profileBtn').onclick = openModal;

$('find').onclick = async () => {
  $('hits').innerHTML = ''; $('err').textContent = '';
  const q = $('q').value.trim(); if (!q) return;
  try {
    const list = await api('/api/geocode?q=' + encodeURIComponent(q));
    if (!list.length) { $('hits').innerHTML = '<p class="note">No matches. Try another spelling or enter PM2.5 manually.</p>'; return; }
    list.forEach((p) => {
      const d = document.createElement('div'); d.className = 'hit';
      const label = [p.name, p.admin, p.country].filter(Boolean).join(', ');
      d.textContent = label;
      d.onclick = () => { state.place = { lat: p.lat, lon: p.lon, label, short: [p.name, p.country].filter(Boolean).join(', ') }; $('picked').textContent = '📍 ' + label; $('hits').innerHTML = ''; };
      $('hits').appendChild(d);
    });
  } catch (e) { $('err').textContent = e.message; }
};
$('q').addEventListener('keydown', (e) => e.key === 'Enter' && $('find').click());
$('geo').onclick = () => {
  if (!navigator.geolocation) { $('err').textContent = 'Location is not available in this browser.'; return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    state.place = { lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), label: 'Your current location', short: 'Your location' };
    $('picked').textContent = '📍 Your current location'; $('err').textContent = '';
  }, () => { $('err').textContent = 'Could not get your location. Search for your city instead.'; });
};

/* ---------- loading ---------- */
async function load() {
  if (!state.profile) return openModal();
  $('loading').classList.remove('hidden'); $('banner').classList.add('hidden');
  try {
    const body = { profile: state.profile, note: state.profile.note, manualPm25: state.scenario ?? state.manual, lang: state.lang };
    if (state.place) Object.assign(body, { lat: state.place.lat, lon: state.place.lon, place: state.place.short });
    state.data = await api('/api/plan', body);
    store.set('cac.last', { at: Date.now(), data: state.data });
    renderAll();
    if (state.data.note) banner(state.data.note);
    else if (!state.data.aiEnabled) banner('Running in built-in mode. Add an <code>GROQ_API_KEY</code> on the server to unlock AI personalisation and chat.');
  } catch (e) {
    const cached = store.get('cac.last', null);
    if (cached) { state.data = cached.data; renderAll(); banner('Offline or data unavailable (' + esc(e.message) + '). Showing your last plan from ' + new Date(cached.at).toLocaleString() + '.'); }
    else { banner(esc(e.message) + ' <button class="btn soft" id="retry">Edit location</button>'); const r = $('retry'); if (r) r.onclick = openModal; }
  }
  $('loading').classList.add('hidden');
}
function banner(html) { $('banner').innerHTML = `<span>${html}</span>`; $('banner').classList.remove('hidden'); }
$('refresh').onclick = () => { load(); toast('Refreshing…'); };
setInterval(() => { if (state.data && state.place) load(); }, 30 * 60 * 1000);

/* ---------- render ---------- */
function renderAll() { renderToday(); renderPlan(); renderIndoor(); renderCommunity(); renderChat(); if (window.renderExtras) renderExtras(); }

function gauge(pm, color) {
  const len = Math.PI * 80, fill = Math.min(pm / 250, 1) * len;
  return `<div class="gauge"><svg viewBox="0 0 200 110" aria-hidden="true"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--surface2)" stroke-width="16" stroke-linecap="round"/><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${fill} ${len}"/></svg><div class="val"><b>${esc(pm)}</b><span>PM2.5 µg/m³</span></div></div>`;
}

function renderToday() {
  const { facts: f, ai } = state.data, a = f.air;
  const when = a.time ? 'Updated ' + a.time.replace('T', ' ') + ' local' : 'Manual reading';
  $('hero').innerHTML = `${gauge(a.pm25, a.color)}<div><span class="pill" style="background:${a.color}">${esc(a.level)}</span><h1>${esc(a.headline)}</h1>
    <div class="place">${a.place ? '📍 ' + esc(a.place) + ' · ' : ''}${esc(when)}</div>${ai?.summary ? `<div class="ai-box">${esc(ai.summary)}</div>` : ''}</div>`;
  const stat = (b, s) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`;
  $('stats').innerHTML =
    stat(f.cigarettes, 'cigarette-equivalents/day if outdoors all day (rough rule of thumb)') +
    stat('~' + f.indoor.now, 'est. indoor PM2.5 now, ' + (state.profile.purifier ? 'purifier on' : 'windows shut')) +
    stat('~' + f.indoor.open, 'est. indoor PM2.5 with windows open') +
    (a.aqi != null ? stat(a.aqi, 'US AQI') : '') + (a.no2 != null ? stat(Math.round(a.no2), 'NO₂ µg/m³ (traffic &amp; gas)') : '') +
    (f.summary.co2Winter ? stat('~' + f.summary.co2Winter + ' kg', 'CO₂ you could save this winter by switching transport') : '');
  const lab = { go: 'Good to go', caution: 'Take care', avoid: 'Avoid' };
  $('acts').innerHTML = f.activities.map((x) => `<div class="act-tile ${x.status}"><b>${esc(x.label)}<span class="st ${x.status}">${lab[x.status]}</span></b><small>${esc(x.note)}</small></div>`).join('');
  $('timeline').innerHTML = f.schedule.map((s) => `<div><b>${esc(s.time)}</b><span>${esc(s.text)}</span></div>`).join('');
  drawChart(a.forecast || [], f.window);
}

function drawChart(fc, win) {
  const svg = $('chart');
  if (fc.length < 3) { svg.innerHTML = ''; svg.style.height = '0'; $('legend').innerHTML = ''; $('chartLead').textContent = 'Hourly forecast is unavailable for a manual reading. Enter a city to see it.'; return; }
  svg.style.height = ''; $('chartLead').textContent = win ? `Cleanest around ${win.best.start} (~${win.best.avg} µg/m³). Dirtiest around ${win.worst.start} (~${win.worst.avg} µg/m³).` : 'Plan outdoor time around the cleaner hours.';
  const W = 720, H = 190, pad = { l: 34, r: 6, t: 10, b: 24 }, max = Math.max(50, ...fc.map((h) => h.pm25)) * 1.1;
  const bw = (W - pad.l - pad.r) / fc.length, y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const inBest = (h) => win && h.time.slice(11, 16) >= win.best.start && h.time.slice(11, 16) < win.best.end && h.time.slice(0, 10) === fc[0].time.slice(0, 10);
  let out = [0, 0.5, 1].map((t) => { const v = max * t; const yy = y(v); return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="4" y="${yy + 4}" font-size="10" fill="var(--mute)">${Math.round(v)}</text>`; }).join('');
  fc.forEach((h, i) => {
    const x = pad.l + i * bw, yy = y(h.pm25);
    out += `<rect x="${x + 1.5}" y="${yy}" width="${bw - 3}" height="${H - pad.b - yy}" rx="3" fill="${levelColor(h.pm25)}" opacity="${i === 0 ? 1 : 0.82}" ${inBest(h) ? 'stroke="var(--ink)" stroke-width="2"' : ''}><title>${h.time.slice(11, 16)}: ${h.pm25} µg/m³</title></rect>`;
    if (i % 3 === 0) out += `<text x="${x + bw / 2}" y="${H - 7}" font-size="10" text-anchor="middle" fill="var(--mute)">${h.time.slice(11, 13)}h</text>`;
  });
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = out;
  $('legend').innerHTML = [['Good', '#2e9e5b'], ['Moderate', '#c9a400'], ['Sensitive', '#e67e22'], ['Unhealthy', '#d93a3a'], ['Very unhealthy+', '#8e3fa8']].map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('') + '<span>▭ outlined = best window</span>';
}

/* plan */
const CATS = [['all', 'All'], ['routine', 'Daily routine'], ['indoor', 'Indoor air'], ['sustainable', 'Sustainable']];
const simDone = new Set(); // simulation ticks live in memory only, never in the real tracker
const doneSet = () => (state.scenario != null ? simDone : new Set(store.get('cac.done.' + today(), [])));
function allActions() {
  const { facts: f, ai } = state.data;
  const extra = (ai?.extra_tips || []).map((t, i) => ({ id: 'ai' + i, category: 'routine', title: t.title, detail: t.detail, why: t.why, impact: { label: 'Impact', value: t.impact, note: '' }, extra: true }));
  const tr = ai?.translated || {};
  return [...f.actions.map((a) => ({ ...a, ...(tr[a.id] && { title: tr[a.id].title || a.title, detail: tr[a.id].detail || a.detail, why: tr[a.id].why || a.why }) })), ...extra];
}
function renderPlan() {
  $('catChips').innerHTML = CATS.map(([k, n]) => `<button class="chip ${state.cat === k ? 'on' : ''}" data-c="${k}">${n}</button>`).join('');
  $('catChips').onclick = (e) => { if (e.target.dataset.c) { state.cat = e.target.dataset.c; renderPlan(); } };
  const ai = state.data.ai, all = allActions(), done = doneSet();
  const pct = all.length ? Math.round(all.filter((a) => done.has(a.id)).length / all.length * 100) : 0;
  $('ringArc').setAttribute('stroke-dasharray', `${pct} ${100 - pct}`); $('ringTxt').textContent = pct + '%';
  $('planList').innerHTML = all.filter((x) => state.cat === 'all' || x.category === state.cat).map((x) => `<div class="plan-item ${done.has(x.id) ? 'done' : ''}" data-id="${esc(x.id)}">
    <button class="check" aria-label="Mark done" aria-pressed="${done.has(x.id)}">✓</button>
    <div><h3>${esc(x.title)}<span class="tag">${esc(x.category)}</span>${x.extra ? '<span class="tag">AI tip</span>' : ''}</h3>
    <div>${esc(x.detail)}</div>${ai?.personalized?.[x.id] ? `<div class="ai-line">${esc(ai.personalized[x.id])}</div>` : ''}
    <div class="impact"><b>${esc(x.impact.label)}:</b> ${esc(x.impact.value)}${x.impact.note ? ` <span class="note">(${esc(x.impact.note)})</span>` : ''}</div>
    <div class="why"><b>Why it works:</b> ${esc(x.why)}${x.cost ? ` · <b>Cost:</b> ${esc(x.cost)}` : ''}</div></div></div>`).join('');
}
$('planList').onclick = (e) => {
  const item = e.target.closest('.plan-item'); if (!item || !e.target.closest('.check')) return;
  const s = doneSet(), id = item.dataset.id; s.has(id) ? s.delete(id) : s.add(id);
  if (state.scenario == null) store.set('cac.done.' + today(), [...s]); renderPlan(); if (window.logDay) logDay();
  if (s.has(id)) toast('Nice. One more step toward cleaner air.');
};

/* indoor */
function renderIndoor() {
  const { facts: f } = state.data, o = f.air.pm25, max = Math.max(o, 1);
  const row = (l, v, c) => `<div class="bar-row"><div class="lab"><span>${l}</span><b>${v} µg/m³</b></div><div class="bar"><i style="width:${Math.max(3, v / max * 100)}%;background:${c}"></i></div></div>`;
  $('indoorBars').innerHTML = row('Outdoors', o, levelColor(o)) + row('Indoors, windows open', f.indoor.open, levelColor(f.indoor.open)) + row('Indoors, windows shut', f.indoor.closed, levelColor(f.indoor.closed)) + row('Shut + purifier', f.indoor.purified, levelColor(f.indoor.purified));
  const calc = () => {
    const a = Number($('rArea').value) || 0, h = Number($('rH').value) || 0, vol = a * h, cadr = Math.round(vol * 4.8);
    $('cadr').innerHTML = `Room volume <b>${vol.toFixed(0)} m³</b><br>Look for a CADR of at least <b>${cadr} m³/h</b> (~${Math.round(cadr / 1.7)} CFM)<div class="note">Rule of thumb: about 4-5 full air changes per hour. A DIY Corsi-Rosenthal box delivers roughly 400-600 m³/h.</div>`;
  };
  $('rArea').oninput = $('rH').oninput = calc; calc();
  $('rooms').innerHTML = [
    ['🛏 Bedroom', 'Top priority: you spend ~8 hours here. Keep the door and window shut, run the purifier all night, and wash bedding weekly.'],
    ['🍳 Kitchen', 'Use the hood vented outdoors, cook with lids, and avoid high-heat frying. Gas stoves add NO₂, so ventilate after cooking.'],
    ['🛋 Living room', 'Use the DIY or HEPA purifier here by day. Skip candles and incense, and damp-dust instead of sweeping.'],
    ['🚪 Doors & windows', 'Seal gaps with weatherstrip tape. Air out for 5-10 minutes only at the cleanest hour' + (f.window ? ' (about ' + f.window.best.start + ' today)' : '') + '.'],
  ].map(([t, d]) => `<div class="room"><h4>${t}</h4><div>${esc(d)}</div></div>`).join('');
  $('myths').innerHTML = f.myths.map((m) => `<li>${esc(m)}</li>`).join('');
}

/* community */
function shareMessage() {
  const { facts: f } = state.data, a = f.air, top = f.actions.slice(0, 3).map((x) => '• ' + x.title).join('\n');
  const bad = f.activities.filter((x) => x.status === 'avoid').map((x) => x.label.toLowerCase());
  return `🌫️ Air alert${a.place ? ' · ' + a.place : ''}\nPM2.5 ${a.pm25} µg/m³ (${a.level}).\n${a.headline}\n${bad.length ? 'Avoid today: ' + bad.join(', ') + '.\n' : ''}${f.window ? `Cleanest hours: ${f.window.best.start}-${f.window.best.end}.\n` : ''}\nTop steps:\n${top}\n\nPlease check on elderly neighbours and anyone with breathing problems.`;
}
function renderCommunity() {
  $('shareText').value = shareMessage(); $('health').textContent = state.data.facts.health;
  $('copyShare').onclick = async () => { try { await navigator.clipboard.writeText($('shareText').value); toast('Copied to clipboard'); } catch { $('shareText').select(); toast('Press Ctrl+C to copy'); } };
  $('nativeShare').onclick = async () => { if (navigator.share) { try { await navigator.share({ text: $('shareText').value }); } catch { /* cancelled */ } } else $('copyShare').click(); };
}

/* chat */
function bubble(role, text, cls = '') { const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'u' : 'a') + ' ' + cls; if (role === 'user') d.textContent = text; else d.innerHTML = md(text); $('chatlog').appendChild(d); $('chatlog').scrollTop = 1e6; return d; }
function renderChat() {
  const p = state.profile, qs = ['What is the single most useful thing I can do today?'];
  if (p.kids) qs.push('Is it safe for my kids to go to school today?');
  if (p.asthma) qs.push('What should I do if my asthma gets worse?');
  if (p.cooking === 'gas') qs.push('How do I cook with less indoor smoke?');
  qs.push('Which mask should I buy?', 'How can we cut our own emissions this winter?');
  $('suggest').innerHTML = qs.slice(0, 5).map((q) => `<button class="chip">${esc(q)}</button>`).join('');
  $('suggest').onclick = (e) => { if (e.target.classList.contains('chip')) { $('msg').value = e.target.textContent; ask(); } };
  if (!$('chatlog').children.length) bubble('assistant', state.data.aiEnabled ? 'Hi! Ask me anything about today\'s air, your plan or your home.' : 'Chat needs an AI key on the server (GROQ_API_KEY). Your plan and tools work without it.');
}
async function ask() {
  const m = $('msg').value.trim(); if (!m || !state.data) return; $('msg').value = '';
  bubble('user', m); const w = bubble('assistant', 'Thinking…', 'typing'); $('send').disabled = true;
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: m, history: state.history, facts: state.data.facts, profile: state.profile, lang: state.lang, stream: true }) });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('event-stream')) {
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed');
      w.innerHTML = md(d.reply); w.classList.remove('typing');
    } else {
      let reply = '', buf = ''; w.textContent = ''; w.classList.remove('typing');
      const rd = r.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true }); const parts = buf.split('\n\n'); buf = parts.pop();
        for (const part of parts) {
          const line = part.replace(/^data: /, ''); if (!line || line === '[DONE]') continue;
          try { const j = JSON.parse(line); if (j.e) throw new Error(j.e); reply += j.t || ''; w.innerHTML = md(reply); $('chatlog').scrollTop = 1e6; } catch (err) { if (err.message && !(err instanceof SyntaxError)) throw err; }
        }
      }
      state.history.push({ role: 'user', content: m }, { role: 'assistant', content: reply });
    }
  } catch (e) { w.textContent = 'Sorry, that did not work: ' + e.message; w.classList.remove('typing'); }
  $('send').disabled = false;
}
$('send').onclick = ask; $('msg').addEventListener('keydown', (e) => e.key === 'Enter' && ask());

load();
