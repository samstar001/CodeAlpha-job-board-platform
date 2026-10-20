import 'dotenv/config';
import { mkdtemp, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Verify installation in a new temporary copy without copying secrets, uploads, or node_modules.
const target = await mkdtemp(path.join(tmpdir(), 'job-board-clean-install-'));
for (const entry of ['package.json', 'package-lock.json', 'prisma.config.ts', 'prisma', 'src', 'tests']) {
  await cp(entry, path.join(target, entry), { recursive: true });
}
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`, RUN_DB_TESTS: '0' };
const commands = [[npmCli, 'ci', '--no-audit', '--no-fund'], ['node_modules/prisma/build/index.js', 'generate'], ['node_modules/prisma/build/index.js', 'validate'], ['--test', 'tests/foundation.test.js', 'tests/resumes.test.js', 'tests/auth.integration.test.js']];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { cwd: target, env, stdio: 'inherit', timeout: 180000 });
  if (result.status !== 0) { process.exitCode = 1; break; }
}
console.log(process.exitCode ? 'Clean install verification failed' : 'Clean install, client generation, schema validation, and local tests passed');
console.log(`Temporary verification copy: ${target}`);
