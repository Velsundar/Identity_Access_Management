import uuid from "v4-uuid";
import { STATUS_CODES } from "./responseCode";

export const successResponse = (message: string, data: any = null, statusCode : any) => {
    if (data) {
        data = JSON.parse(JSON.stringify(data));
        delete data._id;
        delete data.__v;
    }

    return {
        status: "success",
        code: statusCode?.code,
        statusText: statusCode.name,
        message,
        timestamp: new Date().toISOString(),
        createdAt: data?.createdAt || null,
        updatedAt: data?.updatedAt || null,
        data
    };
};

export const generateCleanUUID = () => uuid().replace(/-/g, "");
