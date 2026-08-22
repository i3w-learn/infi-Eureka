import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './config/db.js';

async function main(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: env.port, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
