import Fastify from "fastify";
import mongoosePlugin from "./plugins/mongodb";
import jwt from "./plugins/jwt";
import authRoutes from "./routes/auth";
import appAuthRoutes from "./routes/appAuthRoutes";



const app = Fastify({
  logger: true
});
app.register(authRoutes, { prefix: "/api/auth" });
app.register(appAuthRoutes, { prefix: "/app-auth" });
app.register(mongoosePlugin);
app.register(jwt);



export default app;
