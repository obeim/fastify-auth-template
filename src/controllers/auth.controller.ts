import { FastifyReply, FastifyRequest } from "fastify";
import AuthService from "../services/auth.service";
import {
  LoginSchema,
  refreshTokenSchema,
  RegisterSchema,
} from "../validations/auth";
import { FastifyReplyTypeBox, FastifyRequestTypeBox } from "../types/fastify";

class AuthController {
  constructor(public authService: AuthService) {
    this.authService = authService;

    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const response = this.authService.logoutUser(request.user.id);
    reply.status(200).send(response);
  }

  async login(
    request: FastifyRequestTypeBox<typeof LoginSchema>,
    reply: FastifyReplyTypeBox<typeof LoginSchema>
  ) {
    console.log(this.authService);
    const { refreshToken, ...rest } = await this.authService.loginUser(
      request.body.email,
      request.body.password
    );

    reply
      .status(201)
      .setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        path: "/api/auth/refresh",
        sameSite: true,
      })
      .send(rest);
  }

  async register(
    request: FastifyRequestTypeBox<typeof RegisterSchema>,
    reply: FastifyReplyTypeBox<typeof RegisterSchema>
  ) {
    const response = await this.authService.registerUser(request.body);

    reply.status(201).send(response);
  }

  async refresh(
    request: FastifyRequestTypeBox<typeof refreshTokenSchema>,
    reply: FastifyReplyTypeBox<typeof refreshTokenSchema>
  ) {
    const { accessToken, refreshToken } =
      await this.authService.refreshUserToken(
        request.cookies["refreshToken"] || ""
      );

    reply
      .setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        path: "/api/auth/refresh",
        sameSite: true,
      })
      .send({ accessToken });
  }
}

export default AuthController;
