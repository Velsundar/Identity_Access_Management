import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "@/utils/routeHandler";
import { checkAccess } from "@/services/accessServices";
import { authenticateApp } from "@/middleware/authMiddleware";
import { successResponse } from "@/utils/responseUtils";

const accessRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/check",
    {
      preHandler: authenticateApp,
      schema: {
        body: {
          type: "object",
          required: ["email", "appName", "policy"],
          properties: {
            email: { type: "string", format: "email" },
            appName: { type: "string" },
            policy: { type: "string" },
          },
        },
      },
    },
    handleRoute(async (request) => {
      const body = request.body as { email: string; appName: string; policy: string };
      const result = await checkAccess(body);
      return successResponse("Access check completed", result);
    })
  );
};

export default accessRoutes;
