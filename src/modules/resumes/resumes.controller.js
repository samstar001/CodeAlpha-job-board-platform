import { z } from 'zod';
import { pageSchema } from '../jobs/jobs.schema.js';
import { ApiError } from '../../utils/api-error.js';

// Validate URL/query inputs before passing them to the resume service.
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
  return result.data;
}
const idSchema = z.string().regex(/^[a-f0-9]{24}$/i);

export const createResumeController = service => ({
  upload: async (req, res) => res.status(201).json({ data: await service.upload(req.user, req.file) }),
  list: async (req, res) => res.json(await service.list(req.user, parse(pageSchema, req.query))),

  // Stream an attachment only after authorization; never mount the upload directory publicly.
  download: async (req, res, next) => {
    const file = await service.download(req.user, parse(idSchema, req.params.resumeId));
    res.set('Cache-Control', 'private, no-store');
    res.type('application/pdf');
    res.download(file.filePath, file.originalName, error => {
      if (error) next(error.code === 'ENOENT' ? new ApiError(404, 'NOT_FOUND', 'Resume file not found') : error);
    });
  },
});
