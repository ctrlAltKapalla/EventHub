import fp from "fastify-plugin";
import FastifyJwt from "@fastify/jwt";
import FastifyCookie from "@fastify/cookie";
import { FastifyInstance } from "fastify";

async function jwtPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }

  // Cookie plugin (needed for HTTP-only refresh token)
  await fastify.register(FastifyCookie, {
    secret: secret, // signs cookies
  });

  // JWT plugin for access tokens
  await fastify.register(FastifyJwt, {
    secret,
    sign: { expiresIn: "15m" },
  });
}

export default fp(jwtPlugin, { name: "jwt", dependencies: [] });
