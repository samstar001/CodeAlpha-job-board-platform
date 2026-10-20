// Import the HTTP framework, security middleware, and shared error handler.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/authenticate.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { profileRoutes } from './modules/profiles/profiles.routes.js';
import { createProfileService } from './modules/profiles/profiles.service.js';
import { createProfileController } from './modules/profiles/profiles.controller.js';

// Build the app separately from the listening server so tests can run it independently.
export function createApp({ corsOrigin, db, jwtSecret }) {
  const app = express();
  // Hide framework identification and apply security headers and the allowed browser origin.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigin }));
  // Parse JSON request bodies while rejecting payloads larger than 100 KiB.
  app.use(express.json({ limit: '100kb' }));
  // Liveness only. Startup separately verifies the database connection.
  app.get('/api/v1/health', (req, res) => res.json({ data: { status: 'ok' } }));
  // Mount feature routes when database and signing configuration are supplied by startup.
  if (db && jwtSecret) {
    const guard = authenticate(db, jwtSecret);
    const profiles = createProfileController(createProfileService(db));
    app.use('/api/v1/auth', authRoutes({ db, secret: jwtSecret, authenticate: guard, profiles }));
    app.use('/api/v1', profileRoutes(guard, profiles));
  }
  // Return a consistent JSON response for requests that matched no route.
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  // Register error handling last so errors from earlier middleware reach it.
  app.use(errorHandler);
  // Return the configured app without opening a network port.
  return app;
}
