import { Router } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { authorize } from '../../middleware/authorize.js';
import { ApiError } from '../../utils/api-error.js';
import { createResumeService } from './resumes.service.js';
import { createResumeController } from './resumes.controller.js';

// Bound uploads before buffering and keep simultaneous memory usage under a process-wide cap.
export function resumeRoutes(db, authenticate, { uploadDir, maxResumeBytes }) {
  const router = Router();
  const controller = createResumeController(createResumeService(db, uploadDir));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxResumeBytes, files: 1, fields: 0, parts: 1, headerPairs: 100 } }).single('file');
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads; try again later' } } });
  let active = 0;

  async function boundedUpload(req, res, next) {
    if (active >= 4) throw new ApiError(503, 'UPLOAD_BUSY', 'Uploads are busy; try again shortly');
    active++;
    try {
      await new Promise((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
      await controller.upload(req, res);
    } finally {
      active--;
    }
  }

  router.post('/resumes', authenticate, authorize('CANDIDATE'), limiter, boundedUpload);
  router.get('/resumes/me', authenticate, authorize('CANDIDATE'), controller.list);
  router.get('/resumes/:resumeId/download', authenticate, controller.download);

  return router;
}
