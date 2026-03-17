import { eq } from "drizzle-orm";

import { db } from "../database";
import { userKnownWord } from "../database/schema";
import { auth } from "../lib/auth";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    return [];
  }

  const rows = await db
    .select({ hanzi: userKnownWord.hanzi })
    .from(userKnownWord)
    .where(eq(userKnownWord.userId, session.user.id));

  return rows.map((row) => row.hanzi);
});
