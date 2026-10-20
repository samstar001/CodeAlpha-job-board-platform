import 'dotenv/config';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

// Start an owned child process on an available port and verify real database-backed startup.
const reservation = createServer().listen(0, '127.0.0.1');
await new Promise(resolve => reservation.once('listening', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const child = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Startup timed out')), 30000);
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Server exited before startup')); });
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes(`Health check: http://localhost:${port}`)) {
        clearTimeout(timer);
        assert.ok(output.includes('MongoDB connected successfully'));
        resolve();
      }
    });
  });
  const response = await fetch(`http://localhost:${port}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { status: 'ok' } });
  console.log('Real server startup, MongoDB connection message, port, and health response passed');
} finally {
  child.kill();
}
