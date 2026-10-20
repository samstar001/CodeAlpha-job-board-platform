import { Router } from 'express';
import { z } from 'zod';
import { pageSchema } from '../jobs/jobs.schema.js';
import { objectId } from '../applications/applications.schema.js';
import { authorize } from '../../middleware/authorize.js';
import { ApiError } from '../../utils/api-error.js';
import { createNotificationService } from './notifications.service.js';

const querySchema = pageSchema.extend({ unread: z.enum(['true', 'false']).optional() });
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
  return result.data;
}

// Restrict inbox reads and updates to the authenticated employer's own notifications.
export function notificationRoutes(db, authenticate) {
  const router = Router();
  const service = createNotificationService(db);
  router.get('/notifications/me', authenticate, authorize('EMPLOYER'), async (req, res) => res.json(await service.list(req.user, parse(querySchema, req.query))));
  router.patch('/notifications/:notificationId/read', authenticate, authorize('EMPLOYER'), async (req, res) => res.json({ data: await service.read(req.user, parse(objectId, req.params.notificationId)) }));
  return router;
}
