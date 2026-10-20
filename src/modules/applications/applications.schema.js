import { z } from 'zod';
import { pageSchema } from '../jobs/jobs.schema.js';

// Reject client-controlled ownership/status fields and validate identifiers before querying.
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid resource ID');
export const applicationStatus = z.enum(['SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'HIRED', 'REJECTED']);
export const applySchema = z.object({ resumeId: objectId, coverLetter: z.string().trim().max(5000).optional() }).strict();
export const statusSchema = z.object({ status: applicationStatus, version: z.number().int().positive() }).strict();
export const applicationQuery = pageSchema.extend({ status: applicationStatus.optional() });
