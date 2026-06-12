import { randomUUID } from "crypto";

export const successResponse = (message: string, data: any = null) => {
  if (data) {
    data = JSON.parse(JSON.stringify(data));
    delete data._id;
    delete data.__v;
  }

  return {
    status: "success",
    message,
    timestamp: new Date().toISOString(),
    createdAt: data?.createdAt ?? null,
    updatedAt: data?.updatedAt ?? null,
    data,
  };
};

/** UUID v4 with the hyphens stripped — used for userId / appId / client credentials. */
export const generateCleanUUID = (): string => randomUUID().replace(/-/g, "");
