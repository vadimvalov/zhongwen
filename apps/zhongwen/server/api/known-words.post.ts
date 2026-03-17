import { db } from "../database";
import { userKnownWord } from "../database/schema";
import { auth } from "../lib/auth";

type Body = {
  hanzi: string;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<Body>(event);
  const hanzi = body.hanzi?.trim();

  if (!hanzi) {
    throw createError({ statusCode: 400, statusMessage: "Missing hanzi" });
  }

  await db
    .insert(userKnownWord)
    .values({
      userId: session.user.id,
      hanzi,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return { ok: true };
});
