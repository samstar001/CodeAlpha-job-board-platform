import { parseEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';

let server;
let stopping = false;

// Stop accepting requests, close database connections, and cap shutdown at ten seconds.
async function shutdown(exitCode) {
  if (stopping) return;
  stopping = true;

  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();

  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();

  clearTimeout(deadline);
  process.exitCode = exitCode;
}

// Validate settings and confirm MongoDB responds before accepting HTTP requests.
try {
  const env = parseEnv(process.env);
  await prisma.$connect();
  await prisma.$runCommandRaw({ ping: 1 });
  console.log('MongoDB connected successfully');

  // Start HTTP only after the database is available.
  const app = createApp({ corsOrigin: env.CORS_ORIGIN, db: prisma, jwtSecret: env.JWT_SECRET });
  server = app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  // Release resources on HTTP failure or a process stop signal.
  server.on('error', () => {
    console.error('HTTP server failed to start. Check the configured port.');
    void shutdown(1);
  });

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));
} catch (error) {
  // Report startup failures without exposing connection strings or credentials.
  console.error(error.message.startsWith('Invalid environment variables:')
    ? error.message
    : 'Startup failed. Check database connectivity and configuration.');
  await shutdown(1);
}
