import { ApiError } from '../../utils/api-error.js';

// Return public listing fields and company information without user credentials or internal counters.
const select = {
  id: true, employerId: true, title: true, description: true, location: true,
  employmentType: true, workMode: true, status: true, createdAt: true, updatedAt: true,
  employer: { select: { id: true, companyName: true, website: true, location: true } },
};
const present = ({ employer, ...job }) => ({ ...job, company: employer });

// Escape regular-expression syntax so search treats user input as literal text.
const literal = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createJobService(db) {
  async function employerFor(user) {
    const profile = await db.employerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'Employer profile not found');
    return profile.id;
  }

  // Use a stable secondary sort and count all matching records for pagination metadata.
  async function list(where, { page, limit }) {
    const [jobs, total] = await Promise.all([
      db.job.findMany({ where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.job.count({ where }),
    ]);
    return { data: jobs.map(present), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  return {
    // Only open jobs appear in public search; separate filters are combined with AND.
    search(query) {
      const where = { status: 'OPEN' };
      if (query.q) where.OR = ['title', 'description'].map(field => ({ [field]: { contains: literal(query.q), mode: 'insensitive' } }));
      if (query.location) where.location = { contains: literal(query.location), mode: 'insensitive' };
      if (query.employmentType) where.employmentType = query.employmentType;
      if (query.workMode) where.workMode = query.workMode;
      return list(where, query);
    },

    async detail(id) {
      const job = await db.job.findUnique({ where: { id }, select });
      if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job not found');
      return present(job);
    },

    async create(user, data) {
      const employerId = await employerFor(user);
      return present(await db.job.create({ data: { ...data, employerId }, select }));
    },

    async own(user, query) {
      return list({ employerId: await employerFor(user) }, query);
    },

    // Include ownership in the atomic update instead of trusting a client-supplied employer ID.
    async update(user, id, data) {
      const employerId = await employerFor(user);
      try {
        return present(await db.job.update({ where: { id, employerId }, data, select }));
      } catch (error) {
        if (error.code === 'P2025') throw new ApiError(404, 'NOT_FOUND', 'Job not found');
        throw error;
      }
    },
  };
}
