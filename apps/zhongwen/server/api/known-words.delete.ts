import { and, eq } from "drizzle-orm";

import { db } from "../database";
import { userKnownWord } from "../database/schema";
import { auth } from "../lib/auth";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const hanzi = getQuery(event).hanzi as string | undefined;
  const value = hanzi?.trim();

  if (!value) {
    throw createError({ statusCode: 400, statusMessage: "Missing hanzi" });
  }

  await db
    .delete(userKnownWord)
    .where(and(eq(userKnownWord.userId, session.user.id), eq(userKnownWord.hanzi, value)));

  return { ok: true };
});
