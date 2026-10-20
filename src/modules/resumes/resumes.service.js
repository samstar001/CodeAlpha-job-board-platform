import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/api-error.js';

const metadata = { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true };
const present = resume => ({ ...resume, downloadUrl: `/api/v1/resumes/${resume.id}/download` });

// Accept only generated filenames and resolve them strictly inside the private storage root.
export function resolveResumePath(directory, key) {
  if (!/^[a-f0-9-]{36}\.pdf$/.test(key)) throw new ApiError(404, 'NOT_FOUND', 'Resume file not found');
  const root = path.resolve(directory);
  const target = path.resolve(root, key);
  if (path.dirname(target) !== root) throw new ApiError(404, 'NOT_FOUND', 'Resume file not found');
  return target;
}

export function createResumeService(db, directory) {
  async function candidateFor(user) {
    const candidate = await db.candidateProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!candidate) throw new ApiError(404, 'NOT_FOUND', 'Candidate profile not found');
    return candidate.id;
  }

  return {
    // Validate buffered bytes before writing, then remove the new file if metadata saving fails.
    async upload(user, file) {
      if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'Upload a PDF using the file field');
      if (!/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new ApiError(415, 'UNSUPPORTED_FILE', 'Only PDF resumes are supported');
      }
      const candidateId = await candidateFor(user);
      const storageKey = `${randomUUID()}.pdf`;
      const target = resolveResumePath(directory, storageKey);
      const originalName = path.posix.basename(file.originalname.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'resume.pdf';

      await mkdir(path.resolve(directory), { recursive: true });
      await writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 });
      try {
        return present(await db.resume.create({ data: { candidateId, originalName, storageKey, mimeType: 'application/pdf', sizeBytes: file.size }, select: metadata }));
      } catch (error) {
        await unlink(target);
        throw error;
      }
    },

    async list(user, { page, limit }) {
      const candidateId = await candidateFor(user);
      const where = { candidateId };
      const [resumes, total] = await Promise.all([
        db.resume.findMany({ where, select: metadata, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
        db.resume.count({ where }),
      ]);
      return { data: resumes.map(present), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    },

    // Employers receive access only after application links are implemented in the next phase.
    async download(user, id) {
      const resume = await db.resume.findUnique({ where: { id }, include: { candidate: { select: { userId: true } } } });
      if (!resume || user.role !== 'CANDIDATE' || resume.candidate.userId !== user.id) throw new ApiError(404, 'NOT_FOUND', 'Resume not found');
      const filePath = resolveResumePath(directory, resume.storageKey);
      try { await access(filePath); } catch (error) {
        if (error.code === 'ENOENT') throw new ApiError(404, 'NOT_FOUND', 'Resume file not found');
        throw error;
      }
      return { filePath, originalName: resume.originalName };
    },
  };
}
