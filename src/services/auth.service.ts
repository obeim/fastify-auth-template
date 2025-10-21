import { FastifyError, FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";

export class AuthService {
  private fastify: FastifyInstance;
  private jwt: FastifyInstance["jwt"];
  private prisma: FastifyInstance["prisma"];

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.jwt = fastify.jwt;
    this.prisma = fastify.prisma;
  }

  async loginUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
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

    const accessToken = this.jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      { algorithm: "HS256", expiresIn: "15m" }
    );

    if (user.refreshToken) {
      try {
        const payload = this.jwt.verify(user.refreshToken);
        if (payload) refreshToken = user.refreshToken;
      } catch (err) {
        refreshToken = this.jwt.sign(
          { id: user.id, name: user.name, role: user.role },
          { expiresIn: "7d" }
        );
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    return { user, accessToken, refreshToken };
  }

  async refreshUserToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken) as {
        id: number;
        username: string;
        role: string;
      };

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user || user.refreshToken !== refreshToken) {
        this.fastify.log.warn(
          `User:${user?.id}_${user?.email}:Invalid Refresh Token:${refreshToken}`
        );
        const error = new Error("Invalid refresh token") as FastifyError;
        error.statusCode = 401;
        throw error;
      }

      const accessToken = this.jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        { algorithm: "HS256", expiresIn: "15m" }
      );

      const newRefreshToken = this.jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        { expiresIn: "7d" }
      );

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return {
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      this.fastify.log.warn(`Invalid Refresh Token:${refreshToken}`);
      const error = new Error(
        "Invalid or expired refresh token"
      ) as FastifyError;
      error.statusCode = 401;
      throw error;
    }
  }

  async logoutUser(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const error = new Error("User not found") as FastifyError;
      error.statusCode = 404;
      throw error;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: "Logged out successfully" };
  }

  async registerUser(user: Omit<User, "refreshToken" | "role" | "id">) {
    const userExist = await this.prisma.user.findUnique({
      where: { email: user.email },
    });

    if (userExist) {
      const error = new Error("User Already exist") as FastifyError;
      error.statusCode = 403;
      throw error;
    }

    const createdUser = await this.prisma.user.create({
      data: user,
      omit: { password: true },
    });

    if (!createdUser) {
      throw new Error("Something Went Wrong") as FastifyError;
    }

    return createdUser;
  }
}

export default AuthService;
