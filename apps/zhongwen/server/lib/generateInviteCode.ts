import { randomBytes } from "node:crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a 6-character uppercase alphanumeric invite code.
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[bytes[i]! % CHARSET.length];
  }
  return code;
}
