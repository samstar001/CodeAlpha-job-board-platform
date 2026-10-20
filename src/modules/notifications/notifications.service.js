import { ApiError } from '../../utils/api-error.js';

const select = { id: true, type: true, applicationId: true, readAt: true, createdAt: true, application: { select: { job: { select: { id: true, title: true } }, candidate: { select: { id: true, fullName: true } } } } };

export function createNotificationService(db) {
  async function employerFor(user) {
    const profile = await db.employerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Employer profile not found');
    return profile.id;
  }

  return {
    // Match both null and absent readAt fields because MongoDB distinguishes those states.
    async list(user, { page, limit, unread }) {
      const where = { employerId: await employerFor(user) };
      if (unread === 'true') where.OR = [{ readAt: null }, { readAt: { isSet: false } }];
      if (unread === 'false') where.readAt = { not: null, isSet: true };
      const [data, total] = await Promise.all([
        db.notification.findMany({ where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
        db.notification.count({ where }),
      ]);
      return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    // Set the first read time conditionally so repeated reads preserve the original timestamp.
    async read(user, id) {
      const employerId = await employerFor(user);
      await db.notification.updateMany({ where: { id, employerId, OR: [{ readAt: null }, { readAt: { isSet: false } }] }, data: { readAt: new Date() } });
      const notification = await db.notification.findFirst({ where: { id, employerId }, select });
      if (!notification) throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
      return notification;
    },
  };
}
