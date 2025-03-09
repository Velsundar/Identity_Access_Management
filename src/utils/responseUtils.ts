import uuid from "v4-uuid";

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
        createdAt: data?.createdAt || null,
        updatedAt: data?.updatedAt || null,
        data
    };
};

export const generateCleanUUID = () => uuid().replace(/-/g, "");
