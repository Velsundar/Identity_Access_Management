import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "@/utils/routeHandler";
import { listUsers, getUser, deleteUser } from "@/services/userServices";
import { successResponse } from "@/utils/responseUtils";

const emailParamSchema = {
  params: {
    type: "object",
    required: ["email"],
    properties: { email: { type: "string" } },
  },
};

const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    handleRoute(async () => {
      const users = await listUsers();
      return successResponse("Users fetched successfully", users);
    })
  );

  fastify.get(
    "/:email",
    { schema: emailParamSchema },
    handleRoute(async (request) => {
      const { email } = request.params as { email: string };
      const user = await getUser(email);
      return successResponse("User fetched successfully", user);
    })
  );

  fastify.delete(
    "/:email",
    { schema: emailParamSchema },
    handleRoute(async (request) => {
      const { email } = request.params as { email: string };
      const result = await deleteUser(email);
      return successResponse("User deleted successfully", result);
    })
  );
};

export default userRoutes;
