import ApplicationModel from "@/models/Application";

export const authenticateApplication = async (clientId: string, clientSecret: string, signJWT: (payload: any) => string) => {
  const app = await ApplicationModel.findOne({ clientId, clientSecret });
  if (!app) {
    throw new Error("Invalid API credentials");
  }
  const token = signJWT({ clientId });
  return { token };
};
