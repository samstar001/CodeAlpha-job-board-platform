// Import configuration validation, the shared database client, and the app factory.
import { parseEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';

// Track the HTTP server and prevent repeated shutdown attempts.
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
  // Build the configured application and listen on the chosen port.
  const app = createApp({ corsOrigin: env.CORS_ORIGIN });
  server = app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT}`));
  // Handle listening failures such as a port already being used by another process.
  server.on('error', () => {
    console.error('HTTP server failed to start. Check the configured port.');
    void shutdown(1);
  });
  // Release resources when the terminal or hosting platform asks the process to stop.
  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));
// Report startup failures without printing database credentials or connection strings.
} catch (error) {
  console.error(error.message.startsWith('Invalid environment variables:')
    ? error.message
    : 'Startup failed. Check database connectivity and configuration.');
  await shutdown(1);
}
