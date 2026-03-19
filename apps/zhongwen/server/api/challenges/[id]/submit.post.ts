import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../../database";
import { challenge, challengeAnswer, challengeAttempt } from "../../../database/schema";
import { auth } from "../../../lib/auth";
import { generateChallengeQuestions } from "../../../lib/challengeQuestions";

type AnswerInput = {
  questionIdx: number;
  selected: string;
  timeMs: number;
};

type Body = {
  attemptId: string;
  answers: AnswerInput[];
};

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

  const body = await readBody<Body>(event);

  if (!body.attemptId || !Array.isArray(body.answers)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid request body" });
  }

  const [ch] = await db.select().from(challenge).where(eq(challenge.inviteCode, code)).limit(1);

  if (!ch) {
    throw createError({ statusCode: 404, statusMessage: "Challenge not found" });
  }

  const challengeId = ch.id;

  const [attempt] = await db
    .select()
    .from(challengeAttempt)
    .where(
      and(
        eq(challengeAttempt.id, body.attemptId),
        eq(challengeAttempt.challengeId, challengeId),
        eq(challengeAttempt.userId, session.user.id),
        isNull(challengeAttempt.finishedAt),
      ),
    )
    .limit(1);

  if (!attempt) {
    throw createError({ statusCode: 400, statusMessage: "Attempt not found or already finished" });
  }

  const questions = generateChallengeQuestions({
    challengeId,
    hskLevel: ch.hskLevel,
    questionCount: ch.questionCount,
  });

  let totalScore = 0;
  let totalTimeMs = 0;

  const graded = body.answers.map((ans) => {
    const question = questions.find((q) => q.idx === ans.questionIdx);
    if (!question) {
      return {
        questionIdx: ans.questionIdx,
        hanzi: "",
        pinyin: "",
        selected: ans.selected,
        correctAnswer: "",
        correct: false,
        timeMs: ans.timeMs,
      };
    }

    const correctOption = question.options.find((o) => o.correct);
    const isCorrect = correctOption?.label === ans.selected;

    if (isCorrect) {
      totalScore++;
    }
    totalTimeMs += ans.timeMs;

    return {
      questionIdx: ans.questionIdx,
      hanzi: question.hanzi,
      pinyin: question.pinyin,
      selected: ans.selected,
      correctAnswer: correctOption?.label ?? "",
      correct: isCorrect,
      timeMs: ans.timeMs,
    };
  });

  const answerRows = graded.map((g) => ({
    attemptId: body.attemptId,
    questionIdx: g.questionIdx,
    hanzi: g.hanzi,
    selected: g.selected,
    correct: g.correct,
    timeMs: g.timeMs,
  }));

  if (answerRows.length > 0) {
    await db.insert(challengeAnswer).values(answerRows);
  }

  await db
    .update(challengeAttempt)
    .set({
      score: totalScore,
      timeMs: totalTimeMs,
      finishedAt: new Date(),
    })
    .where(eq(challengeAttempt.id, body.attemptId));

  return {
    score: totalScore,
    totalQuestions: questions.length,
    timeMs: totalTimeMs,
    answers: graded,
  };
});
