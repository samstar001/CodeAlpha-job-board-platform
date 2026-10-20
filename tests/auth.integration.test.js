// Run database tests explicitly so ordinary npm test never touches MongoDB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

test('authentication, profiles, and job publishing/search permissions', { skip: process.env.RUN_DB_TESTS !== '1', timeout: 120000 }, async () => {
  // Refuse any database except the explicitly named test database, distinct from development.
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url, 'Set TEST_DATABASE_URL');
  const name = value => new URL(value).pathname.replace(/^\//, '');
  assert.equal(name(url), 'job_board_test');
  assert.notEqual(name(process.env.DATABASE_URL), name(url));
  // Synchronize test indexes with the pinned Prisma CLI without exposing its output or URL.
  const setup = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], { env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 60000 });
  assert.equal(setup.status, 0, 'Test database schema synchronization failed');
  const db = new PrismaClient({ datasourceUrl: url });
  const secret = randomUUID() + randomUUID();
  const server = createApp({ corsOrigin: 'http://localhost:3000', db, jwtSecret: secret }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const prefix = randomUUID();
  const emails = [`${prefix}-candidate@example.com`, `${prefix}-employer@example.com`, `${prefix}-other@example.com`];
  const password = 'LearningPassword123!';
  // Keep requests readable while collecting HTTP status and parsed JSON together.
  async function request(path, { method = 'GET', body, token } = {}) {
    const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    // Register both roles, verify normalization and hashed storage, and reject duplicate identities.
    const candidate = await request('/auth/register', { method: 'POST', body: { email: emails[0].toUpperCase(), password, role: 'CANDIDATE', fullName: ' Test Candidate ' } });
    assert.equal(candidate.status, 201);
    assert.equal(candidate.body.data.user.email, emails[0]);
    assert.equal(candidate.body.data.expiresIn, 3600);
    assert.equal(JSON.stringify(candidate.body).includes('passwordHash'), false);
    const stored = await db.user.findUnique({ where: { email: emails[0] }, include: { candidateProfile: true, employerProfile: true } });
    assert.ok(await bcrypt.compare(password, stored.passwordHash));
    assert.notEqual(stored.passwordHash, password);
    assert.equal(stored.candidateProfile.fullName, 'Test Candidate');
    assert.equal(stored.employerProfile, null);
    assert.equal((await request('/auth/register', { method: 'POST', body: { email: emails[0], password, role: 'CANDIDATE', fullName: 'Duplicate' } })).status, 409);
    const employer = await request('/auth/register', { method: 'POST', body: { email: emails[1], password, role: 'EMPLOYER', companyName: 'Demo Ltd' } });
    assert.equal(employer.status, 201);
    const other = await request('/auth/register', { method: 'POST', body: { email: emails[2], password, role: 'CANDIDATE', fullName: 'Other Candidate' } });
    assert.equal(other.status, 201);
    // Reject malformed registration without writing another user or profile.
    assert.equal((await request('/auth/register', { method: 'POST', body: { email: 'invalid', password: 'short', role: 'ADMIN' } })).status, 400);
    assert.equal((await request('/auth/register', { method: 'POST', body: { email: `${prefix}-invalid@example.com`, password: 'é'.repeat(37), role: 'CANDIDATE', fullName: 'Invalid' } })).status, 400);
    // Exercise valid login, uniform credential errors, and missing or untrusted bearer tokens.
    const login = await request('/auth/login', { method: 'POST', body: { email: emails[0], password } });
    assert.equal(login.status, 200);
    const wrong = await request('/auth/login', { method: 'POST', body: { email: emails[0], password: 'IncorrectPassword!' } });
    const unknown = await request('/auth/login', { method: 'POST', body: { email: `${prefix}-missing@example.com`, password } });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal((await request('/auth/me')).status, 401);
    assert.equal((await request('/auth/me', { token: 'invalid' })).status, 401);
    const expired = jwt.sign({}, secret, { subject: stored.id, expiresIn: -1, issuer: 'job-board-api', audience: 'job-board-client' });
    assert.equal((await request('/auth/me', { token: expired })).status, 401);
    const forged = jwt.sign({}, 'untrusted-secret', { subject: stored.id, expiresIn: '1h', issuer: 'job-board-api', audience: 'job-board-client' });
    assert.equal((await request('/auth/me', { token: forged })).status, 401);
    // Permit only own-role fields and prove editing one candidate leaves another unchanged.
    const token = login.body.data.token;
    const me = await request('/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.profile.fullName, 'Test Candidate');
    assert.equal(JSON.stringify(me.body).includes('passwordHash'), false);
    assert.equal((await request('/candidates/me', { method: 'PATCH', token, body: { headline: 'Backend Developer', bio: null } })).status, 200);
    assert.equal((await request('/employers/me', { method: 'PATCH', token, body: { companyName: 'Hijacked' } })).status, 403);
    assert.equal((await request('/candidates/me', { method: 'PATCH', token, body: { userId: other.body.data.user.id } })).status, 400);
    assert.equal((await request('/candidates/me', { method: 'PATCH', token, body: {} })).status, 400);
    assert.equal((await request('/auth/me', { token: other.body.data.token })).body.data.profile.headline, null);
    const employerToken = employer.body.data.token;
    assert.equal((await request('/employers/me', { method: 'PATCH', token: employerToken, body: { website: 'https://example.com' } })).status, 200);
    assert.equal((await request('/employers/me', { method: 'PATCH', token: employerToken, body: { website: 'ftp://example.com' } })).status, 400);

    // Verify publishing permissions, literal search, pagination, and ownership before closing a job.
    const jobInput = { title: `Node.js ${prefix}`, description: 'Build and maintain backend APIs with our engineering team.', location: 'Lagos, Nigeria', employmentType: 'FULL_TIME', workMode: 'HYBRID' };
    assert.equal((await request('/jobs', { method: 'POST', body: jobInput })).status, 401);
    assert.equal((await request('/jobs', { method: 'POST', token, body: jobInput })).status, 403);
    assert.equal((await request('/jobs', { method: 'POST', token: employerToken, body: { ...jobInput, employerId: stored.id } })).status, 400);
    const created = await request('/jobs', { method: 'POST', token: employerToken, body: jobInput });
    assert.equal(created.status, 201);
    const jobId = created.body.data.id;
    assert.equal(created.body.data.status, 'OPEN');
    assert.equal(created.body.data.company.companyName, 'Demo Ltd');
    assert.equal(created.body.data.applicationSequence, undefined);
    const search = await request(`/jobs?q=${prefix}&location=lagos&employmentType=FULL_TIME&workMode=HYBRID&limit=1`);
    assert.equal(search.status, 200);
    assert.equal(search.body.data[0].id, jobId);
    assert.equal(search.body.meta.total, 1);
    assert.equal((await request(`/jobs?q=${prefix}&page=2&limit=1`)).body.data.length, 0);
    assert.equal((await request(`/jobs?q=${encodeURIComponent('.*' + prefix)}`)).body.meta.total, 0);
    assert.equal((await request('/jobs?limit=101')).status, 400);
    assert.equal((await request('/jobs?employmentType=INVALID')).status, 400);
    assert.equal((await request('/jobs/not-an-id')).status, 400);
    assert.equal((await request('/jobs/000000000000000000000000')).status, 404);
    assert.equal((await request(`/jobs/${jobId}`)).status, 200);
    const employerUser = await db.user.findUnique({ where: { email: emails[1] }, select: { employerProfile: { select: { id: true } } } });
    const foreignJob = await db.job.create({ data: { ...jobInput, employerId: employerUser.employerProfile.id, title: `Foreign ${prefix}` } });
    const foreignEmployer = await db.user.create({ data: { email: `${prefix}-foreign@example.com`, passwordHash: stored.passwordHash, role: 'EMPLOYER', employerProfile: { create: { companyName: 'Other Employer' } } } });
    try {
      const foreignToken = jwt.sign({}, secret, { subject: foreignEmployer.id, expiresIn: '1h', issuer: 'job-board-api', audience: 'job-board-client' });
      assert.equal((await request(`/jobs/${foreignJob.id}`, { method: 'PATCH', token: foreignToken, body: { title: 'Unauthorized edit' } })).status, 404);
      assert.equal((await request('/employers/me/jobs', { token: foreignToken })).body.meta.total, 0);
    } finally {
      await db.employerProfile.deleteMany({ where: { userId: foreignEmployer.id } });
      await db.user.delete({ where: { id: foreignEmployer.id } });
      await db.job.delete({ where: { id: foreignJob.id } });
    }
    assert.equal((await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: {} })).status, 400);
    assert.equal((await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: { status: 'CLOSED' } })).body.data.status, 'CLOSED');
    assert.equal((await request(`/jobs?q=${prefix}`)).body.meta.total, 0);
    assert.equal((await request(`/jobs/${jobId}`)).body.data.status, 'CLOSED');
    assert.equal((await request('/employers/me/jobs', { token: employerToken })).body.data[0].id, jobId);
    assert.equal((await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: { status: 'OPEN', title: `Updated ${prefix}` } })).body.data.status, 'OPEN');

    // Removing an account invalidates its token even before the token expires.
    await db.candidateProfile.deleteMany({ where: { userId: other.body.data.user.id } });
    await db.user.delete({ where: { id: other.body.data.user.id } });
    assert.equal((await request('/auth/me', { token: other.body.data.token })).status, 401);
  } finally {
    // Delete only this run's fictional records, leaving all other test data untouched.
    try {
      const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
      const ids = users.map(user => user.id);
      const employers = await db.employerProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
      await db.job.deleteMany({ where: { employerId: { in: employers.map(profile => profile.id) } } });
      await db.candidateProfile.deleteMany({ where: { userId: { in: ids } } });
      await db.employerProfile.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await new Promise(resolve => server.close(resolve));
      await db.$disconnect();
    }
  }
});
