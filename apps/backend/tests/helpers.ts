import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { FastifyInstance } from "fastify";
import { buildApp } from "@/app";

export interface TestDb {
  uri: string;
  stop: () => Promise<void>;
}

/**
 * Resolves a MongoDB connection string for tests:
 *  1. `MONGO_TEST_URI` if provided (e.g. a CI service or local mongod), else
 *  2. an in-memory MongoDB (downloads a binary on first use).
 * Returns `null` when neither is available so the integration suite can skip.
 */
export const resolveMongoUri = async (): Promise<TestDb | null> => {
  if (process.env.MONGO_TEST_URI) {
    return { uri: process.env.MONGO_TEST_URI, stop: async () => {} };
  }
  try {
    const mongo = await MongoMemoryServer.create();
    return { uri: mongo.getUri(), stop: () => mongo.stop().then(() => undefined) };
  } catch {
    return null;
  }
};

/** Builds the Fastify app with its own DB plugin disabled (tests own the connection). */
export const buildTestApp = async (): Promise<FastifyInstance> => {
  process.env.JWT_SECRET = "test-secret";
  const app = await buildApp({ connectDb: false, logger: false });
  await app.ready();
  return app;
};

export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};
