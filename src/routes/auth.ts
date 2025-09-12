import { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import auth from "../services/auth";
import {
  LoginSchema,
  refreshTokenSchema,
  RegisterSchema,
} from "../validations/auth";

const authRoutes: FastifyPluginCallbackTypebox = (fastify, opts, done) => {
  fastify.get("/logout", async (request, reply) => {
    const response = await auth.logoutUser(request.user.id, fastify);
    reply.status(200).send(response);
  });

  fastify.post("/login", { schema: LoginSchema }, async (request, reply) => {
    const { refreshToken, ...rest } = await auth.loginUser(
      request.body.email,
      request.body.password,
      fastify
    );

    reply
      .status(201)
      .setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        path: "/api/auth/refresh",
      })
      .send(rest);
  });

  fastify.post(
    "/register",
    { schema: RegisterSchema },
    async (request, reply) => {
      const response = await auth.RegisterUser(
        {
          email: request.body.email,
          name: request.body.name,
          password: request.body.password,
        },
        fastify
      );
      reply.status(201).send(response);
    }
  );

  fastify.get(
    "/refresh",
    { schema: refreshTokenSchema },
    async (request, reply) => {
      console.log(request.cookies["refreshToken"]);
      const { accessToken, refreshToken } = await auth.refreshUserToken(
        request.cookies["refreshToken"] || "",
        fastify
      );

      reply
        .setCookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: true,
          path: "/api/auth/refresh",
        })
        .send({ accessToken });
    }
  );

  done();
};

export default authRoutes;
