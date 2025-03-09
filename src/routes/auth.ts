import { FastifyPluginAsync } from "fastify";
import { handleRoute } from "../utils/routeHandler";
import { registerApplication } from "@/services/appServices";
import { loginUser, onboardUser } from "@/services/authServices";
import { authenticateApp } from "@/middleware/authMiddleware";
import uuid from "v4-uuid";
import ApplicationModel from "@/models/Application";
import { generateCleanUUID, successResponse } from "@/utils/responseUtils";
import UserModel from "@/models/user";

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/onboard-user", async (request, reply) => {
        try {
            const { email, appName, policies } = request.body as { 
                email: string; 
                appName: string; 
                policies: string[]; 
            };
    
            if (!email || !appName || !policies || !Array.isArray(policies)) {
                return reply.code(400).send({ error: "Email, appName, and policies (as an array) are required" });
            }
    
            const onboardResult = await onboardUser(email, appName, policies);
    
            reply.send(successResponse(onboardResult.message, onboardResult.user));
        } catch (error: any) {
            reply.code(500).send({ error: error.message });
        }
    });    
        
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

            if (!appName) {
                return reply.code(400).send({ error: "App name is required" });
            }

            const existingApp = await ApplicationModel.findOne({ appName });
            if (existingApp) {
                return reply.code(400).send({ error: "Application already exists" });
            }

            const newApp = new ApplicationModel({
                appName,
                clientId: generateCleanUUID(),
                clientSecret: generateCleanUUID()
            });

            await newApp.save();

            reply.send(successResponse("Application registered successfully", newApp));
        } catch (error: any) {
            reply.code(500).send({ error: error.message });
        }
    });
};

export default authRoutes;
