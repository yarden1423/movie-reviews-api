/**
 * Fills the database with demo users, movies and reviews.
 *   npm run seed:demo
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { env } from '../config/env';
import { DEMO_PASSWORD, DEMO_USERS, seedDemoData } from './demoData';

async function main() {
  await connectDatabase(env.MONGO_URI);
  const summary = await seedDemoData();
  console.log(
    `Demo data: +${summary.users} users, +${summary.movies} movies, +${summary.reviews} reviews`,
  );
  console.log(`Log in as ${DEMO_USERS.map((u) => u.email).join(', ')} / ${DEMO_PASSWORD}`);
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
