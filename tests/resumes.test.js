import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createResumeService, resolveResumePath } from '../src/modules/resumes/resumes.service.js';

// Metadata failures must not leave a newly written file behind on disk.
test('resume persistence failure removes the new file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'job-board-cleanup-test-'));
  const failure = new Error('Simulated persistence failure');
  const db = { candidateProfile: { findUnique: async () => ({ id: 'candidate' }) }, resume: { create: async () => { throw failure; } } };
  const bytes = Buffer.from('%PDF-1.4\nDummy\n%%EOF');
  try {
    await assert.rejects(createResumeService(db, directory).upload({ id: 'user' }, { originalname: 'resume.pdf', mimetype: 'application/pdf', buffer: bytes, size: bytes.length }), failure);
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rmdir(directory);
  }
});

// Untrusted database keys cannot direct downloads outside the configured storage directory.
test('resume path resolution rejects traversal and absolute keys', () => {
  for (const key of ['../secret.pdf', 'C:\\secret.pdf', '/secret.pdf', 'resume.pdf']) {
    assert.throws(() => resolveResumePath('./storage/resumes', key), /Resume file not found/);
  }
});
