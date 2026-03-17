import { and, eq, isNotNull } from "drizzle-orm";

import { db } from "../../../database";
import { challenge, challengeAnswer, challengeAttempt } from "../../../database/schema";
import { auth } from "../../../lib/auth";
import { generateChallengeQuestions } from "../../../lib/challengeQuestions";

/**
 * GET /api/challenges/:id/results
 * Returns the current user's completed attempt with full answer breakdown.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing challenge id" });
  }

  const [attempt] = await db
    .select()
    .from(challengeAttempt)
    .where(
      and(
        eq(challengeAttempt.challengeId, id),
        eq(challengeAttempt.userId, session.user.id),
        isNotNull(challengeAttempt.finishedAt),
      ),
    )
    .limit(1);

  if (!attempt) {
    throw createError({ statusCode: 404, statusMessage: "No completed attempt found" });
  }

  const [ch] = await db
    .select()
    .from(challenge)
    .where(eq(challenge.id, id))
    .limit(1);

  if (!ch) {
    throw createError({ statusCode: 404, statusMessage: "Challenge not found" });
  }

  const savedAnswers = await db
    .select()
    .from(challengeAnswer)
    .where(eq(challengeAnswer.attemptId, attempt.id));

  const questions = generateChallengeQuestions({
    challengeId: id,
    hskLevel: ch.hskLevel,
    questionCount: ch.questionCount,
  });

  const answers = questions.map((q) => {
    const saved = savedAnswers.find((a) => a.questionIdx === q.idx);
    const correctOption = q.options.find((o) => o.correct);
    return {
      questionIdx: q.idx,
      hanzi: q.hanzi,
      pinyin: q.pinyin,
      selected: saved?.selected ?? "",
      correctAnswer: correctOption?.label ?? "",
      correct: saved?.correct ?? false,
    };
  });

  return {
    score: attempt.score,
    totalQuestions: ch.questionCount,
    timeMs: attempt.timeMs,
    answers,
  };
});
