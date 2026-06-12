import UserModel from "@/models/user";
import PolicyModel from "@/models/policySchema";

export const listUsers = async () => {
  return UserModel.find({}, { email: 1, userId: 1, createdAt: 1 });
};

export const getUser = async (email: string) => {
  const user = await UserModel.findOne({ email }, { email: 1, userId: 1, createdAt: 1 });
  if (!user) throw new Error("User not found");

  const policies = await PolicyModel.find({ userId: user.userId }, { appId: 1, policies: 1 });
  return { email: user.email, userId: user.userId, policies };
};

export const deleteUser = async (email: string) => {
  const user = await UserModel.findOne({ email }, { userId: 1 });
  if (!user) throw new Error("User not found");

  await PolicyModel.deleteMany({ userId: user.userId });
  await UserModel.deleteOne({ userId: user.userId });

  return { email };
};
