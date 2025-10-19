import { UserRole } from "@prisma/client";
import { FastifyPluginCallback } from "fastify";
import UsersController from "../controllers/users.controller";

const usersRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  // Protected routes
  const usersController = new UsersController(fastify);

  fastify.get("/publicRoute", usersController.public);

  fastify.get(
    "/authRoute",
    { preHandler: [fastify.authenticate] },
    usersController.authOnly
  );

  fastify.get(
    "/adminRoute",
    { preHandler: [fastify.authenticate, fastify.authorize([UserRole.ADMIN])] },
    usersController.adminOnly
  );

  fastify.get(
    "/moderatorRoute",
    {
      preHandler: [
        fastify.authenticate,
        fastify.authorize([UserRole.MODERATOR]),
      ],
    },
    usersController.moderatorOnly
  );

  fastify.get(
    "/moderatorAndAdminRoute",
    {
      preHandler: [
        fastify.authenticate,
        fastify.authorize([UserRole.MODERATOR, UserRole.ADMIN]),
      ],
    },
    usersController.adminAndModertor
  );

  done();
};

export default usersRoutes;
