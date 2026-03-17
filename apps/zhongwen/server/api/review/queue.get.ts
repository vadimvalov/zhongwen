import { and, asc, count, eq, lte } from "drizzle-orm";

import { db } from "../../database";
import { userKnownWord } from "../../database/schema";
import { auth } from "../../lib/auth";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    return { cards: [], totalDue: 0 };
  }

  const now = new Date();
  const dueFilter = and(
    eq(userKnownWord.userId, session.user.id),
    lte(userKnownWord.nextReviewAt, now),
  );

  const [cards, [countRow]] = await Promise.all([
    db
      .select({
        hanzi: userKnownWord.hanzi,
        nextReviewAt: userKnownWord.nextReviewAt,
        easeFactor: userKnownWord.easeFactor,
        intervalDays: userKnownWord.intervalDays,
        repetitions: userKnownWord.repetitions,
      })
      .from(userKnownWord)
      .where(dueFilter)
      .orderBy(asc(userKnownWord.nextReviewAt))
      .limit(20),
    db.select({ value: count() }).from(userKnownWord).where(dueFilter),
  ]);

  return { cards, totalDue: countRow?.value ?? 0 };
});
