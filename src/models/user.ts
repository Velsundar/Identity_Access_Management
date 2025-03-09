import { generateCleanUUID } from "@/utils/responseUtils";
import mongoose, { Schema, Document } from "mongoose";

interface IUser extends Document {
  email: string;
  userId: string;
  password?: string;
  otp?: string | null;
  otpExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    userId:{ type:String, reuired: true, default: generateCleanUUID},
    password: { type: String, required: false },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
