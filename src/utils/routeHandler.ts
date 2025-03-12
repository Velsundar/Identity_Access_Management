import { FastifyReply, FastifyRequest } from "fastify";

export const handleRoute = (fn: (req: FastifyRequest) => Promise<any>) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await fn(req);
            reply.send(result);
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            reply.code(statusCode).send({ error: error.message || "Internal Server Error" });
        }
    };
};
