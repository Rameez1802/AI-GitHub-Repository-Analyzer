// Runs every server test file. Works on Node 20, 22 and later (no shell globbing needed).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const files = fs.readdirSync('server/test').filter((f) => f.endsWith('.test.js')).map((f) => `server/test/${f}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
