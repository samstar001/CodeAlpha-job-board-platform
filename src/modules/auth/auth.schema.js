import { z } from 'zod';

// Normalize email but preserve passwords exactly, enforcing bcrypt's byte limit.
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().refine(value => Buffer.byteLength(value, 'utf8') >= 8 && Buffer.byteLength(value, 'utf8') <= 72, 'Password must be 8–72 UTF-8 bytes');
const name = z.string().trim().min(1).max(120);

// Require the appropriate profile name and reject unexpected fields for each role.
export const registerSchema = z.discriminatedUnion('role', [
  z.object({ email, password, role: z.literal('CANDIDATE'), fullName: name }).strict(),
  z.object({ email, password, role: z.literal('EMPLOYER'), companyName: name }).strict(),
]);
export const loginSchema = z.object({ email, password }).strict();
