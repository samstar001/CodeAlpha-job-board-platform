import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { createAuthService } from './auth.service.js';
import { createAuthController } from './auth.controller.js';

// Rate-limit password operations while keeping authenticated identity reads separate.
export function authRoutes({ db, secret, authenticate, profiles }) {
  const router = Router();
  const controller = createAuthController(createAuthService(db, secret));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts; try again later' } } });
  router.post('/register', limiter, validate(registerSchema), controller.register);
  router.post('/login', limiter, validate(loginSchema), controller.login);
  router.get('/me', authenticate, profiles.me);
  return router;
}
