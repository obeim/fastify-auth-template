import "@fastify/jwt";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import {
  ContextConfigDefault,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
} from "fastify";

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
