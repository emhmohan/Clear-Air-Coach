'use strict';
/* Extra features: scenarios, languages, outlook, impact tracker, simulator, photo lens, letter writer, voice, alerts, offline. */
const BCP = { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN', ur: 'ur-PK', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ar: 'ar-SA', zh: 'zh-CN', pl: 'pl-PL', de: 'de-DE' };

/* ---------- language ---------- */
(async function initLang() {
  try {
    const s = await api('/api/status');
    $('lang').innerHTML = Object.entries(s.langs).map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('');
    $('lang').value = state.lang; setDir();
  } catch { $('lang').classList.add('hidden'); }
})();
function setDir() { document.documentElement.dir = ['ar', 'ur'].includes(state.lang) ? 'rtl' : 'ltr'; document.documentElement.lang = state.lang; }
$('lang').onchange = () => { state.lang = $('lang').value; store.set('cac.lang', state.lang); setDir(); toast('Translating your plan…'); load(); };

/* ---------- scenarios ---------- */
const SCEN = [[null, 'Live data'], [20, '20'], [60, '60'], [150, '150'], [320, '320']];
function drawScen() {
  $('scenarios').innerHTML = SCEN.map(([v, n]) => `<button class="chip ${state.scenario === v ? 'on' : ''}" data-s="${v}">${n}</button>`).join('');
}
$('scenarios').onclick = (e) => { const s = e.target.dataset.s; if (s === undefined) return; state.scenario = s === 'null' ? null : Number(s); drawScen(); load(); };

/* ---------- weekly outlook ---------- */
function renderWeek() {
  const wk = state.data.facts.air.week || [];
  if (wk.length < 2) { $('week').innerHTML = '<p class="note">Outlook needs a city search (not a manual reading).</p>'; $('weekLead').textContent = ''; return; }
  const best = wk.reduce((a, b) => (b.mean < a.mean ? b : a)), worst = wk.reduce((a, b) => (b.mean > a.mean ? b : a));
  $('weekLead').textContent = state.data.ai?.week_tip || `Best day for outdoor plans: ${dayName(best.date)}. Roughest: ${dayName(worst.date)}.`;
  $('week').innerHTML = wk.map((d) => `<div class="wk ${d.date === best.date ? 'best' : ''}" style="border-top-color:${levelColor(d.mean)}"><b>${dayName(d.date)}</b><span class="big">${d.mean}</span><small>avg µg/m³</small><small>peak ${d.max}</small>${d.date === best.date ? '<em>Best day</em>' : ''}${d.date === worst.date && d !== best ? '<em class="bad">Worst day</em>' : ''}</div>`).join('');
}
const dayName = (d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

/* ---------- impact tracker ---------- */
const log = () => store.get('cac.log', {});
function logDay() {
  if (!state.data || state.scenario != null || state.data.facts.air.source === 'manual') return;
  const all = allActions(), valid = new Set(all.map((x) => x.id)), done = [...doneSet()].filter((id) => valid.has(id)), L = log(), t = today();
  const tr = all.find((a) => a.id === 'transit');
  L[t] = { done: done.length, total: all.length, pm: state.data.facts.air.pm25, ids: done, co2: done.includes('transit') && tr?.co2PerDay ? tr.co2PerDay : 0 };
  store.set('cac.log', L); renderImpact();
}
function streak(L) {
  let n = 0; const d = new Date();
  for (let i = 0; i < 60; i++) { const k = d.toISOString().slice(0, 10), e = L[k]; if (e && e.done / Math.max(e.total, 1) >= 0.3) n++; else if (i > 0) break; d.setDate(d.getDate() - 1); }
  return n;
}
function renderImpact() {
  const L = log(), days = Object.keys(L).sort(), flags = store.get('cac.flags', {});
  const totalDone = days.reduce((s, k) => s + L[k].done, 0), co2 = days.reduce((s, k) => s + (L[k].co2 || 0), 0), st = streak(L);
  const stat = (b, s) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`;
  $('impactStats').innerHTML = stat(st + ' 🔥', 'day streak (30%+ of plan)') + stat(totalDone, 'clean-air actions completed') + stat(co2.toFixed(1) + ' kg', 'CO₂ avoided via transport swaps (est.)') + stat(days.length, 'days tracked');
  const W = 720, H = 190, bw = (W - 40) / 7, dd = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dd.push(d.toISOString().slice(0, 10)); }
  $('trend').setAttribute('viewBox', `0 0 ${W} ${H}`);
  $('trend').innerHTML = dd.map((k, i) => { const e = L[k], p = e ? e.done / Math.max(e.total, 1) : 0, h = Math.max(4, p * 140), x = 20 + i * bw;
    return `<rect x="${x + 8}" y="${160 - h}" width="${bw - 16}" height="${h}" rx="6" fill="${e ? levelColor(e.pm) : 'var(--surface2)'}"><title>${k}: ${e ? Math.round(p * 100) + '% done, PM2.5 ' + e.pm : 'no data'}</title></rect><text x="${x + bw / 2}" y="180" font-size="11" text-anchor="middle" fill="var(--mute)">${new Date(k + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</text>`; }).join('');
  const cnt = (ids) => days.filter((k) => (L[k].ids || []).some((i) => ids.includes(i))).length;
  const B = [
    ['🌱', 'First step', 'Complete any action', totalDone >= 1], ['🔥', 'On a roll', '3-day streak', st >= 3], ['😷', 'Mask pro', 'Mask action on 3 days', cnt(['mask']) >= 3],
    ['🚌', 'Clean commuter', 'Transit swap on 3 days', cnt(['transit']) >= 3], ['🌀', 'Indoor guardian', 'Purifier or windows on 3 days', cnt(['purifier', 'diy-purifier', 'windows']) >= 3],
    ['✉️', 'Voice for change', 'Write a letter', !!flags.letter], ['📷', 'Sharp eye', 'Use Smog Lens', !!flags.lens], ['🤝', 'Community hero', 'Share an air alert', !!flags.share],
  ];
  $('badges').innerHTML = B.map(([i, n, d, ok]) => `<div class="act-tile ${ok ? 'go' : ''}" style="${ok ? '' : 'opacity:.55'}"><b>${i} ${n}<span class="st ${ok ? 'go' : ''}">${ok ? 'Earned' : 'Locked'}</span></b><small>${d}</small></div>`).join('');
}
const flag = (k) => { const f = store.get('cac.flags', {}); if (!f[k]) { f[k] = 1; store.set('cac.flags', f); renderImpact(); toast('🏅 Badge unlocked!'); } };

/* ---------- what-if simulator ---------- */
const simOpts = { mask: false, shut: false, pur: false, time: false };
function dose(o) {
  const pm = Number($('sPm').value) || 0, out = Number($('sOut').value), com = Number($('sCom').value), mode = $('sMode').value;
  const w = state.data?.facts.window, tf = o.time ? (w ? Math.min(1, Math.max(0.3, w.best.avg / Math.max(w.mean, 1))) : 0.7) : 1;
  const mk = o.mask ? 0.3 : 1, cf = { open: 1, closed: 0.5, transit: 0.7 }[mode], cmk = mode === 'closed' ? 1 : mk;
  const inF = o.pur ? (o.shut ? 0.15 : 0.5) : o.shut ? 0.45 : 0.8, inH = Math.max(0, 24 - out - com);
  return pm * (out * 2 * tf * mk + com * 1.3 * cf * tf * cmk + inH * inF);
}
function renderSim() {
  $('sOutV').textContent = $('sOut').value; $('sComV').textContent = $('sCom').value;
  const none = { mask: false, shut: false, pur: false, time: false }, base = dose(none), now = dose(simOpts), cut = base ? Math.round((1 - now / base) * 100) : 0;
  const names = { mask: 'Wear an N95 outdoors', shut: 'Keep windows shut', pur: 'Run a purifier (with windows shut)', time: 'Go out at the cleaner hour' };
  const lev = Object.keys(names).map((k) => { const o = { ...none, [k]: true }; if (k === 'pur') o.shut = true; return [k, base ? Math.round((1 - dose(o) / base) * 100) : 0]; }).sort((a, b) => b[1] - a[1]);
  const bar = (l, v, c) => `<div class="bar-row"><div class="lab"><span>${l}</span><b>${Math.round(v)} dose units</b></div><div class="bar"><i style="width:${base ? Math.max(3, v / base * 100) : 3}%;background:${c}"></i></div></div>`;
  $('simOut').innerHTML = `<div class="bars">${bar('No precautions', base, 'var(--avoid)')}${bar('Your scenario', now, 'var(--go)')}</div>
    <div class="result-box">You'd breathe in about <b>${cut}% fewer</b> particles per day.</div>
    <h4 style="margin:14px 0 4px">Biggest single levers</h4><ol class="list">${lev.map(([k, v]) => `<li>${names[k]}: <b>~${v}% less</b></li>`).join('')}</ol>
    <p class="note">Model: dose = concentration × hours × breathing rate. Indoor air is 80% of outdoor with windows open, 45% shut, 15% with purifier. Masks cut intake ~70% when fitted. Illustrative, not medical.</p>`;
}
['sPm', 'sOut', 'sCom', 'sMode'].forEach((id) => ($(id).oninput = renderSim));
[['sMask', 'mask'], ['sShut', 'shut'], ['sPur', 'pur'], ['sTime', 'time']].forEach(([id, k]) => ($(id).onclick = () => { simOpts[k] = !simOpts[k]; $(id).classList.toggle('on', simOpts[k]); renderSim(); }));

/* ---------- Smog Lens (photo analysis) ---------- */
let lensImg = null;
$('lensFile').onchange = () => {
  const f = $('lensFile').files[0]; if (!f) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const s = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); lensImg = c.toDataURL('image/jpeg', 0.82);
    $('lensPrev').src = lensImg; $('lensPrev').classList.remove('hidden'); URL.revokeObjectURL(url);
  };
  img.src = url;
};
$('lensGo').onclick = async () => {
  if (!lensImg) return toast('Choose a photo first');
  $('lensGo').disabled = true; $('lensOut').classList.remove('hidden'); $('lensOut').textContent = 'Analysing…';
  try { const d = await api('/api/vision', { image: lensImg, question: $('lensQ').value, pm25: state.data?.facts.air.pm25, lang: state.lang }); $('lensOut').innerHTML = md(d.reply); flag('lens'); }
  catch (e) { $('lensOut').textContent = e.message; }
  $('lensGo').disabled = false;
};

/* ---------- letter writer ---------- */
$('letGo').onclick = async () => {
  if (!state.data) return; $('letGo').disabled = true; $('letOut').classList.remove('hidden'); $('letOut').value = 'Writing…';
  try {
    const d = await api('/api/letter', { kind: $('letKind').value, details: $('letDet').value, facts: state.data.facts, profile: state.profile, lang: state.lang });
    $('letOut').value = d.letter; $('letCopy').classList.remove('hidden'); flag('letter');
  } catch (e) { $('letOut').value = e.message; }
  $('letGo').disabled = false;
};
$('letCopy').onclick = async () => { try { await navigator.clipboard.writeText($('letOut').value); toast('Letter copied'); } catch { $('letOut').select(); } };
$('printBtn').onclick = () => window.print();
$('copyShare').addEventListener('click', () => flag('share'));

/* ---------- voice ---------- */
$('speak').onclick = () => {
  if (!('speechSynthesis' in window)) return toast('Read-aloud is not supported in this browser');
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  const f = state.data.facts, ai = state.data.ai, acts = allActions().slice(0, 3).map((a) => a.title).join('. ');
  const u = new SpeechSynthesisUtterance(`${ai?.summary || f.air.headline} ${acts}`); u.lang = BCP[state.lang] || 'en-US'; u.rate = 0.95; speechSynthesis.speak(u);
};
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) $('mic').classList.add('hidden');
else $('mic').onclick = () => {
  const r = new SR(); r.lang = BCP[state.lang] || 'en-US'; r.interimResults = false;
  r.onresult = (e) => { $('msg').value = e.results[0][0].transcript; ask(); };
  r.onerror = () => toast('Could not hear you. Check microphone permission.'); r.start(); toast('Listening…');
};

/* ---------- alerts ---------- */
function updateNotifyBtn() { $('notify').textContent = store.get('cac.notify', false) ? '🔔 Alerts on' : '🔔 Alerts'; }
$('notify').onclick = async () => {
  if (!('Notification' in window)) return toast('Notifications are not supported here');
  if (store.get('cac.notify', false)) { store.set('cac.notify', false); updateNotifyBtn(); return toast('Alerts off'); }
  const p = await Notification.requestPermission(); if (p === 'granted') { store.set('cac.notify', true); updateNotifyBtn(); toast('Alerts on: we will warn you on smoggy days'); checkAlert(); } else toast('Permission denied');
};
function checkAlert() {
  const f = state.data?.facts; if (!f || !store.get('cac.notify', false) || Notification.permission !== 'granted' || f.air.levelIndex < 2) return;
  if (store.get('cac.alerted', '') === today()) return; store.set('cac.alerted', today());
  new Notification(`Air alert: PM2.5 ${f.air.pm25} (${f.air.level})`, { body: f.air.headline + (f.window ? ` Cleanest hours ${f.window.best.start}-${f.window.best.end}.` : ''), icon: '/icon.svg' });
}

/* ---------- hook into render + offline ---------- */
const WHO = [['pm25', 'PM2.5', 'µg/m³', 15], ['pm10', 'PM10', 'µg/m³', 45], ['no2', 'NO₂', 'µg/m³', 25], ['so2', 'SO₂', 'µg/m³', 40]];
function renderPollutants() {
  const a = state.data.facts.air, w = a.weather, st = a.stagnation;
  if (a.source === 'manual') { $('polLead').textContent = 'Only PM2.5 is available for a manual reading.'; $('pol').innerHTML = ''; return; }
  $('polLead').textContent = 'Live model data, compared with the WHO 2021 24-hour guideline values.';
  const val = (k) => (k === 'pm25' ? a.pm25 : a[k]);
  const rows = WHO.map(([k, n, u, g]) => { const v = val(k); if (v == null) return ''; const r = v / g; return `<tr><td>${n}</td><td><b>${Math.round(v * 10) / 10}</b> ${u}</td><td>${g} ${u}</td><td style="color:${r > 1 ? 'var(--avoid)' : 'var(--go)'};font-weight:700">${r.toFixed(1)}×</td></tr>`; }).join('');
  const extra = [a.o3 != null ? `O₃ ${Math.round(a.o3)} µg/m³` : '', a.co != null ? `CO ${Math.round(a.co)} µg/m³` : ''].filter(Boolean).join(' · ');
  $('pol').innerHTML = `<table class="tbl"><thead><tr><th>Pollutant</th><th>Now</th><th>WHO 24h guideline</th><th>Times guideline</th></tr></thead><tbody>${rows}</tbody></table>${extra ? `<p class="note">${extra}</p>` : ''}` +
    (w ? `<div class="stats" style="margin-top:12px"><div class="stat"><b>${w.temp}°C</b><span>temperature</span></div><div class="stat"><b>${w.humidity}%</b><span>humidity</span></div><div class="stat"><b>${w.wind} km/h</b><span>wind</span></div><div class="stat"><b>${w.maxMixingHeight ?? '–'} m</b><span>peak mixing height today</span></div></div>` : '') +
    (st ? `<div class="ai-box" style="margin-top:12px"><b>Trapping risk: ${esc(st.level)}.</b> ${esc(st.note)}</div>` : '');
}
function simBanner() { if (state.scenario != null) banner('<b>Simulation:</b> showing a what-if PM2.5 of ' + state.scenario + ' µg/m³, not live data. Nothing is saved to your tracker. <button class="btn soft" id="liveBtn">Back to live data</button>'), $('liveBtn').onclick = () => { state.scenario = null; load(); }; }
function renderExtras() { drawScen(); renderWeek(); renderPollutants(); renderImpact(); renderSim(); updateNotifyBtn(); if (state.scenario == null) { checkAlert(); logDay(); } simBanner(); }
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
