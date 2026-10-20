// Run database tests explicitly so ordinary npm test never touches MongoDB.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createApplicationService } from '../src/modules/applications/applications.service.js';

test('authentication, jobs, resumes, and application lifecycle', { skip: process.env.RUN_DB_TESTS !== '1', timeout: 180000 }, async () => {
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
  const uploadDir = await mkdtemp(path.join(tmpdir(), 'job-board-resume-test-'));
  const server = createApp({ corsOrigin: 'http://localhost:3000', db, jwtSecret: secret, uploadDir, maxResumeBytes: 1024 }).listen(0, '127.0.0.1');
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

    // Compare uploaded bytes on disk and download, while denying unrelated users and employers.
    const pdf = Buffer.from('%PDF-1.4\nDummy resume for API storage tests\n%%EOF');
    async function uploadFile(bytes, filename = 'resume.pdf', mime = 'application/pdf', bearer = token, field = 'file') {
      const form = new FormData();
      form.append(field, new Blob([bytes], { type: mime }), filename);
      const response = await fetch(`${base}/resumes`, { method: 'POST', headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body: form });
      return { status: response.status, body: await response.json() };
    }
    const uploaded = await uploadFile(pdf);
    assert.equal(uploaded.status, 201);
    const resumeId = uploaded.body.data.id;
    assert.equal(uploaded.body.data.storageKey, undefined);
    assert.equal(uploaded.body.data.sizeBytes, pdf.length);
    const files = await readdir(uploadDir);
    assert.equal(files.length, 1);
    assert.notEqual(files[0], 'resume.pdf');
    assert.deepEqual(await readFile(path.join(uploadDir, files[0])), pdf);
    const download = await fetch(`${base}/resumes/${resumeId}/download`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /^attachment/);
    assert.equal(download.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    assert.equal((await request('/resumes/me', { token })).body.meta.total, 1);
    assert.equal((await request('/resumes/me', { token: other.body.data.token })).body.meta.total, 0);
    assert.equal((await request(`/resumes/${resumeId}/download`, { token: other.body.data.token })).status, 404);
    assert.equal((await request(`/resumes/${resumeId}/download`, { token: employerToken })).status, 404);
    assert.equal((await request(`/resumes/${resumeId}/download`)).status, 401);
    assert.equal((await request('/resumes/invalid/download', { token })).status, 400);
    assert.equal((await uploadFile(pdf, 'resume.pdf', 'application/pdf', employerToken)).status, 403);
    assert.equal((await uploadFile(pdf, 'resume.pdf', 'application/pdf', '')).status, 401);
    assert.equal((await uploadFile(Buffer.from('not a pdf'))).status, 415);
    assert.equal((await uploadFile(pdf, 'resume.txt', 'text/plain')).status, 415);
    assert.equal((await uploadFile(Buffer.alloc(1025))).status, 413);
    assert.equal((await uploadFile(pdf, 'resume.pdf', 'application/pdf', token, 'wrong')).status, 400);
    assert.equal((await request('/resumes', { method: 'POST', token, body: {} })).status, 400);
    assert.equal((await readdir(uploadDir)).length, 1);

    // Submission must validate ownership, reject closed jobs, and create one notification atomically.
    assert.equal((await request(`/jobs/${jobId}/applications`, { method: 'POST', token: other.body.data.token, body: { resumeId } })).status, 404);
    assert.equal((await request(`/jobs/${jobId}/applications`, { method: 'POST', token: employerToken, body: { resumeId } })).status, 403);
    assert.equal((await request('/jobs/invalid/applications', { method: 'POST', token, body: { resumeId } })).status, 400);
    await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: { status: 'CLOSED' } });
    assert.equal((await request(`/jobs/${jobId}/applications`, { method: 'POST', token, body: { resumeId } })).status, 409);
    await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: { status: 'OPEN' } });

    // Simulate notification storage failure inside a real transaction and prove no partial writes survive.
    const failureDb = { candidateProfile: db.candidateProfile, $transaction: work => db.$transaction(tx => work({ ...tx, notification: { create: async () => { throw new Error('Simulated notification failure'); } } })) };
    await assert.rejects(createApplicationService(failureDb).apply(stored, jobId, { resumeId }), /Simulated notification failure/);
    assert.equal(await db.application.count({ where: { jobId } }), 0);
    assert.equal((await db.job.findUnique({ where: { id: jobId } })).applicationSequence, 0);

    const submissions = await Promise.all([1, 2].map(() => request(`/jobs/${jobId}/applications`, { method: 'POST', token, body: { resumeId, coverLetter: 'I would like to join your backend team.' } })));
    assert.deepEqual(submissions.map(result => result.status).sort(), [201, 409]);
    const application = submissions.find(result => result.status === 201).body.data;
    assert.equal(application.status, 'SUBMITTED');
    assert.equal(application.version, 1);
    assert.equal(application.resume.storageKey, undefined);
    assert.equal(await db.notification.count({ where: { applicationId: application.id } }), 1);
    assert.equal((await db.job.findUnique({ where: { id: jobId } })).applicationSequence, 1);
    assert.equal((await request('/applications/me', { token })).body.meta.total, 1);
    assert.equal((await request(`/jobs/${jobId}/applications`, { token: employerToken })).body.data[0].id, application.id);
    assert.equal((await request(`/applications/${application.id}`, { token: other.body.data.token })).status, 404);
    const employerDownload = await fetch(`${base}/resumes/${resumeId}/download`, { headers: { Authorization: `Bearer ${employerToken}` } });
    assert.equal(employerDownload.status, 200);
    await employerDownload.arrayBuffer();

    // An unrelated employer cannot review, download, list applicants, or update the application.
    const outsiderEmail = `${prefix}-outsider@example.com`;
    emails.push(outsiderEmail);
    const outsider = await db.user.create({ data: { email: outsiderEmail, passwordHash: stored.passwordHash, role: 'EMPLOYER', employerProfile: { create: { companyName: 'Unrelated Employer' } } } });
    const outsiderToken = jwt.sign({}, secret, { subject: outsider.id, expiresIn: '1h', issuer: 'job-board-api', audience: 'job-board-client' });
    assert.equal((await request(`/jobs/${jobId}/applications`, { token: outsiderToken })).status, 404);
    assert.equal((await request(`/applications/${application.id}`, { token: outsiderToken })).status, 404);
    assert.equal((await request(`/resumes/${resumeId}/download`, { token: outsiderToken })).status, 404);
    const statusPath = `/applications/${application.id}/status`;
    assert.equal((await request(statusPath, { method: 'PATCH', token: outsiderToken, body: { status: 'REVIEWING', version: 1 } })).status, 404);
    assert.equal((await request(statusPath, { method: 'PATCH', token, body: { status: 'REVIEWING', version: 1 } })).status, 403);
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'HIRED', version: 1 } })).status, 409);

    // Competing status writes cannot overwrite one another; stale and terminal updates are rejected.
    const updates = await Promise.all([1, 2].map(() => request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'REVIEWING', version: 1 } })));
    assert.deepEqual(updates.map(result => result.status).sort(), [200, 409]);
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'REVIEWING', version: 2 } })).body.data.version, 2);
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'SHORTLISTED', version: 1 } })).status, 409);
    assert.equal((await request('/applications/me?status=REVIEWING', { token })).body.meta.total, 1);
    await request(`/jobs/${jobId}`, { method: 'PATCH', token: employerToken, body: { status: 'CLOSED' } });
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'SHORTLISTED', version: 2 } })).body.data.version, 3);
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'HIRED', version: 3 } })).body.data.status, 'HIRED');
    assert.equal((await request(statusPath, { method: 'PATCH', token: employerToken, body: { status: 'REJECTED', version: 4 } })).status, 409);
    assert.equal((await request(`/applications/${application.id}`, { token })).body.data.status, 'HIRED');

    // An employer sees only their inbox; marking read is idempotent and filters update accordingly.
    const inbox = await request('/notifications/me?unread=true', { token: employerToken });
    assert.equal(inbox.status, 200);
    assert.equal(inbox.body.meta.total, 1);
    const notificationId = inbox.body.data[0].id;
    assert.equal(inbox.body.data[0].applicationId, application.id);
    assert.equal((await request('/notifications/me', { token })).status, 403);
    assert.equal((await request('/notifications/me', { token: outsiderToken })).body.meta.total, 0);
    assert.equal((await request(`/notifications/${notificationId}/read`, { method: 'PATCH', token: outsiderToken })).status, 404);
    assert.equal((await request('/notifications/me?unread=invalid', { token: employerToken })).status, 400);
    const marked = await request(`/notifications/${notificationId}/read`, { method: 'PATCH', token: employerToken });
    assert.equal(marked.status, 200);
    assert.ok(marked.body.data.readAt);
    assert.equal((await request(`/notifications/${notificationId}/read`, { method: 'PATCH', token: employerToken })).body.data.readAt, marked.body.data.readAt);
    assert.equal((await request('/notifications/me?unread=true', { token: employerToken })).body.meta.total, 0);
    assert.equal((await request('/notifications/me?unread=false', { token: employerToken })).body.meta.total, 1);

    await unlink(path.join(uploadDir, files[0]));
    assert.equal((await request(`/resumes/${resumeId}/download`, { token })).status, 404);

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
      const candidates = await db.candidateProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
      const applications = await db.application.findMany({ where: { candidateId: { in: candidates.map(profile => profile.id) } }, select: { id: true } });
      await db.notification.deleteMany({ where: { applicationId: { in: applications.map(item => item.id) } } });
      await db.application.deleteMany({ where: { id: { in: applications.map(item => item.id) } } });
      await db.resume.deleteMany({ where: { candidateId: { in: candidates.map(profile => profile.id) } } });
      await db.job.deleteMany({ where: { employerId: { in: employers.map(profile => profile.id) } } });
      await db.candidateProfile.deleteMany({ where: { userId: { in: ids } } });
      await db.employerProfile.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    } finally {
      await new Promise(resolve => server.close(resolve));
      await db.$disconnect();
      // Remove only files within this freshly generated test directory, then remove the empty directory.
      for (const filename of await readdir(uploadDir)) await unlink(path.join(uploadDir, filename));
      await rmdir(uploadDir);
    }
  }
});
