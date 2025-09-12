import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  host: process.env.HOST || "0.0.0.0",
  database_url: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "jkl!±@£!@ghj1237",
  env: process.env.NODE_ENV,
  CORS_ALLOWED_ORIGINS: JSON.parse(process.env.CORS_ALLOWED_ORIGINS || "*"),
};

export type Config = typeof config;

export default config;
