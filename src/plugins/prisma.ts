import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
export default fp(async (fastify) => {
  const prisma = new PrismaClient().$extends({
    query: {
      user: {
        create: async ({ args, query }) => {
          args.data.password = await bcrypt.hash(args.data.password, 10);

          return query(args);
        },
      },
    },
  });
  await prisma.$connect();

  fastify.decorate("prisma", prisma as PrismaClient);

  fastify.addHook("onClose", async (app) => {
    await app.prisma.$disconnect();
  });
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
