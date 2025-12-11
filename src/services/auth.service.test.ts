import { describe, vi, beforeEach, it, expect } from "vitest";
import AuthService from "./auth.service";
import bcrypt from "bcrypt";

const prismaMock = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};
const jwtMock = {
  sign: vi.fn(),
  verify: vi.fn(),
};

const fastifyMock = {
  jwt: jwtMock,
  prisma: prismaMock,
  log: { warn: vi.fn() },
};

describe("authService", () => {
  let authService: AuthService;

  const mockedUser = {
    id: 1,
    email: "test@gmail.com",
    name: "test",
    password: "hashedPassword",
    role: "User",
    refreshToken: "refreshToken",
  };
  const mockPayload = {
    id: 1,
    name: "test",
    role: "User",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    authService = new AuthService(fastifyMock as any);
  });

  describe("loginUser", () => {
    it("throw an error if user not found", async () => {
      prismaMock.user.findUnique.mockReturnValue(null);
      await expect(
        authService.loginUser("test", "123456")
      ).rejects.toThrowError("Invalid credentials");
    });

    it("throw an error when password is incorrect", async () => {
      prismaMock.user.findUnique.mockReturnValue({ password: "hashed" });
      vi.spyOn(bcrypt, "compare").mockReturnValue(false as any);
      await expect(
        authService.loginUser("test", "123456")
      ).rejects.toThrowError("Invalid credentials");
    });

    it("generate new refresh token if the current one is not valid", async ({
      expect,
    }) => {
      prismaMock.user.findUnique.mockReturnValue(mockedUser);
      vi.spyOn(bcrypt, "compare").mockReturnValue(true as any);
      jwtMock.sign.mockReturnValueOnce("accessToken");
      jwtMock.sign.mockReturnValueOnce("refreshToken");

      jwtMock.verify.mockImplementation(() => {
        throw new Error("Mocked network error");
      });

      await expect(
        authService.loginUser(mockedUser.email, mockedUser.password)
      ).resolves.toStrictEqual({
        user: mockedUser,
        accessToken: "accessToken",
        refreshToken: "refreshToken",
      });

      expect(jwtMock.verify).toHaveBeenCalledOnce();

      expect(jwtMock.sign).toHaveBeenCalledTimes(2);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockedUser.id },
        data: { refreshToken: "refreshToken" },
      });
    });

    it("return access and refresh token when successful", async ({
      expect,
    }) => {
      prismaMock.user.findUnique.mockReturnValue(mockedUser);
      vi.spyOn(bcrypt, "compare").mockReturnValue(true as any);
      jwtMock.sign.mockReturnValue("accessToken");
      jwtMock.verify.mockReturnValue(mockPayload);

      await expect(
        authService.loginUser(mockedUser.email, mockedUser.password)
      ).resolves.toStrictEqual({
        user: mockedUser,
        accessToken: "accessToken",
        refreshToken: "refreshToken",
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockedUser.id },
        data: { refreshToken: "refreshToken" },
      });
    });
  });

  describe("registerUser", () => {
    it("it throw an error when user already exist", async () => {
      prismaMock.user.findUnique.mockReturnValue(mockedUser);
      await expect(authService.registerUser(mockedUser)).rejects.toThrowError(
        "User Already exist"
      );
    });

    it("to create successfully if user doesn't exist", async () => {
      prismaMock.user.findUnique.mockReturnValue(null);
      prismaMock.user.create.mockReturnValue(mockedUser);
      await expect(authService.registerUser(mockedUser)).resolves.toEqual(
        mockedUser
      );
    });

    it("throw an error if no user was returned after creation", async ({
      expect,
    }) => {
      prismaMock.user.findUnique.mockReturnValue(null);
      prismaMock.user.create.mockReturnValue(null);
      await expect(authService.registerUser(mockedUser)).rejects.toThrowError(
        "Something Went Wrong"
      );
    });
  });

  describe("logoutUser", () => {
    it("throw an error if user doesn't exist", async () => {
      prismaMock.user.updateMany.mockReturnValue({ count: 0 });
      await expect(authService.logoutUser(mockedUser.id)).rejects.toThrowError(
        "User not found"
      );
    });

    it("update user refresh token and logout successfully", async () => {
      prismaMock.user.updateMany.mockReturnValue({ count: 1 });

      await expect(authService.logoutUser(mockedUser.id)).resolves.toEqual({
        message: "Logged out successfully",
      });
      expect(prismaMock.user.updateMany).toBeCalledWith({
        where: { id: mockedUser.id },
        data: { refreshToken: null },
      });
    });
  });

  describe("refreshUserToken", () => {
    it("throw an error if refresh token is not valid", async () => {
      jwtMock.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(
        authService.refreshUserToken(mockedUser.refreshToken)
      ).rejects.toThrowError("Invalid or expired refresh token");

      expect(fastifyMock.log.warn).toHaveBeenCalledWith(
        `Invalid Refresh Token:${mockedUser.refreshToken}`
      );
    });

    it("throw an error if refresh token doesn't match current user refresh token", async () => {
      jwtMock.verify.mockReturnValue(mockPayload);
      prismaMock.user.findUnique.mockReturnValue(mockedUser);

      await expect(
        authService.refreshUserToken("wrongRefreshToken")
      ).rejects.toThrowError("Invalid or expired refresh token");

      expect(fastifyMock.log.warn).toHaveBeenCalledWith(
        `User:${mockedUser?.id}_${mockedUser?.email}:Invalid Refresh Token:wrongRefreshToken`
      );
    });

    it("return new access and refresh token when successful", async () => {
      jwtMock.verify.mockReturnValue(mockPayload);
      prismaMock.user.findUnique.mockReturnValue(mockedUser);

      jwtMock.sign.mockReturnValueOnce("newAccessToken");
      jwtMock.sign.mockReturnValueOnce("newRefreshToken");

      await expect(
        authService.refreshUserToken(mockedUser.refreshToken)
      ).resolves.toEqual({
        accessToken: "newAccessToken",
        refreshToken: "newRefreshToken",
      });
      expect(prismaMock.user.update).toBeCalledWith({
        where: { id: mockedUser.id },
        data: { refreshToken: "newRefreshToken" },
      });
      expect(jwtMock.sign).toHaveBeenCalledTimes(2);
    });
  });
});
