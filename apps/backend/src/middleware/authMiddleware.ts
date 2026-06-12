import { FastifyRequest, FastifyReply } from "fastify";
import ApplicationModel from "@/models/Application";

/**
 * preHandler that authenticates a calling application via the
 * `client-id` / `client-secret` headers. On failure it replies 401 and the
 * route handler is never invoked.
 */
export const authenticateApp = async (req: FastifyRequest, reply: FastifyReply) => {
  const clientId = req.headers["client-id"] as string | undefined;
  const clientSecret = req.headers["client-secret"] as string | undefined;

  if (!clientId || !clientSecret) {
    return reply.code(401).send({ error: "Missing client credentials" });
  }

  const app = await ApplicationModel.findOne({ clientId, clientSecret });
  if (!app) {
    return reply.code(401).send({ error: "Invalid client credentials" });
  }
};
