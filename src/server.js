import { parseEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';

let server;
let stopping = false;

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

try {
  const env = parseEnv(process.env);
  await prisma.$connect();
  await prisma.$runCommandRaw({ ping: 1 });
  const app = createApp({ corsOrigin: env.CORS_ORIGIN });
  server = app.listen(env.PORT, () => console.log(`API listening on port ${env.PORT}`));
  server.on('error', () => {
    console.error('HTTP server failed to start. Check the configured port.');
    void shutdown(1);
  });
  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));
} catch (error) {
  console.error(error.message.startsWith('Invalid environment variables:')
    ? error.message
    : 'Startup failed. Check database connectivity and configuration.');
  await shutdown(1);
}
