import { FastifyError, FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";

export const loginUser = async (
  email: string,
  password: string,
  fastify: FastifyInstance
) => {
  const { jwt, prisma } = fastify;
  const user = await prisma.user.findUnique({ where: { email } });
  let refreshToken = "";
  // check if user exists
  if (!user) {
    const error = new Error("Invalid credentials") as FastifyError;
    error.statusCode = 401;
    throw error;
  }
  // check if password is correct
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const error = new Error("Invalid credentials") as FastifyError;
    error.statusCode = 401;
    throw error;
  }

  const accessToken = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    { algorithm: "HS256", expiresIn: "15m" }
  );
  if (user.refreshToken)
    try {
      const payload = jwt.verify(user.refreshToken);
      if (payload) refreshToken = user.refreshToken;
    } catch (err) {
      refreshToken = jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        { expiresIn: "7d" }
      );
    }

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshToken },
  });

  return { user, accessToken, refreshToken };
};

export const refreshUserToken = async (
  refreshToken: string,
  fastify: FastifyInstance
) => {
  const { jwt, prisma } = fastify;
  try {
    const payload = jwt.verify(refreshToken) as {
      id: number;
      username: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: payload.id } });

    if (!user || user.refreshToken !== refreshToken) {
      fastify.log.info(
        `User:${user?.id}_${user?.email}:Invalid Refresh Token:${refreshToken}`
      );
      const error = new Error("Invalid refresh token") as FastifyError;
      error.statusCode = 401;
      throw error;
    }
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      { algorithm: "HS256", expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      { expiresIn: "7d" }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });
    return {
      accessToken: accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (err) {
    fastify.log.info(`Invalid Refresh Token:${refreshToken}`);
    const error = new Error("Invalid or expired refresh token") as FastifyError;
    error.statusCode = 401;
    throw error;
  }
};

export const logoutUser = async (userId: number, fastify: FastifyInstance) => {
  const { prisma } = fastify;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error("User not found") as FastifyError;
    error.statusCode = 404;
    throw error;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  return { message: "Logged out successfully" };
};

export const RegisterUser = async (
  user: Omit<User, "refreshToken" | "role" | "id">,
  fastify: FastifyInstance
) => {
  const { prisma } = fastify;
  const userExist = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (userExist) {
    const error = new Error("User Already exist ") as FastifyError;
    error.statusCode = 403;
    throw error;
  }

  const createdUser = await prisma.user.create({
    data: user,
    omit: { password: true },
  });
  if (!createdUser) throw new Error("Something Went Wrong") as FastifyError;
  return createdUser;
};

export default { loginUser, refreshUserToken, logoutUser, RegisterUser };
