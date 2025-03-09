import bcrypt from "bcryptjs";
import UserModel from "@/models/user";
import ApplicationModel from "@/models/Application";
import { generateRandomOTP } from "@/utils/otpUtils";
import PolicyModel from "@/models/policySchema";
import jwt from "@/plugins/jwt";
import { FastifyInstance } from "fastify";

export const onboardUser = async (email: string, appName: string, policies: string[]) => {
    const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
    if (!app) throw new Error("Application not found");

    let user = await UserModel.findOne({ email }, { userId: 1 });

    if (!user) {
        user = await new UserModel({ email }).save();
    }

    // ✅ Check if user already has policies for this app
    let userPolicy = await PolicyModel.findOne({ userId: user.userId, appId: app.appId });

    if (userPolicy) {
        // ✅ Update policies (Merge without duplicates)
        const updatedPolicies = [...new Set([...userPolicy.policies, ...policies])];
        await PolicyModel.updateOne({ userId: user.userId, appId: app.appId }, { policies: updatedPolicies });
    } else {
        // ✅ Create new policy entry
        await new PolicyModel({ userId: user.userId, appId: app.appId, policies }).save();
    }

    return {
        message: "User onboarded successfully",
        user: {
            email: user.email,
            appName,
            policies,
        },
    };
};


export const loginUser = async (email: string, password: string, jwtSign: (payload: object) => string) => {
    const user = await UserModel.findOne({ email });
    if (!user || !user.password) {
        throw new Error("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new Error("Invalid email or password");
    }

    const token = jwtSign({ email });
    return { token };
};

export const requestOTP = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("User not found");
  
    const otp = generateRandomOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
    await UserModel.updateOne({ email }, { otp, otpExpiresAt: expiresAt });
  
    console.log(`Your OTP is: ${otp}`);
    return { message: "OTP sent successfully" };
  };
  export const verifyOTP = async (fastify: FastifyInstance, email: string, otp: string) => {
    const user = await UserModel.findOne({ email }, { userId: 1, otp: 1, otpExpiresAt: 1 });

    if (!user || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        throw new Error("Invalid or expired OTP");
    }

    console.log("✅ User found:", user);

    // Fetch user policies
    const userPolicies = await PolicyModel.find({ userId: user.userId }, { appId: 1, policies: 1 });
    console.log("🔍 User Policies:", userPolicies);

    if (!userPolicies.length) {
        console.log("⚠️ No policies found for user");
        return { message: "OTP verified successfully", token: null, apps: [] };
    }

    // Extract appIds from policies
    const appIds = userPolicies.map(policy => policy.appId);
    console.log("🔍 Extracted App IDs:", appIds);

    // Fetch applications based on appIds
    const userApps = await ApplicationModel.find({ appId: { $in: appIds } }, { appId: 1, clientId: 1, clientSecret: 1, appName: 1 });
    console.log("🔍 Applications from DB:", userApps);

    if (!userApps.length) {
        console.log("⚠️ No applications found for appIds:", appIds);
    }

    // Generate JWT token using Fastify's built-in JWT sign
    const token = fastify.jwt.sign(
        { email, apps: userApps.map(app => app.appId) },
        { expiresIn: "1h" } // Token expires in 1 hour
    );

    await UserModel.updateOne({ email }, { otp: null, otpExpiresAt: null });

    return {
        message: "OTP verified successfully",
        token,
        apps: userApps.map(app => {
            const userPolicy = userPolicies.find(policy => policy.appId === app.appId);
            return {
                appId: app.appId,
                appName: app.appName,
                clientId: app.clientId,
                clientSecret: app.clientSecret,
                policies: userPolicy ? userPolicy.policies : [],
            };
        }),
    };
};
