import UserModel from "@/models/user";
import ApplicationModel from "@/models/Application";
import PolicyModel from "@/models/policySchema";

interface CheckAccessInput {
  email: string;
  appName: string;
  policy: string;
}

/**
 * Determines whether a user holds a given policy for a given application —
 * the core access-management decision.
 */
export const checkAccess = async ({ email, appName, policy }: CheckAccessInput) => {
  const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
  if (!app) throw new Error("Application not found");

  const user = await UserModel.findOne({ email }, { userId: 1 });
  if (!user) throw new Error("User not found");

  const userPolicy = await PolicyModel.findOne({ userId: user.userId, appId: app.appId });
  const policies = userPolicy?.policies ?? [];
  const allowed = policies.includes(policy);

  return { email, appName, policy, allowed, policies };
};
