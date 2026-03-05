import { FastifyReply } from "fastify";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: { field: string; message: string }[]
): void {
  const body: ApiError = { error: { code, message } };
  if (details?.length) body.error.details = details;
  reply.code(status).send(body);
}

export const Errors = {
  sendError,
  unauthorized: (reply: FastifyReply) =>
    sendError(reply, 401, "TOKEN_INVALID", "Unauthorized"),
  forbidden: (reply: FastifyReply) =>
    sendError(reply, 403, "FORBIDDEN", "Insufficient permissions"),
  notFound: (reply: FastifyReply, resource = "Resource") =>
    sendError(reply, 404, "NOT_FOUND", `${resource} not found`),
  conflict: (reply: FastifyReply, code: string, message: string) =>
    sendError(reply, 409, code, message),
  unprocessable: (reply: FastifyReply, code: string, message: string) =>
    sendError(reply, 422, code, message),
  badRequest: (
    reply: FastifyReply,
    details: { field: string; message: string }[]
  ) => sendError(reply, 400, "VALIDATION_ERROR", "Validation failed", details),
  internal: (reply: FastifyReply) =>
    sendError(reply, 500, "INTERNAL_ERROR", "Internal server error"),
};
