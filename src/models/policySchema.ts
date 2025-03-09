import mongoose, { Schema } from "mongoose";

interface IPolicy extends Document {
    userId: string;
    appId: string; // Reference to the application
    policies: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  const PolicySchema = new Schema<IPolicy>(
    {
      userId: { type: String, required: true, index: true },
      appId: { type: String, required: true, index: true },
      policies: { type: [String], required: true },
    },
    { timestamps: true }
  );
  
  const PolicyModel = mongoose.model<IPolicy>("Policy", PolicySchema);
  export default PolicyModel;
  