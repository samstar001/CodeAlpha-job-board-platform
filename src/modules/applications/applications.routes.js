import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { applySchema, statusSchema } from './applications.schema.js';
import { createApplicationService } from './applications.service.js';
import { createApplicationController } from './applications.controller.js';

// Apply role checks before accepting submissions, applicant reads, or employer status changes.
export function applicationRoutes(db, authenticate) {
  const router = Router();
  const controller = createApplicationController(createApplicationService(db));

  router.post('/jobs/:jobId/applications', authenticate, authorize('CANDIDATE'), validate(applySchema), controller.apply);
  router.get('/applications/me', authenticate, authorize('CANDIDATE'), controller.mine);
  router.get('/jobs/:jobId/applications', authenticate, authorize('EMPLOYER'), controller.applicants);
  router.get('/applications/:applicationId', authenticate, controller.detail);
  router.patch('/applications/:applicationId/status', authenticate, authorize('EMPLOYER'), validate(statusSchema), controller.status);

  return router;
}
