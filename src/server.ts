import fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import fastifyCompress from "@fastify/compress";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";

import config from "./config/config";

import authPlugin from "./plugins/auth";

import authRoutes from "./routes/auth";
import prismaPlugin from "./plugins/prisma";
import usersRoutes from "./routes/users";

const server = fastify({ logger: true });

// register fastify plugins
server.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-origin" },
});
server.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "1 minute",
});
server.register(fastifyCors, {
  origin: config.CORS_ALLOWED_ORIGINS,
  credentials: true, // 🔑 needed for cookies (refresh token)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
server.register(fastifyCookie);
server.register(fastifyCompress);

try {
  server.register(prismaPlugin);

  server.register(authPlugin);
  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(usersRoutes);

  // all routes will inside users route will require admin permission
  // server.register((instance, opts, done) => {
  //   instance.addHook("preHandler", instance.authenticate() ,instance.authorize(["ADMIN"]));
  //   usersRoutes(instance, opts, done);
  // });

  server.get("/", (req, reply) => {
    reply.send("api is running");
  });
  await server.listen({ port: config.port });
  server.log.info(`Server listening on http://${config.host}:${config.port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
