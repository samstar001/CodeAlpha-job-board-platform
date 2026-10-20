// Enable explicitly isolated MongoDB tests without platform-specific shell environment syntax.
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--test', 'tests/auth.integration.test.js'], { env: { ...process.env, RUN_DB_TESTS: '1' }, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
