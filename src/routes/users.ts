import { UserRole } from "@prisma/client";
import { FastifyPluginCallback } from "fastify";

const usersRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  // Protected routes

  fastify.get(
    "/authRoute",
    { preHandler: [fastify.authenticate] },
    (request, reply) => {
      reply.send({ user: request.user });
    }
  );

  fastify.get(
    "/adminRoute",
    { preHandler: [fastify.authenticate, fastify.authorize([UserRole.ADMIN])] },
    (request, reply) => {
      reply.send({ user: request.user });
    }
  );

  fastify.get(
    "/moderatorRoute",
    {
      preHandler: [
        fastify.authenticate,
        fastify.authorize([UserRole.MODERATOR]),
      ],
    },
    (request, reply) => {
      reply.send({ user: request.user });
    }
  );

  fastify.get(
    "/moderatorAndAdminRoute",
    {
      preHandler: [
        fastify.authenticate,
        fastify.authorize([UserRole.MODERATOR, UserRole.ADMIN]),
      ],
    },
    (request, reply) => {
      reply.send({ user: request.user });
    }
  );

  done();
};

export default usersRoutes;
