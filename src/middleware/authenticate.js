import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.js';
import { safeUserSelect } from '../modules/auth/auth.service.js';

// Verify token integrity and expiry, then resolve a current user without loading credentials.
export const authenticate = (db, secret) => async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
  if (!match) throw new ApiError(401, 'UNAUTHENTICATED', 'A valid bearer token is required');
  let payload;
  try {
    payload = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer: 'job-board-api', audience: 'job-board-client' });
    if (typeof payload.sub !== 'string' || !/^[a-f0-9]{24}$/i.test(payload.sub) || typeof payload.exp !== 'number') throw new Error('Invalid claims');
  } catch {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Token is invalid or expired');
  }
  // Keep database failures separate from invalid-token errors so outages return a server error.
  req.user = await db.user.findUnique({ where: { id: payload.sub }, select: safeUserSelect });
  if (!req.user) throw new ApiError(401, 'UNAUTHENTICATED', 'Token is invalid or expired');
  next();
};
