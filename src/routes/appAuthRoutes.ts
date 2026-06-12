import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "@/utils/routeHandler";
import { requestOTP, verifyOTP } from "@/services/authServices";
import UserModel from "@/models/user";
import ApplicationModel from "@/models/Application";
import PolicyModel from "@/models/policySchema";
import { successResponse } from "@/utils/responseUtils";

const appAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/request-otp",
    {
      schema: {
        body: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
      },
    },
    handleRoute(async (request) => {
      const { email } = request.body as { email: string };
      return requestOTP(email);
    })
  );

  fastify.post(
    "/verify-otp",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email" },
            otp: { type: "string" },
          },
        },
      },
    },
    handleRoute(async (request) => {
      const { email, otp } = request.body as { email: string; otp: string };
      return verifyOTP(fastify, email, otp);
    })
  );

  fastify.post(
    "/remove-policies",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "appName", "policies"],
          properties: {
            email: { type: "string", format: "email" },
            appName: { type: "string" },
            policies: { type: "array", items: { type: "string" }, minItems: 1 },
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

      const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
      if (!app) throw new Error("Application not found");

      const user = await UserModel.findOne({ email }, { userId: 1, email: 1 });
      if (!user) throw new Error("User not found");

      const userPolicy = await PolicyModel.findOne({ userId: user.userId, appId: app.appId });
      if (!userPolicy) throw new Error("User is not onboarded to this app");

      const updatedPolicies = userPolicy.policies.filter((p) => !policies.includes(p));

      if (updatedPolicies.length === 0) {
        await PolicyModel.deleteOne({ userId: user.userId, appId: app.appId });
      } else {
        await PolicyModel.updateOne(
          { userId: user.userId, appId: app.appId },
          { policies: updatedPolicies }
        );
      }

      return successResponse("Policies removed successfully", {
        email: user.email,
        appName,
        policies: updatedPolicies,
      });
    })
  );
};

export default appAuthRoutes;
