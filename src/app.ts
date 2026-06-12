import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import mongoosePlugin from "./plugins/mongodb";
import jwt from "./plugins/jwt";

import authRoutes from "./routes/auth";
import appAuthRoutes from "./routes/appAuthRoutes";
import userRoutes from "./routes/user";
import appRoutes from "./routes/appRoutes";
import accessRoutes from "./routes/accessRoutes";

export interface BuildAppOptions {
  /** Skip the MongoDB plugin (tests manage their own connection). */
  connectDb?: boolean;
  /** Fastify logger option. */
  logger?: boolean;
}

/**
 * Builds and configures a Fastify instance without listening on a port.
 * Used by both the server entrypoint and the test suite (via app.inject()).
 */
export const buildApp = async (
  options: BuildAppOptions = {}
): Promise<FastifyInstance> => {
  const { connectDb = true, logger = true } = options;

  const app = Fastify({ logger });

  await app.register(cors, { origin: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Velos IAM API",
        description: "Identity & Access Management service",
        version: "1.0.0",
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(jwt);
  if (connectDb) {
    await app.register(mongoosePlugin);
  }

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(appAuthRoutes, { prefix: "/app-auth" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(appRoutes, { prefix: "/api/apps" });
  await app.register(accessRoutes, { prefix: "/api/access" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
};

export default buildApp;
