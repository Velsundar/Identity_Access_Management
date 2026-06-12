import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "@/utils/routeHandler";
import { registerApplication } from "@/services/appServices";
import { loginUser, onboardUser, registerUser } from "@/services/authServices";
import { successResponse } from "@/utils/responseUtils";

const emailPasswordSchema = {
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6 },
    },
  },
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/register",
    { schema: emailPasswordSchema },
    handleRoute(async (request) => {
      const { email, password } = request.body as { email: string; password: string };
      const user = await registerUser(email, password);
      return successResponse("User registered successfully", user);
    })
  );

  fastify.post(
    "/login",
    { schema: emailPasswordSchema },
    handleRoute(async (request) => {
      const { email, password } = request.body as { email: string; password: string };
      return loginUser(email, password, fastify.jwt.sign);
    })
  );

  fastify.post(
    "/onboard-user",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "appName", "policies"],
          properties: {
            email: { type: "string", format: "email" },
            appName: { type: "string" },
            policies: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    handleRoute(async (request) => {
      const { email, appName, policies } = request.body as {
        email: string;
        appName: string;
        policies: string[];
      };
      const result = await onboardUser(email, appName, policies);
      return successResponse(result.message, result.user);
    })
  );

  fastify.post(
    "/register-app",
    {
      schema: {
        body: {
          type: "object",
          required: ["appName"],
          properties: { appName: { type: "string" } },
        },
      },
    },
    handleRoute(async (request) => {
      const { appName } = request.body as { appName: string };
      const app = await registerApplication(appName);
      return successResponse("Application registered successfully", app);
    })
  );
};

export default authRoutes;
