import mongoose from "mongoose";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { env } from "@/config/env";

export default fp(async (fastify: FastifyInstance) => {
  // Reuse an existing connection (e.g. one opened by the test harness).
  if (mongoose.connection.readyState === 1) {
    fastify.log.info("Reusing existing MongoDB connection");
    return;
  }

  try {
    await mongoose.connect(env.mongoUri);
    fastify.log.info("MongoDB connected with Mongoose");
  } catch (error) {
    fastify.log.error({ err: error }, "MongoDB connection error");
    process.exit(1);
  }
});
