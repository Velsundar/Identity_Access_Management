import Fastify from "fastify";
import mongoosePlugin from "./plugins/mongodb";
import jwt from "./plugins/jwt";



const app = Fastify({
  logger: true
});
app.register(mongoosePlugin);
app.register(jwt);



export default app;
