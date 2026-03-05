import { createHash, randomBytes } from "crypto";

const REFRESH_TOKEN_BYTES = 40;
export const REFRESH_TOKEN_TTL_DAYS = 30;

/** Generate a cryptographically secure refresh token (opaque string). */
export function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

/** Hash a refresh token for safe storage (SHA-256, not bcrypt — tokens are already random). */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compute the expiry date for a new refresh token. */
export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}
