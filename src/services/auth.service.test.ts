import { describe, vi, beforeEach, it } from "vitest";
import AuthService from "./auth.service";
import bcrypt from "bcrypt";

const prismaMock = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
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

  beforeEach(() => {
    vi.resetAllMocks();
    authService = new AuthService(fastifyMock as any);
  });

  describe("loginUser", () => {
    it("throw an error if user not found", async ({ expect }) => {
      prismaMock.user.findUnique.mockReturnValue(null);
      await expect(
        authService.loginUser("test", "123456")
      ).rejects.toThrowError("Invalid credentials");
    });

    it("throw an error when password is incorrect", async ({ expect }) => {
      prismaMock.user.findUnique.mockReturnValue({ password: "hashed" });
      vi.spyOn(bcrypt, "compare").mockReturnValue(false as any);
      await expect(
        authService.loginUser("test", "123456")
      ).rejects.toThrowError("Invalid credentials");
    });

    it("return access and refresh token when successful", async ({
      expect,
    }) => {
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
        username: "test",
        role: "User",
      };

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
});
