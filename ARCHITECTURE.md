# Architecture

Clear Air Coach is a dependency-free Node server plus a dependency-free browser app (native ES modules).
There is no build step and `npm install` is not needed.

```
server.js                 entry point: HTTP server, timeouts, graceful shutdown
src/
  config.js               env loading (.env), languages, limits, timeouts
  http/                   security headers + CSP, JSON/SSE responses, body parsing, static files (gzip + ETag)
  routes/                 API handlers: plan, chat, vision, letter, status, geocode; route table + rate limiting
  engine/                 deterministic rules: air bands, cleanest window, indoor estimates, actions, activities
    actions/              one small function per advice rule (routine, indoor, sustainable)
  ai/                     prompts (grounded, injection-aware) and Groq-backed coaching
  services/               Open-Meteo client and Groq client (streaming, vision, rate-limit fallback)
  lib/                    TtlCache (bounded) and RateLimiter
  validation.js           input whitelisting and bounds
public/
  index.html              semantic, accessible shell (no inline scripts or styles)
  styles.css              theme, layout, components
  sw.js                   offline service worker
  js/
    main.js               entry: wires modules, then loads the plan
    state.js, actions.js  shared state and plan data
    loader.js             fetch plan, offline fallback
    onboarding.js         setup dialog (focus trap, Escape, keyboard)
    views/                one module per page (today, plan, indoor, impact, community, chat, ...)
    features/             language, scenarios (simulation), voice, alerts
    lib/                  pure helpers: format/escape, dose model, tracker, levels, storage, api, dom, bus
test/                     unit, accessibility and live end-to-end tests
```

## Data flow

1. The browser sends location + household profile to `POST /api/plan`.
2. The server fetches live air quality and weather (cached 10 min), then **the engine computes every number**.
3. Groq personalises and explains those facts; translation and the larger/smaller model split keep within free-tier limits.
4. The browser renders the facts and AI text. Air-quality colours come from the engine's bands, so they are defined once.

## Design decisions

- **The AI never invents numbers.** Prompts contain only engine facts and say so. The plan still works without a key.
- **Strict CSP, no `unsafe-inline`.** Dynamic colours and widths are applied through the CSSOM from `data-*` attributes.
- **Pure logic is separated from the DOM** (`lib/doseModel.js`, `lib/tracker.js`, `lib/format.js`) so it is unit-tested directly in Node.
- **Small modules, small functions.** ESLint enforces complexity and function-length limits; Prettier enforces style.
- **Graceful degradation:** no AI key, a busy model, offline, or missing weather each fall back instead of failing.
