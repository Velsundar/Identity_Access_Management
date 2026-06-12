import ApplicationModel from "@/models/Application";
import PolicyModel from "@/models/policySchema";
import { generateCleanUUID } from "@/utils/responseUtils";

export const registerApplication = async (appName: string) => {
  const existing = await ApplicationModel.findOne({ appName });
  if (existing) {
    throw new Error("Application already exists");
  }

  const app = new ApplicationModel({
    appName,
    clientId: generateCleanUUID(),
    clientSecret: generateCleanUUID(),
  });
  await app.save();

  return app;
};

export const listApplications = async () => {
  return ApplicationModel.find({}, { appName: 1, appId: 1, clientId: 1, createdAt: 1 });
};

export const getApplication = async (appName: string) => {
  const app = await ApplicationModel.findOne({ appName });
  if (!app) throw new Error("Application not found");
  return app;
};

export const rotateClientSecret = async (appName: string) => {
  const clientSecret = generateCleanUUID();
  const app = await ApplicationModel.findOneAndUpdate(
    { appName },
    { clientSecret },
    { new: true }
  );
  if (!app) throw new Error("Application not found");
  return app;
};

export const deleteApplication = async (appName: string) => {
  const app = await ApplicationModel.findOne({ appName }, { appId: 1 });
  if (!app) throw new Error("Application not found");

  await PolicyModel.deleteMany({ appId: app.appId });
  await ApplicationModel.deleteOne({ appId: app.appId });

  return { appName };
};
