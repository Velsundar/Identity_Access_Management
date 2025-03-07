import { FastifyPluginAsync } from "fastify";
import { registerUser, loginUser } from "@/services/authServices";
import { handleRoute } from "../utils/routeHandler";

const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post(
        "/register", handleRoute(async (request) => {
            const { username, password } = request.body as { username: string; password: string };
            return registerUser(username, password);
        })
    );

    fastify.post(
        "/login",
        handleRoute(async (request) => {
            const { username, password } = request.body as { username: string; password: string };
            return loginUser(username, password, fastify.jwt.sign);
        })
    );
};

export default authRoutes;
