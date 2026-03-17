import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "../../database";
import { challenge, challengeAttempt, challengeParticipant, user } from "../../database/schema";
import { auth } from "../../lib/auth";

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

  const challengeId = row.id;

  const participants = await db
    .select({
      userId: challengeParticipant.userId,
      name: user.name,
      image: user.image,
      joinedAt: challengeParticipant.joinedAt,
    })
    .from(challengeParticipant)
    .innerJoin(user, eq(challengeParticipant.userId, user.id))
    .where(eq(challengeParticipant.challengeId, challengeId));

  const bestAttempts = await db
    .select({
      odUserId: challengeAttempt.userId,
      score: challengeAttempt.score,
      timeMs: challengeAttempt.timeMs,
      finishedAt: challengeAttempt.finishedAt,
    })
    .from(challengeAttempt)
    .where(
      and(eq(challengeAttempt.challengeId, challengeId), isNotNull(challengeAttempt.finishedAt)),
    )
    .orderBy(desc(challengeAttempt.score), sql`${challengeAttempt.timeMs} ASC`);

  const bestByUser = new Map<string, (typeof bestAttempts)[number]>();
  for (const attempt of bestAttempts) {
    if (!bestByUser.has(attempt.odUserId)) {
      bestByUser.set(attempt.odUserId, attempt);
    }
  }

  const participantMap = new Map(participants.map((p) => [p.userId, p]));

  const leaderboard = [...bestByUser.entries()].map(([userId, attempt], idx) => {
    const p = participantMap.get(userId);
    return {
      rank: idx + 1,
      userId,
      name: p?.name ?? "Unknown",
      image: p?.image ?? null,
      score: attempt.score,
      timeMs: attempt.timeMs,
      finishedAt: attempt.finishedAt,
    };
  });

  const isParticipant = participants.some((p) => p.userId === session.user.id);

  return {
    ...row,
    participantCount: participants.length,
    isParticipant,
    leaderboard,
  };
});
