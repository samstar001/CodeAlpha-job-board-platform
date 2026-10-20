import { z } from 'zod';

// Share trimmed text rules while allowing optional profile details to be cleared with null.
const text = max => z.string().trim().min(1).max(max);
const patch = fields => z.object(fields).strict().refine(value => Object.keys(value).length > 0, 'Provide at least one profile field');
export const candidatePatch = patch({ fullName: text(120).optional(), headline: text(200).nullable().optional(), location: text(160).nullable().optional(), bio: text(5000).nullable().optional() });
export const employerPatch = patch({ companyName: text(120).optional(), description: text(5000).nullable().optional(), location: text(160).nullable().optional(), website: z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an HTTP or HTTPS URL').nullable().optional() });
