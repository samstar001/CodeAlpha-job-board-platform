import { ApiError } from '../utils/api-error.js';

// Require a database-confirmed role before allowing role-specific operations.
export const authorize = role => (req, res, next) => {
  if (req.user.role !== role) throw new ApiError(403, 'FORBIDDEN', 'Your role cannot access this resource');
  next();
};
