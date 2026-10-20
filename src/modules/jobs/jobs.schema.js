import { z } from 'zod';

// Reuse strict field rules for new listings and partial edits.
const text = max => z.string().trim().min(1).max(max);
const fields = {
  title: text(160),
  description: z.string().trim().min(20).max(20000),
  location: text(160),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']),
};
export const createJobSchema = z.object(fields).strict();
export const patchJobSchema = z.object({ ...fields, status: z.enum(['OPEN', 'CLOSED']) }).partial().strict().refine(value => Object.keys(value).length > 0, 'Provide at least one job field');

// Bound pagination and filter input before constructing database queries.
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export const searchSchema = pageSchema.extend({
  q: z.string().trim().max(200).optional(),
  location: z.string().trim().max(160).optional(),
  employmentType: fields.employmentType.optional(),
  workMode: fields.workMode.optional(),
});
export const idSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid job ID');
