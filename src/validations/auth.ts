import { UserRole } from "@prisma/client";
import { Type } from "@sinclair/typebox";

const UserSuccessfulLogin = Type.Object({
  user: Type.Object({
    id: Type.Number(),
    name: Type.String(),
    role: Type.Enum(UserRole),
  }),
  accessToken: Type.String(),
});

export const LoginSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String(),
  }),
  response: {
    201: UserSuccessfulLogin,
  },
};

export const RegisterSchema = {
  body: Type.Object({
    email: Type.String({ format: "email" }),
    password: Type.String({ minLength: 8 }),
    name: Type.String(),
  }),
};

export const refreshTokenSchema = {
  response: {
    200: Type.Object({
      accessToken: Type.String(),
    }),
  },
};
