import "@fastify/jwt";
import { Type } from "@sinclair/typebox";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: number; name: string; role: string }; // payload type
    user: requestUser; // request.user type
  }
}
interface requestUser {
  id: number;
  name: string;
  role: string;
}
