import crypto from "crypto";
import ApplicationModel from "@/models/Application";

export const registerApplication = async (name: string) => {
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString("hex");

    const app = new ApplicationModel({ name, clientId, clientSecret });
    await app.save();

    return { clientId, clientSecret };
};
