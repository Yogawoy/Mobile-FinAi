import os from 'os';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

function getLanIpv4(): string | null {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const info of entries ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address;
      }
    }
  }
  return null;
}

const server = app.listen(env.PORT, '0.0.0.0', () => {
  const lanIp = getLanIpv4();
  console.log(`Smart Finance API berjalan [${env.NODE_ENV}]:`);
  console.log(`  Local:   http://localhost:${env.PORT}/api/health`);
  if (lanIp) {
    console.log(`  Network: http://${lanIp}:${env.PORT}/api/health`);
  }
});

async function shutdown(signal: string) {
  console.log(`Menerima sinyal ${signal}, menutup server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
