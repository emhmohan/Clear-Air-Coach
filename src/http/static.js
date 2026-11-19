'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { SECURITY_HEADERS, wantsGzip } = require('./security');
const { PUBLIC_DIR } = require('../config');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};
const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;
const GZIP_MIN_BYTES = 512;
/** Always revalidate (cheap 304s via ETag) so a deploy is never masked by stale cached files. */
const CACHE_CONTROL = 'no-cache';

/** Per-file cache of raw and gzipped bytes, rebuilt whenever the file changes on disk. */
const fileCache = new Map();

function loadFile(file, stat) {
  const cached = fileCache.get(file);
  if (cached && cached.mtime === stat.mtimeMs) return cached;
  const raw = fs.readFileSync(file);
  const type = MIME[path.extname(file)] || 'application/octet-stream';
  const entry = {
    mtime: stat.mtimeMs,
    raw,
    type,
    etag: `"${stat.size.toString(16)}-${Math.round(stat.mtimeMs).toString(16)}"`,
    gzip: COMPRESSIBLE.test(type) && raw.length > GZIP_MIN_BYTES ? zlib.gzipSync(raw) : null,
  };
  fileCache.set(file, entry);
  return entry;
}

/**
 * Resolve a URL path to a file inside PUBLIC_DIR.
 * @returns {{file: string, name: string} | null} null when the path would escape the directory
 */
function resolvePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath); // throws URIError on malformed input
  const name = urlPath === '/' ? 'index.html' : path.normalize(decoded).replace(/^[\\/]+/, '');
  const file = path.join(PUBLIC_DIR, name);
  return file.startsWith(PUBLIC_DIR + path.sep) ? { file, name } : null;
}

/**
 * Serve a static file with ETag revalidation and gzip.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {string} urlPath
 */
function serveStatic(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    reply(res, 405, { Allow: 'GET, HEAD' });
    return;
  }
  let target;
  try {
    target = resolvePublicPath(urlPath);
  } catch {
    reply(res, 400);
    return;
  }
  if (!target) {
    reply(res, 403);
    return;
  }
  fs.stat(target.file, (error, stat) => {
    if (error || !stat.isFile()) reply(res, 404, {}, 'Not found');
    else sendFile(req, res, target, loadFile(target.file, stat));
  });
}

/** Write a bodiless (or short text) response with the standard security headers. */
function reply(res, status, headers = {}, body) {
  res.writeHead(status, { ...headers, ...SECURITY_HEADERS });
  res.end(body);
}

/** Send a cached file: 304 when the ETag matches, otherwise gzip or raw bytes. */
function sendFile(req, res, target, entry) {
  const isServiceWorker = target.name === 'sw.js';
  const headers = {
    'Content-Type': entry.type,
    ETag: entry.etag,
    'Cache-Control': isServiceWorker ? 'no-cache' : CACHE_CONTROL,
    Vary: 'Accept-Encoding',
    ...(isServiceWorker ? { 'Service-Worker-Allowed': '/' } : {}),
  };
  if (req.headers['if-none-match'] === entry.etag) {
    reply(res, 304, headers);
    return;
  }
  const gzip = entry.gzip && wantsGzip(req);
  const body = req.method === 'HEAD' ? undefined : gzip ? entry.gzip : entry.raw;
  reply(res, 200, { ...headers, ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) }, body);
}

module.exports = { serveStatic, resolvePublicPath };
