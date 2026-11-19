'use strict';

const { HttpError } = require('./respond');

/**
 * Read and parse a JSON request body, refusing anything larger than `limitBytes`.
 * @param {import('node:http').IncomingMessage} req
 * @param {number} limitBytes
 * @returns {Promise<object>} parsed body ({} for an empty body)
 */
async function readJsonBody(req, limitBytes) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > limitBytes) throw new HttpError(413, 'Request too large');
  }
  return text ? JSON.parse(text) : {};
}

module.exports = { readJsonBody };
