import fs from 'node:fs';
import { config } from './config.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
for (const dir of [config.uploadsDir, config.reportsDir]) fs.mkdirSync(dir, { recursive: true });
const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port} (${config.env})`);
});
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
