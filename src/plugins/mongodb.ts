import mongoose from "mongoose";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
dotenv.config();


export default fp(async (fastify: FastifyInstance) => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    fastify.log.info("MongoDB Connected with Mongoose");
  } catch (error) {
    fastify.log.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
});
