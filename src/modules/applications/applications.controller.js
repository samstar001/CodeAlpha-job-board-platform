import { ApiError } from '../../utils/api-error.js';
import { applicationQuery, objectId } from './applications.schema.js';

// Parse route/query values without mutating Express's read-only query property.
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
  return result.data;
}

export const createApplicationController = service => ({
  apply: async (req, res) => res.status(201).json({ data: await service.apply(req.user, parse(objectId, req.params.jobId), req.body) }),
  mine: async (req, res) => res.json(await service.mine(req.user, parse(applicationQuery, req.query))),
  applicants: async (req, res) => res.json(await service.applicants(req.user, parse(objectId, req.params.jobId), parse(applicationQuery, req.query))),
  detail: async (req, res) => res.json({ data: await service.detail(req.user, parse(objectId, req.params.applicationId)) }),
  status: async (req, res) => res.json({ data: await service.updateStatus(req.user, parse(objectId, req.params.applicationId), req.body) }),
});
