// Starts the API server and the Vite dev server together (no extra dependency).
import { spawn } from 'node:child_process';

const run = (name, cmd, args) => {
  const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => { if (code) { console.error(`\n[${name}] exited with code ${code}`); process.exit(code); } });
  return child;
};
const children = [run('server', process.execPath, ['--watch', 'server/src/index.js']), run('web', process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'])];
const stop = () => children.forEach((c) => c.kill());
process.on('SIGINT', stop); process.on('SIGTERM', stop);
