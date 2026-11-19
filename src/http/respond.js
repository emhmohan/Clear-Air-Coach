'use strict';

const zlib = require('node:zlib');
const { SECURITY_HEADERS, wantsGzip } = require('./security');

/** Responses smaller than this are not worth compressing. */
const GZIP_MIN_BYTES = 1024;

/** An error that carries the HTTP status to answer with. */
class HttpError extends Error {
  /** @param {number} status @param {string} message safe to show to the client */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Send a JSON response, gzip-compressed when the client supports it.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const gzip = body.length > GZIP_MIN_BYTES && wantsGzip(res.req);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    ...(status === 413 ? { Connection: 'close' } : {}),
    ...SECURITY_HEADERS,
  });
  res.end(gzip ? zlib.gzipSync(body) : body);
}

/** Begin a Server-Sent Events response and return a writer for data events. */
function startEventStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS,
  });
  return {
    send: (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`),
    done: () => {
      res.write('data: [DONE]\n\n');
      res.end();
    },
  };
}

/** Turn any thrown value into a safe JSON error response. */
function sendError(res, error) {
  if (res.headersSent) return res.end();
  if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
  if (error instanceof SyntaxError) return sendJson(res, 400, { error: 'Invalid JSON body' });
  console.error('[error]', error.message);
  return sendJson(res, 500, { error: error.message });
}

module.exports = { HttpError, sendJson, startEventStream, sendError };
