# Clear Air Coach

A Groq-powered GenAI assistant that helps families and communities get through severe winter smog: live air data, low-emission routines, indoor air hacks, sustainable swaps, and a plain explanation of the **direct impact** of every choice.

## Features

| Area | What it does |
|---|---|
| **Live data** | PM2.5, PM10, NO₂, O₃, SO₂, CO, AQI with WHO-guideline multiples; weather, wind and mixing height to flag winter inversions; 24h chart with the cleanest window; 5-day outlook (Open-Meteo, no key). See the in-app **Data and method** page for sources and limits |
| **Personal plan** | Rules engine builds prioritised actions from household profile (kids, elders, asthma, heating, cooking, commute, budget), each with quantified impact and "why" |
| **Groq GenAI** | Personalised summary, tailored actions, extra tips, week advice, fast **streaming chat** |
| **Multilingual** | 14 languages: the whole plan is translated, UI flips to RTL for Arabic/Urdu |
| **Smog Lens** | Upload a photo (window, stove, mask, street); Groq vision finds risks and fixes |
| **What-if simulator** | Toggle mask, windows, purifier, timing and see % fewer particles inhaled, plus the biggest levers |
| **Impact tracker** | Daily checklist, streaks, 7-day trend, CO₂ avoided, unlockable badges |
| **Community** | One-tap shareable alert, AI **letter writer** (school, landlord, employer, council), printable plan |
| **Accessibility** | Voice input and read-aloud, skip link, reduced motion, dark mode, mobile layout |
| **Alerts & offline** | Browser notifications on smoggy days, PWA with offline shell and last-plan fallback |
| **Simulation mode** | Clearly labelled what-if PM2.5 values (20 / 60 / 150 / 320). Never saved to the tracker |
| **Safety & robustness** | Grounded prompts (no invented numbers), prompt-injection guard, CSP and security headers, rate limiting, caching, input validation, unit tests |

## Run

```bash
cp .env.example .env        # then put your key in GROQ_API_KEY (free at console.groq.com)
node server.js              # http://localhost:3000
npm test                    # 5 engine unit tests + 13 end-to-end tests (real Open-Meteo and Groq calls)
```

PowerShell without a `.env`: `$env:GROQ_API_KEY="gsk_..."; node server.js`. Docker: `docker build -t clear-air . && docker run -p 3000:3000 -e GROQ_API_KEY=gsk_... clear-air`.

Without a key everything except AI personalisation, chat, photo analysis and letters still works. Models: `GROQ_MODEL` (default `openai/gpt-oss-120b`), `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`). Node 18+, no npm install.

## Layout

- `engine.js`: deterministic facts and impact estimates (AQI bands, indoor estimates, CO₂, best-hour window)
- `llm.js`: Groq client (completion, streaming, vision)
- `server.js`: API (`/api/plan`, `/api/chat`, `/api/vision`, `/api/letter`, `/api/geocode`), limits, cache
- `public/`: UI (`app.js` core, `features.js` extras, `sw.js` offline)

## Honest limits

Air data is model-based (CAMS via Open-Meteo), not a certified monitor. Impact numbers and the simulator are rough, editable estimates in `engine.js` and `features.js`. Not medical advice.

## Testing

`npm test` starts the server on port 3999 and checks: static assets and security headers, path traversal, real geocoding, live plan (air, weather, forecast, outlook freshness), manual readings, input validation and size limits, hostile input, Groq personalisation, translation, streaming chat, letters, photo analysis, and rate limiting. Groq's free tier is token-limited per minute, so the app falls back from the 120B to the 20B model when busy and the tests retry politely.
