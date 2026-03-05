import fp from "fastify-plugin";
import FastifyCors from "@fastify/cors";
import { FastifyInstance } from "fastify";

async function corsPlugin(fastify: FastifyInstance) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

  await fastify.register(FastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
}

export default fp(corsPlugin, { name: "cors" });
