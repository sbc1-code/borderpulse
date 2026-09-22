export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function methodGuard(req, allowed) {
  if (!allowed.includes(req.method)) {
    throw new HttpError(405, 'Method not allowed');
  }
}

export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function getBearerToken(req) {
  const value = req.headers?.authorization || '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));

  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function requestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new HttpError(400, 'Invalid JSON body');
    }
  }
  throw new HttpError(400, 'JSON body required');
}

export function sendError(res, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  json(res, status, { error: status >= 500 ? 'Internal server error' : error.message });
}
