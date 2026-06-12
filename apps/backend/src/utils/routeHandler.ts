import { FastifyReply, FastifyRequest } from "fastify";

export const handleRoute = (fn: (req: FastifyRequest) => Promise<any>) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await fn(req);
      reply.send(result);
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  };
};
