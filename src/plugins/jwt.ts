import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "@/config/env";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: env.jwtSecret,
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: "Unauthorized" });
      }
    }
  );
});
