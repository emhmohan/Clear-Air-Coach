const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * Call the JSON API. GET when no body is given, POST otherwise.
 * @param {string} path
 * @param {object} [body]
 * @returns {Promise<any>} parsed response; throws Error with the server's message on failure
 */
export async function api(path, body) {
  const response = await fetch(
    path,
    body ? { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) } : undefined,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/** POST JSON and return the raw Response (used for streaming replies). */
export const postRaw = (path, body) =>
  fetch(path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
