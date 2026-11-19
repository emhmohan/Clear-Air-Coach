'use strict';

/**
 * Clear Air Coach: dependency-free Node server (Node 18+).
 *
 *   src/routes     JSON API (plan, chat, vision, letter, status, geocode)
 *   src/engine     deterministic facts and impact estimates
 *   src/ai         prompts and Groq-backed coaching
 *   src/services   Open-Meteo and Groq clients
 *   src/http       security headers, responses, static files
 *   public/        the browser app (ES modules)
 */

const http = require('node:http');
const { PORT } = require('./src/config');
const { handleApi, limiter } = require('./src/routes');
const { serveStatic } = require('./src/http/static');
const llm = require('./src/services/llm');

const SHUTDOWN_GRACE_MS = 5_000;

/** Build the HTTP server without starting it (handy for tests). */
function createServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
    return serveStatic(req, res, url.pathname);
  });
  // Bound how long a slow client can hold a connection open.
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

/** Start listening, prune rate-limit state, and shut down cleanly on SIGTERM/SIGINT. */
function start() {
  const server = createServer();
  const pruneTimer = setInterval(() => limiter.prune(), 60_000);
  pruneTimer.unref();

  server.listen(PORT, () => {
    const ai = llm.info();
    console.log(
      `Clear Air Coach on http://localhost:${PORT} (AI: ${ai.provider ? `${ai.provider} / ${ai.model}` : 'off, set GROQ_API_KEY'})`,
    );
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) start();

module.exports = { createServer, start };
