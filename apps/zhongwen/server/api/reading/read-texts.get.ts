import { eq } from "drizzle-orm";

import { db } from "../../database";
import { userReadText } from "../../database/schema";
import { auth } from "../../lib/auth";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    return [];
  }

  const rows = await db
    .select({ textId: userReadText.textId })
    .from(userReadText)
    .where(eq(userReadText.userId, session.user.id));

  return rows.map((row) => row.textId);
});
