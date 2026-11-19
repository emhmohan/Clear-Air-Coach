# Security notes

**Secrets:** the Groq key is read from the `GROQ_API_KEY` environment variable or a local `.env` (gitignored). It is never sent to the browser. If a key is ever exposed, revoke it at https://console.groq.com/keys.

**Hardening in the server**
- Strict Content-Security-Policy (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`), `nosniff`, `no-referrer`, Permissions-Policy, COOP, and HSTS behind a proxy (`TRUST_PROXY=1`).
- Every client-supplied profile is **whitelisted and bounded** (`sanitizeProfile`) before reaching the engine or an LLM prompt. Free-text notes are length-limited and passed to the model as data, with a system rule to ignore embedded instructions.
- Coordinates are range-checked, numeric inputs are bounded, request bodies are size-limited (100 KB, 6 MB for photos), and uploads must be JPEG, PNG or WebP data URLs.
- Per-IP rate limiting on POST routes, a bounded in-memory cache, upstream timeouts, path-traversal protection for static files, and only `GET`/`HEAD` allowed for pages.
- The UI escapes all dynamic text before rendering; AI markdown goes through an escape-first renderer. The server stores nothing: profiles and the tracker live in the browser.

**Reporting:** open a GitHub issue or contact the maintainers privately for sensitive reports.
