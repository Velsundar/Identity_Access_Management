import { generateCleanUUID } from "@/utils/responseUtils";
import mongoose, { Schema, Document } from "mongoose";
import uuid from 'v4-uuid';

const ApplicationSchema = new Schema({
    appName: { type: String, required: true, unique: true, sparse: true },
    appId: { type: String, default: generateCleanUUID, unique: true },
    clientId: { type: String, required: true, unique: true },
    clientSecret: { type: String, required: true },
},
    { timestamps: true }
);

const ApplicationModel = mongoose.model("Application", ApplicationSchema);
export default ApplicationModel;
