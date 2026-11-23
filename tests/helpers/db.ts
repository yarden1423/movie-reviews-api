import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Spins up an in-memory MongoDB for the current test file and
 * wipes every collection between tests so tests stay independent.
 */
export function useTestDatabase() {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
}
