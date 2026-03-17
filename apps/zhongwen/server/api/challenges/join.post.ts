import { eq } from "drizzle-orm";

import { db } from "../../database";
import { challenge, challengeParticipant } from "../../database/schema";
import { auth } from "../../lib/auth";

type Body = {
  inviteCode: string;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<Body>(event);

  if (!body.inviteCode?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Invite code is required" });
  }

  const code = body.inviteCode.trim().toUpperCase();

  const [row] = await db
    .select({ id: challenge.id, inviteCode: challenge.inviteCode, endsAt: challenge.endsAt })
    .from(challenge)
    .where(eq(challenge.inviteCode, code))
    .limit(1);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Challenge not found" });
  }

  if (row.endsAt <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: "Challenge has ended" });
  }

  await db
    .insert(challengeParticipant)
    .values({
      challengeId: row.id,
      userId: session.user.id,
      joinedAt: new Date(),
    })
    .onConflictDoNothing();

  return { inviteCode: row.inviteCode };
});
