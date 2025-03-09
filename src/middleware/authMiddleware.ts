import { FastifyRequest, FastifyReply } from "fastify";
import ApplicationModel from "@/models/Application";

export const authenticateApp = async (req: FastifyRequest, reply: FastifyReply) => {
    const clientId = req.headers["client-id"] as string;
    const clientSecret = req.headers["client-secret"] as string;

    if (!clientId || !clientSecret) {
        return reply.code(401).send({ error: "Unauthorized" });
    }

    const app = await ApplicationModel.findOne({ clientId, clientSecret });
    if (!app) {
        return reply.code(401).send({ error: "Invalid API credentials" });
    }
};
