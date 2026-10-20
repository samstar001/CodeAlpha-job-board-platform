import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createJobSchema, patchJobSchema } from './jobs.schema.js';
import { createJobController } from './jobs.controller.js';
import { createJobService } from './jobs.service.js';

// Keep public discovery routes separate from employer-only publishing and management.
export function jobRoutes(db, authenticate) {
  const router = Router();
  const controller = createJobController(createJobService(db));
  const employer = authorize('EMPLOYER');

  router.get('/jobs', controller.search);
  router.get('/jobs/:jobId', controller.detail);
  router.post('/jobs', authenticate, employer, validate(createJobSchema), controller.create);
  router.patch('/jobs/:jobId', authenticate, employer, validate(patchJobSchema), controller.update);
  router.get('/employers/me/jobs', authenticate, employer, controller.own);

  return router;
}
