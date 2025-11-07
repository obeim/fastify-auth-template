import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: requestUser; // payload type
    user: requestUser; // request.user type
  }
}
interface requestUser {
  id: number;
  name: string;
  role: string;
}
