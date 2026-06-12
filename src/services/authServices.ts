import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";
import UserModel from "@/models/user";
import ApplicationModel from "@/models/Application";
import PolicyModel from "@/models/policySchema";
import { generateRandomOTP } from "@/utils/otpUtils";
import { sendOtpEmail } from "@/utils/email";

const OTP_TTL_MS = 5 * 60 * 1000;

/** Registers a user with a hashed password (or sets a password on an existing user). */
export const registerUser = async (email: string, password: string) => {
  const existing = await UserModel.findOne({ email });
  if (existing?.password) {
    throw new Error("User already registered");
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = existing
    ? await UserModel.findOneAndUpdate({ email }, { password: hashed }, { new: true })
    : await new UserModel({ email, password: hashed }).save();

  return { email: user!.email, userId: user!.userId };
};

export const loginUser = async (
  email: string,
  password: string,
  jwtSign: (payload: object) => string
) => {
  const user = await UserModel.findOne({ email });
  if (!user || !user.password) {
    throw new Error("Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  const token = jwtSign({ email, userId: user.userId });
  return { token };
};

export const onboardUser = async (email: string, appName: string, policies: string[]) => {
  const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
  if (!app) throw new Error("Application not found");

  let user = await UserModel.findOne({ email }, { userId: 1, email: 1 });
  if (!user) {
    user = await new UserModel({ email }).save();
  }

  const userPolicy = await PolicyModel.findOne({ userId: user.userId, appId: app.appId });

  if (userPolicy) {
    const updatedPolicies = [...new Set([...userPolicy.policies, ...policies])];
    await PolicyModel.updateOne(
      { userId: user.userId, appId: app.appId },
      { policies: updatedPolicies }
    );
  } else {
    await new PolicyModel({ userId: user.userId, appId: app.appId, policies }).save();
  }

  return {
    message: "User onboarded successfully",
    user: { email: user.email, appName, policies },
  };
};

export const requestOTP = async (email: string) => {
  const user = await UserModel.findOne({ email });
  if (!user) throw new Error("User not found");

  const otp = generateRandomOTP();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

  await UserModel.updateOne({ email }, { otp, otpExpiresAt });
  await sendOtpEmail(email, otp);

  return { message: "OTP sent successfully" };
};

export const verifyOTP = async (fastify: FastifyInstance, email: string, otp: string) => {
  const user = await UserModel.findOne(
    { email },
    { userId: 1, otp: 1, otpExpiresAt: 1 }
  );

  if (!user || user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    throw new Error("Invalid or expired OTP");
  }

  const userPolicies = await PolicyModel.find(
    { userId: user.userId },
    { appId: 1, policies: 1 }
  );

  // Always clear the consumed OTP.
  await UserModel.updateOne({ email }, { otp: null, otpExpiresAt: null });

  if (!userPolicies.length) {
    const token = fastify.jwt.sign({ email, apps: [] }, { expiresIn: "1h" });
    return { message: "OTP verified successfully", token, apps: [] };
  }

  const appIds = userPolicies.map((p) => p.appId);
  const userApps = await ApplicationModel.find(
    { appId: { $in: appIds } },
    { appId: 1, clientId: 1, clientSecret: 1, appName: 1 }
  );

  const token = fastify.jwt.sign(
    { email, apps: userApps.map((app) => app.appId) },
    { expiresIn: "1h" }
  );

  return {
    message: "OTP verified successfully",
    token,
    apps: userApps.map((app) => {
      const userPolicy = userPolicies.find((p) => p.appId === app.appId);
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
