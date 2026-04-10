import { and, eq } from "drizzle-orm";

import { db } from "../../database";
import { userKnownWord } from "../../database/schema";
import { auth } from "../../lib/auth";
import { SrsService } from "../../lib/sm2";

type Body = {
  wordId: string;
  grade: number;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<Body>(event);

  if (!body.wordId?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Missing wordId" });
  }

  if (typeof body.grade !== "number" || body.grade < 0 || body.grade > 5) {
    throw createError({ statusCode: 400, statusMessage: "Grade must be 0–5" });
  }

  const result = await db.transaction(async (tx) => {
    const [card] = await tx
      .select({
        easeFactor: userKnownWord.easeFactor,
        intervalDays: userKnownWord.intervalDays,
        repetitions: userKnownWord.repetitions,
      })
      .from(userKnownWord)
      .where(and(eq(userKnownWord.userId, session.user.id), eq(userKnownWord.hanzi, body.wordId)));

    if (!card) {
      throw createError({ statusCode: 404, statusMessage: "Card not found" });
    }

    const srsService = new SrsService();
    const srs = srsService.calculateNextReview(
      {
        ease_factor: card.easeFactor ?? 2.5,
        interval_days: card.intervalDays ?? 1,
        repetitions: card.repetitions ?? 0,
      },
      body.grade,
    );

    await tx
      .update(userKnownWord)
      .set({
        nextReviewAt: srs.next_review_at,
        easeFactor: srs.ease_factor,
        intervalDays: srs.interval_days,
        repetitions: srs.repetitions,
        lastReviewedAt: new Date(),
      })
      .where(and(eq(userKnownWord.userId, session.user.id), eq(userKnownWord.hanzi, body.wordId)));

    return srs;
  });

  return {
    hanzi: body.wordId,
    easeFactor: result.ease_factor,
    intervalDays: result.interval_days,
    repetitions: result.repetitions,
    nextReviewAt: result.next_review_at,
  };
});
