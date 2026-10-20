import { ApiError } from '../../utils/api-error.js';

// Resolve profiles only through the authenticated user ID, never an ID supplied in a body.
export function createProfileService(db) {
  const model = role => role === 'CANDIDATE' ? db.candidateProfile : db.employerProfile;
  return {
    async read(user) {
      const profile = await model(user.role).findUnique({ where: { userId: user.id } });
      if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
      return { ...user, profile };
    },
    // Update only schema-validated fields on the caller's own profile.
    async update(user, data) {
      try {
        return await model(user.role).update({ where: { userId: user.id }, data });
      } catch (error) {
        if (error.code === 'P2025') throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
        throw error;
      }
    },
  };
}
