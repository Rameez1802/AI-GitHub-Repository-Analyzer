import fs from 'node:fs';
import { ERROR_CATALOGUE } from '../server/src/errors.js';

const rows = Object.entries(ERROR_CATALOGUE).map(([code, e]) => `| \`${code}\` | ${e.status === 200 ? 'warning' : e.status} | ${e.message.replace(/\|/g, '\\|')} | ${e.hint.replace(/\|/g, '\\|')} |`);
const md = ['# Error and warning catalogue', '', 'Generated from `server/src/errors.js` by `npm run docs:errors`. Placeholders such as `{repo}` are filled in at run time.', '', '| Code | Status | What it means | How to resolve it |', '|---|---|---|---|', ...rows, ''].join('\n');
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/ERRORS.md', md);
console.log(`Wrote docs/ERRORS.md (${rows.length} entries)`);
