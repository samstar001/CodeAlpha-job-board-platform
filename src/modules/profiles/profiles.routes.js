import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { candidatePatch, employerPatch } from './profiles.schema.js';

// Protect both profile endpoints with authentication, role checks, and strict input validation.
export function profileRoutes(authenticate, controller) {
  const router = Router();
  router.patch('/candidates/me', authenticate, authorize('CANDIDATE'), validate(candidatePatch), controller.update);
  router.patch('/employers/me', authenticate, authorize('EMPLOYER'), validate(employerPatch), controller.update);
  return router;
}
