import { and, eq } from "drizzle-orm";

import { db } from "../../database";
import { userReadText } from "../../database/schema";
import { auth } from "../../lib/auth";

type Body = {
  textId: string;
  read: boolean;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<Body>(event);
  const textId = body.textId?.trim();

  if (!textId) {
    throw createError({ statusCode: 400, statusMessage: "Missing textId" });
  }

  if (body.read) {
    await db
      .insert(userReadText)
      .values({
        userId: session.user.id,
        textId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userReadText)
      .where(and(eq(userReadText.userId, session.user.id), eq(userReadText.textId, textId)));
  }

  return { ok: true };
});
