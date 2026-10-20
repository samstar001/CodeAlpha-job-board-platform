import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/authenticate.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { profileRoutes } from './modules/profiles/profiles.routes.js';
import { createProfileService } from './modules/profiles/profiles.service.js';
import { createProfileController } from './modules/profiles/profiles.controller.js';
import { jobRoutes } from './modules/jobs/jobs.routes.js';
import { resumeRoutes } from './modules/resumes/resumes.routes.js';
import { applicationRoutes } from './modules/applications/applications.routes.js';

// Configure the app independently of the server so it can be tested without startup.
export function createApp({ corsOrigin, db, jwtSecret, uploadDir = './storage/resumes', maxResumeBytes = 5242880 }) {
  const app = express();

  // Apply security headers, browser access rules, and request size limits.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  // Liveness only. Startup separately verifies the database connection.
  app.get('/api/v1/health', (req, res) => res.json({ data: { status: 'ok' } }));

  // Wire authentication and profile routes to their shared dependencies.
  if (db && jwtSecret) {
    const guard = authenticate(db, jwtSecret);
    const profiles = createProfileController(createProfileService(db));

    app.use('/api/v1/auth', authRoutes({ db, secret: jwtSecret, authenticate: guard, profiles }));
    app.use('/api/v1', profileRoutes(guard, profiles));
    app.use('/api/v1', jobRoutes(db, guard));
    app.use('/api/v1', resumeRoutes(db, guard, { uploadDir, maxResumeBytes }));
    app.use('/api/v1', applicationRoutes(db, guard));
  }

  // Keep fallback and error handlers after all routes.
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);

  return app;
}
