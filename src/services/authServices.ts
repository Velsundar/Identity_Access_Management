import bcrypt from "bcryptjs";
import UserModel from "@/models/user";

export const registerUser = async (username: string, password: string) => {
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({ username, password: hashedPassword });
    await newUser.save();

    return { message: "User registered successfully" };
};

export const loginUser = async (username: string, password: string, jwtSign: (payload: object) => string) => {
    const user = await UserModel.findOne({ username });
    if (!user) {
        throw new Error("Invalid username or password");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new Error("Invalid username or password");
    }

    const token = jwtSign({ username });
    return { token };
};
