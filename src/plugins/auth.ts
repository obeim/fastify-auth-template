import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import config from "../config/config";
import { UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authorize: (roles: UserRole[]) => any;
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.register(jwt, {
    secret: config.jwtSecret,
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: "Unauthorized" });
      }
    }
  );

  fastify.decorate("authorize", (roles: string[]) => {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      if (request?.user && !roles.includes(request.user.role)) {
        reply.code(403).send({ error: "Forbidden - insufficient role" });
      }
    };
  });
});

export default authPlugin;
