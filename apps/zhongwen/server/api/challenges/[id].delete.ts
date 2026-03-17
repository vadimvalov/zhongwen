import { and, eq } from "drizzle-orm";

import { db } from "../../database";
import { challenge } from "../../database/schema";
import { auth } from "../../lib/auth";

const ADMIN_ID = "1L1aU9BQM0CHwuiumLtdLEbEbppCTYu2";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const code = getRouterParam(event, "id");
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: "Missing challenge code" });
  }

  const [row] = await db.select().from(challenge).where(eq(challenge.inviteCode, code)).limit(1);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Challenge not found" });
  }

  const isOwner = row.createdBy === session.user.id;
  const isAdmin = session.user.id === ADMIN_ID;

  if (!isOwner && !isAdmin) {
    throw createError({ statusCode: 403, statusMessage: "Not allowed to delete this challenge" });
  }

  await db
    .delete(challenge)
    .where(and(eq(challenge.id, row.id), eq(challenge.createdBy, row.createdBy)));

  return { ok: true };
});
