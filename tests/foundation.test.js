// Import Node's test tools and the application units under test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

// Exercise real HTTP requests against a temporary server on an available local port.
test('HTTP health, routing, parser failures, and security headers', async () => {
  const server = createApp({ corsOrigin: 'http://localhost:3000' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    // Verify the health response and security headers before testing error paths.
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { data: { status: 'ok' } });
    assert.equal(health.headers.get('x-powered-by'), null);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    // Confirm unknown routes return 404 and malformed JSON returns a controlled 400.
    assert.equal((await fetch(`${base}/missing`)).status, 404);
    const invalid = await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
    // Confirm the JSON size limit rejects excessive input with status 413.
    const oversized = await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'a'.repeat(110000) }) });
    assert.equal(oversized.status, 413);
  // Always release the temporary port, even if an assertion fails.
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// Verify invalid settings identify variable names while keeping secret values out of errors.
test('configuration errors identify keys without exposing secrets', () => {
  assert.throws(() => parseEnv({ DATABASE_URL: 'private-value', JWT_SECRET: 'private-secret' }), error => {
    assert.match(error.message, /DATABASE_URL/);
    assert.match(error.message, /JWT_SECRET/);
    assert.doesNotMatch(error.message, /private-value|private-secret/);
    return true;
  });
});

// Verify password endpoints stop repeated attempts before expensive authentication work runs.
test('authentication endpoints enforce the shared attempt limit', async () => {
  const server = createApp({ corsOrigin: 'http://localhost:3000', db: {}, jwtSecret: 'x'.repeat(48) }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/v1/auth/login`;
    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(response.status, 400);
      await response.json();
    }
    const blocked = await fetch(url, { method: 'POST' });
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error.code, 'RATE_LIMITED');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
