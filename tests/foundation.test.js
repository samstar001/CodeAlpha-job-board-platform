import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('HTTP health, routing, parser failures, and security headers', async () => {
  const server = createApp({ corsOrigin: 'http://localhost:3000' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { data: { status: 'ok' } });
    assert.equal(health.headers.get('x-powered-by'), null);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await fetch(`${base}/missing`)).status, 404);
    const invalid = await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
    const oversized = await fetch(`${base}/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'a'.repeat(110000) }) });
    assert.equal(oversized.status, 413);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('configuration errors identify keys without exposing secrets', () => {
  assert.throws(() => parseEnv({ DATABASE_URL: 'private-value', JWT_SECRET: 'private-secret' }), error => {
    assert.match(error.message, /DATABASE_URL/);
    assert.match(error.message, /JWT_SECRET/);
    assert.doesNotMatch(error.message, /private-value|private-secret/);
    return true;
  });
});
