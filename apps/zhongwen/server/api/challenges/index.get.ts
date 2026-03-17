import { and, count, desc, eq, gt, max, or, sql } from "drizzle-orm";

import { db } from "../../database";
import { challenge, challengeAttempt, challengeParticipant } from "../../database/schema";
import { auth } from "../../lib/auth";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const now = new Date();
  const userId = session.user.id;

  const participantSub = db
    .select({ challengeId: challengeParticipant.challengeId })
    .from(challengeParticipant)
    .where(eq(challengeParticipant.userId, userId));

  const rows = await db
    .select({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      hskLevel: challenge.hskLevel,
      mode: challenge.mode,
      questionCount: challenge.questionCount,
      timeLimitSec: challenge.timeLimitSec,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
      inviteCode: challenge.inviteCode,
      createdBy: challenge.createdBy,
      createdAt: challenge.createdAt,
      participantCount: count(challengeParticipant.userId),
    })
    .from(challenge)
    .leftJoin(challengeParticipant, eq(challenge.id, challengeParticipant.challengeId))
    .where(
      or(
        gt(challenge.endsAt, now),
        sql`${challenge.id} IN (${participantSub})`,
      ),
    )
    .groupBy(challenge.id)
    .orderBy(desc(challenge.startsAt));

  const bestScores = await db
    .select({
      challengeId: challengeAttempt.challengeId,
      bestScore: max(challengeAttempt.score),
    })
    .from(challengeAttempt)
    .where(eq(challengeAttempt.userId, userId))
    .groupBy(challengeAttempt.challengeId);

  const scoreMap = new Map(bestScores.map((r) => [r.challengeId, r.bestScore]));

  const allBestAttempts = await db
    .select({
      challengeId: challengeAttempt.challengeId,
      odlzhaId: challengeAttempt.userId,
      bestScore: max(challengeAttempt.score),
    })
    .from(challengeAttempt)
    .groupBy(challengeAttempt.challengeId, challengeAttempt.userId);

  const rankMap = new Map<string, { rank: number; total: number }>();
  const challengeScores = new Map<string, { score: number; odlzhaId: string }[]>();
  for (const row of allBestAttempts) {
    const arr = challengeScores.get(row.challengeId) ?? [];
    arr.push({ score: row.bestScore ?? 0, odlzhaId: row.odlzhaId });
    challengeScores.set(row.challengeId, arr);
  }
  for (const [cId, entries] of challengeScores) {
    entries.sort((a, b) => b.score - a.score);
    const idx = entries.findIndex((e) => e.odlzhaId === userId);
    if (idx !== -1) {
      rankMap.set(cId, { rank: idx + 1, total: entries.length });
    }
  }

  const enriched = rows.map((r) => {
    const isActive = r.startsAt <= now && r.endsAt > now;
    const isUpcoming = r.startsAt > now;
    const status = isActive ? "active" : isUpcoming ? "upcoming" : "past";
    const rankInfo = rankMap.get(r.id);
    return {
      ...r,
      status,
      bestScore: scoreMap.get(r.id) ?? null,
      rank: rankInfo?.rank ?? null,
      rankTotal: rankInfo?.total ?? null,
    };
  });

  enriched.sort((a, b) => {
    const order = { active: 0, upcoming: 1, past: 2 };
    return order[a.status] - order[b.status];
  });

  return enriched;
});
