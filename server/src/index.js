import { config } from './config.js';
import { createServer } from './server.js';
import { llmStatus } from './llm/client.js';

const server = createServer();
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`\nPort ${config.port} is already in use.\nFix: stop the other program, or set PORT=8788 in .env and restart.\n`);
  else console.error(`\nServer error: ${error.message}\n`);
  process.exit(1);
});
server.listen(config.port, () => {
  const llm = llmStatus();
  console.log(`\nRepoLens server  http://localhost:${config.port}`);
  console.log(`  GitHub token   ${config.githubToken ? 'configured' : 'not set (60 requests per hour; see README)'}`);
  console.log(`  Language model ${llm.configured ? `${llm.provider} / ${llm.model}` : 'not configured (summaries and answers are extractive)'}`);
  console.log(`  Vulnerability check (OSV)  ${config.osvEnabled ? 'on' : 'off'}\n`);
});
process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
