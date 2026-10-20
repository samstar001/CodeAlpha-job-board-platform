import { ApiError } from '../utils/api-error.js';

// Express recognizes error middleware by its four parameters, including next.
export function errorHandler(error, req, res, next) {
  // Delegate errors when the response has already started to avoid sending headers twice.
  if (res.headersSent) return next(error);
  // Return only intentionally public details from expected business-rule failures.
  if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
  // Translate malformed JSON into a client-readable validation response.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } });
  }
  // Explain rejected oversized request bodies without exposing internal parser errors.
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }
  // Hide internal implementation details for unexpected failures.
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
