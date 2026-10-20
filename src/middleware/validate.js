import { ApiError } from '../utils/api-error.js';

// Validate and replace request bodies so services receive normalized, supported fields only.
export const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })));
  req.body = result.data;
  next();
};
