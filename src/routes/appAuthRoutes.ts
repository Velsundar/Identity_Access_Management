import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requestOTP, verifyOTP } from "@/services/authServices";
import UserModel from "@/models/user";
import { generateRandomOTP } from "@/utils/otpUtils";
import ApplicationModel from "@/models/Application";
import PolicyModel from "@/models/policySchema";
import { successResponse } from "@/utils/responseUtils";

const appAuthRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/request-otp", async (request, reply) => {
        try {
            const { email } = request.body as { email: string };

            if (!email) return reply.code(400).send({ error: "Email is required" });

            const user = await UserModel.findOne({ email });
            if (!user) return reply.code(404).send({ error: "User not found" });

            const otp = generateRandomOTP();
            const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

            await UserModel.updateOne({ email }, { otp, otpExpiresAt });

            console.log(`OTP for ${email}: ${otp}`);

            reply.send({ message: "OTP sent successfully" });
        } catch (error: any) {
            reply.code(400).send({ error: error.message });
        }
    });
    fastify.post(
        "/verify-otp",
        async (request: FastifyRequest<{ Body: { email: string; otp: string } }>, reply: FastifyReply) => {
            try {
                const { email, otp } = request.body;
                const response = await verifyOTP(fastify, email, otp);
                reply.send(response);
            } catch (err: any) {
                reply.status(400).send({ error: err.message });
            }
        }
    );
    
    
    fastify.post("/remove-policies", async (request, reply) => {
        try {
            const { email, appName, policies } = request.body as {
                email: string;
                appName: string;
                policies: string[];
            };

            if (!email || !appName || !Array.isArray(policies) || policies.length === 0) {
                return reply.code(400).send({ error: "Email, appName, and an array of policies are required" });
            }

            // 🔍 Find the appId from Application collection
            const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
            if (!app) return reply.code(404).send({ error: "Application not found" });

            // 🔍 Find the userId from User collection
            const user = await UserModel.findOne({ email }, { userId: 1 });
            if (!user) return reply.code(404).send({ error: "User not found" });

            // 🔍 Find the policy entry for the user and app
            const userPolicy = await PolicyModel.findOne({ userId: user.userId, appId: app.appId });
            if (!userPolicy) {
                return reply.code(400).send({ error: "User is not onboarded to this app" });
            }

            // 🚀 Remove the selected policies
            const updatedPolicies = userPolicy.policies.filter(p => !policies.includes(p));

            if (updatedPolicies.length === 0) {
                // ❌ If no policies left, remove the entire entry
                await PolicyModel.deleteOne({ userId: user.userId, appId: app.appId });
            } else {
                // ✅ Update policy document
                await PolicyModel.updateOne({ userId: user.userId, appId: app.appId }, { policies: updatedPolicies });
            }

            reply.send(successResponse("Policies removed successfully", {
                email: user.email,
                appName,
                policies: updatedPolicies.length > 0 ? updatedPolicies : "No policies left",
            }));
        } catch (error: any) {
            reply.code(500).send({ error: error.message });
        }
    });
};

export default appAuthRoutes;
