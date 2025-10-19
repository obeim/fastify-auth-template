import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

class UsersController {
  constructor(public fastify: FastifyInstance) {}

  async public(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ message: "public route" });
  }

  async authOnly(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ message: "authorized user route", user: request.user });
  }

  async adminOnly(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ message: "admin route", user: request.user });
  }
  async moderatorOnly(request: FastifyRequest, reply: FastifyReply) {
    reply.send({ message: "moderator route", user: request.user });
  }
  async adminAndModertor(request: FastifyRequest, reply: FastifyReply) {
    reply.send({
      message: "admin and moderator shared route",
      user: request.user,
    });
  }
}

export default UsersController;
