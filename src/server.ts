import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';

async function main() {
  await connectDatabase(env.MONGO_URI);
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT}`);
    console.log(`Swagger docs at http://localhost:${env.PORT}/api-docs`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
