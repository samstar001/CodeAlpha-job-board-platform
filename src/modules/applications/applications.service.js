import { ApiError } from '../../utils/api-error.js';

const select = {
  id: true, jobId: true, candidateId: true, resumeId: true, coverLetter: true,
  status: true, version: true, createdAt: true, updatedAt: true,
  job: { select: { id: true, title: true, status: true, employer: { select: { id: true, companyName: true } } } },
  candidate: { select: { id: true, fullName: true, headline: true, location: true } },
  resume: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } },
};
const present = application => ({ ...application, resume: { ...application.resume, downloadUrl: `/api/v1/resumes/${application.resumeId}/download` } });
const transitions = { SUBMITTED: ['REVIEWING', 'REJECTED'], REVIEWING: ['SHORTLISTED', 'REJECTED'], SHORTLISTED: ['HIRED', 'REJECTED'], HIRED: [], REJECTED: [] };

// Retry only transaction write conflicts, keeping every attempt's writes inside a new transaction.
export async function transactionWithRetry(db, work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work); } catch (error) {
      if (error.code !== 'P2034') throw error;
      if (attempt === 2) throw new ApiError(409, 'CONCURRENT_CHANGE', 'A concurrent change occurred; retry the request');
    }
  }
}

export function createApplicationService(db) {
  async function profile(user) {
    const model = user.role === 'CANDIDATE' ? db.candidateProfile : db.employerProfile;
    const result = await model.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!result) throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
    return result.id;
  }

  async function visible(user, id) {
    const ownerId = await profile(user);
    const ownership = user.role === 'CANDIDATE' ? { candidateId: ownerId } : { job: { employerId: ownerId } };
    const application = await db.application.findFirst({ where: { id, ...ownership }, select });
    if (!application) throw new ApiError(404, 'NOT_FOUND', 'Application not found');
    return application;
  }

  async function list(where, { page, limit }) {
    const [items, total] = await Promise.all([
      db.application.findMany({ where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.application.count({ where }),
    ]);
    return { data: items.map(present), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  return {
    // A shared job write coordinates submission with closing; all three writes commit together.
    async apply(user, jobId, input) {
      const candidateId = await profile(user);
      try {
        return await transactionWithRetry(db, async tx => {
          const job = await tx.job.findUnique({ where: { id: jobId }, select: { id: true, employerId: true } });
          if (!job) throw new ApiError(404, 'NOT_FOUND', 'Job not found');
          const open = await tx.job.updateMany({ where: { id: jobId, status: 'OPEN' }, data: { applicationSequence: { increment: 1 } } });
          if (!open.count) throw new ApiError(409, 'JOB_CLOSED', 'This job is closed');
          const resume = await tx.resume.findFirst({ where: { id: input.resumeId, candidateId }, select: { id: true } });
          if (!resume) throw new ApiError(404, 'NOT_FOUND', 'Resume not found');
          const application = await tx.application.create({ data: { jobId, candidateId, ...input }, select });
          await tx.notification.create({ data: { employerId: job.employerId, applicationId: application.id, type: 'NEW_APPLICATION' } });
          return present(application);
        });
      } catch (error) {
        if (error.code === 'P2002') throw new ApiError(409, 'ALREADY_APPLIED', 'You have already applied to this job');
        throw error;
      }
    },

    async mine(user, query) {
      return list({ candidateId: await profile(user), ...(query.status ? { status: query.status } : {}) }, query);
    },

    async applicants(user, jobId, query) {
      const employerId = await profile(user);
      if (!await db.job.findFirst({ where: { id: jobId, employerId }, select: { id: true } })) throw new ApiError(404, 'NOT_FOUND', 'Job not found');
      return list({ jobId, ...(query.status ? { status: query.status } : {}) }, query);
    },

    async detail(user, id) { return present(await visible(user, id)); },

    // Match the expected version in the write so simultaneous reviews cannot overwrite each other.
    async updateStatus(user, id, input) {
      const current = await visible(user, id);
      if (current.version !== input.version) throw new ApiError(409, 'STALE_VERSION', 'Application has changed; reload before updating');
      if (current.status === input.status) return present(current);
      if (!transitions[current.status].includes(input.status)) throw new ApiError(409, 'INVALID_TRANSITION', 'This status transition is not allowed');
      const changed = await db.application.updateMany({ where: { id, version: input.version, status: current.status }, data: { status: input.status, version: { increment: 1 } } });
      if (!changed.count) throw new ApiError(409, 'STALE_VERSION', 'Application has changed; reload before updating');
      return present(await visible(user, id));
    },
  };
}
