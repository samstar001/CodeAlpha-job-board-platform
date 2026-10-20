import { ApiError } from '../../utils/api-error.js';
import { idSchema, pageSchema, searchSchema } from './jobs.schema.js';

// Validate route/query inputs without assigning to Express 5's read-only req.query property.
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })));
  return result.data;
}

// Translate service results into the API's single-item or paginated response format.
export const createJobController = service => ({
  search: async (req, res) => res.json(await service.search(parse(searchSchema, req.query))),
  detail: async (req, res) => res.json({ data: await service.detail(parse(idSchema, req.params.jobId)) }),
  create: async (req, res) => res.status(201).json({ data: await service.create(req.user, req.body) }),
  own: async (req, res) => res.json(await service.own(req.user, parse(pageSchema, req.query))),
  update: async (req, res) => res.json({ data: await service.update(req.user, parse(idSchema, req.params.jobId), req.body) }),
});
