// Express recognizes error middleware by its four parameters, including next.
export function errorHandler(error, req, res, next) {
  // Delegate errors when the response has already started to avoid sending headers twice.
  if (res.headersSent) return next(error);
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
