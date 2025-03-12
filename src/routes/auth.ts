import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "../utils/routeHandler";
import { loginUser, onboardUser, registerApp } from "@/services/authServices";
import { successResponse } from "@/utils/responseUtils";
import { STATUS_CODES } from "@/utils/responseCode";

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post(
        "/onboard-user",
        handleRoute(async (req) => {
            const { email, appName, policies } = req.body as {
                email: string;
                appName: string;
                policies: string[];
            };

            if (!email || !appName || !Array.isArray(policies)) {
                throw new Error("Email, appName, and policies (as an array) are required");
            }

            const onboardResult = await onboardUser(email, appName, policies);

            return successResponse(onboardResult.message, onboardResult.user, STATUS_CODES.ok);
        })
    );
        
    fastify.post(
        "/login",
        handleRoute(async (request) => {
            const { username, password } = request.body as { username: string; password: string };
            return loginUser(username, password, fastify.jwt.sign);
        })
    );

    fastify.post("/register-app", async (request, reply) => {
        try {
            const { appName } = request.body as { appName: string };
            const newApp = await registerApp(appName);
            reply.send(successResponse("Application registered successfully", newApp, STATUS_CODES.created));
        } catch (error: any) {
            reply.code(500).send({ error: error.message });
        }
    });    
};

export default authRoutes;
