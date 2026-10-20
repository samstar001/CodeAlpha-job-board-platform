import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../utils/api-error.js';

// Explicitly select public identity fields so password hashes cannot leak in responses.
export const safeUserSelect = { id: true, email: true, role: true, createdAt: true };

// Construct authentication operations using the application's database and signing secret.
export function createAuthService(db, secret) {
  // Sign only an identity reference; authorization always reads the current database role.
  const session = user => ({ token: jwt.sign({}, secret, { subject: user.id, algorithm: 'HS256', expiresIn: '1h', issuer: 'job-board-api', audience: 'job-board-client' }), expiresIn: 3600, user });
  // Spend equivalent password-check work for unknown accounts to reduce timing differences.
  const dummyHash = bcrypt.hash('unused-login-placeholder', 12);
  return {
    // A nested create atomically saves the user and the single matching profile.
    async register(input) {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const profile = input.role === 'CANDIDATE'
        ? { candidateProfile: { create: { fullName: input.fullName } } }
        : { employerProfile: { create: { companyName: input.companyName } } };
      try {
        const user = await db.user.create({ data: { email: input.email, passwordHash, role: input.role, ...profile }, select: safeUserSelect });
        return session(user);
      } catch (error) {
        if (error.code === 'P2002') throw new ApiError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
        throw error;
      }
    },
    // Use the same public error for unknown emails and incorrect passwords.
    async login(input) {
      const user = await db.user.findUnique({ where: { email: input.email } });
      const matches = await bcrypt.compare(input.password, user?.passwordHash ?? await dummyHash);
      if (!user || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      const { id, email, role, createdAt } = user;
      return session({ id, email, role, createdAt });
    },
  };
}
