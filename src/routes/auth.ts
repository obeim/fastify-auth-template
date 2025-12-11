import { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import { AuthService } from "../services/auth.service";
import {
  LoginSchema,
  refreshTokenSchema,
  RegisterSchema,
} from "../validations/auth";
import AuthController from "../controllers/auth.controller";

const authRoutes: FastifyPluginCallbackTypebox = (fastify, opts, done) => {
  const authService = new AuthService(fastify);
  const authController = new AuthController(authService);

  fastify.get(
    "/logout",
    { preHandler: [fastify.authenticate] },
    authController.logout
  );
  fastify.post("/login", { schema: LoginSchema }, authController.login);
  fastify.post(
    "/register",
    { schema: RegisterSchema },
    authController.register
  );
  fastify.get(
    "/refresh",
    { schema: refreshTokenSchema },
    authController.refresh
  );

  done();
};

export default authRoutes;
