import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "@/utils/routeHandler";
import {
  listApplications,
  getApplication,
  rotateClientSecret,
  deleteApplication,
} from "@/services/appServices";
import { successResponse } from "@/utils/responseUtils";

const appNameParamSchema = {
  params: {
    type: "object",
    required: ["appName"],
    properties: { appName: { type: "string" } },
  },
};

const appRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    handleRoute(async () => {
      const apps = await listApplications();
      return successResponse("Applications fetched successfully", apps);
    })
  );

  fastify.get(
    "/:appName",
    { schema: appNameParamSchema },
    handleRoute(async (request) => {
      const { appName } = request.params as { appName: string };
      const app = await getApplication(appName);
      return successResponse("Application fetched successfully", app);
    })
  );

  fastify.post(
    "/:appName/rotate-secret",
    { schema: appNameParamSchema },
    handleRoute(async (request) => {
      const { appName } = request.params as { appName: string };
      const app = await rotateClientSecret(appName);
      return successResponse("Client secret rotated successfully", app);
    })
  );

  fastify.delete(
    "/:appName",
    { schema: appNameParamSchema },
    handleRoute(async (request) => {
      const { appName } = request.params as { appName: string };
      const result = await deleteApplication(appName);
      return successResponse("Application deleted successfully", result);
    })
  );
};

export default appRoutes;
