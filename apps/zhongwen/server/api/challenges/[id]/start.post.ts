import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "../../../database";
import { challenge, challengeAttempt, challengeParticipant } from "../../../database/schema";
import { auth } from "../../../lib/auth";
import { ChallengeService } from "../../../lib/challengeQuestions";

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

  const [ch] = await db.select().from(challenge).where(eq(challenge.inviteCode, code)).limit(1);

  if (!ch) {
    throw createError({ statusCode: 404, statusMessage: "Challenge not found" });
  }

  const now = new Date();
  if (now < ch.startsAt || now > ch.endsAt) {
    throw createError({ statusCode: 400, statusMessage: "Challenge is not active" });
  }

  const challengeId = ch.id;

  const [participant] = await db
    .select()
    .from(challengeParticipant)
    .where(
      and(
        eq(challengeParticipant.challengeId, challengeId),
        eq(challengeParticipant.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!participant) {
    throw createError({ statusCode: 403, statusMessage: "You must join this challenge first" });
  }

  const [completedAttempt] = await db
    .select({ id: challengeAttempt.id })
    .from(challengeAttempt)
    .where(
      and(
        eq(challengeAttempt.challengeId, challengeId),
        eq(challengeAttempt.userId, session.user.id),
        isNotNull(challengeAttempt.finishedAt),
      ),
    )
    .limit(1);

  if (completedAttempt) {
    throw createError({
      statusCode: 400,
      statusMessage: "You have already completed this challenge",
    });
  }

  const [existing] = await db
    .select()
    .from(challengeAttempt)
    .where(
      and(
        eq(challengeAttempt.challengeId, challengeId),
        eq(challengeAttempt.userId, session.user.id),
        isNull(challengeAttempt.finishedAt),
      ),
    )
    .limit(1);

  let attemptId: string;

  if (existing) {
    attemptId = existing.id;
  } else {
    attemptId = crypto.randomUUID();
    await db.insert(challengeAttempt).values({
      id: attemptId,
      challengeId,
      userId: session.user.id,
      score: 0,
      timeMs: 0,
      startedAt: now,
    });
  }

  const challengeService = new ChallengeService();
  const questions = challengeService.generateChallengeQuestions({
    challengeId,
    hskLevel: ch.hskLevel,
    questionCount: ch.questionCount,
  });

  const clientQuestions = questions.map((q) => ({
    idx: q.idx,
    hanzi: q.hanzi,
    pinyin: q.pinyin,
    prompt: q.prompt,
    options: q.options.map((o) => ({ label: o.label })),
  }));

  return {
    attemptId,
    timeLimitSec: ch.timeLimitSec,
    questions: clientQuestions,
  };
});
