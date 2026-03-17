import { and, count, eq, gte, isNotNull, lte, min, sql } from "drizzle-orm";

import { db } from "../../database";
import { userKnownWord } from "../../database/schema";
import { auth } from "../../lib/auth";

// TODO: review this — streak relies on PostgreSQL DATE() which uses server timezone
/**
 * Counts consecutive review days going backward from today.
 */
function calculateStreak(dateStrings: string[], now: Date): number {
  if (!dateStrings.length) return 0;

  const oneDay = 24 * 60 * 60 * 1000;
  const todayMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const uniqueDays = [
    ...new Set(
      dateStrings.map((d) => {
        const dt = new Date(d);
        return new Date(
          dt.getFullYear(),
          dt.getMonth(),
          dt.getDate(),
        ).getTime();
      }),
    ),
  ].sort((a, b) => b - a);

  const mostRecent = uniqueDays[0]!;
  if (mostRecent !== todayMs && mostRecent !== todayMs - oneDay) {
    return 0;
  }

  let streak = 0;
  let expected = mostRecent;

  for (const day of uniqueDays) {
    if (day === expected) {
      streak++;
      expected -= oneDay;
    } else if (day < expected) {
      break;
    }
  }

  return streak;
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    return { due_today: 0, reviewed_today: 0, streak_days: 0, next_session_at: null };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [dueRow, reviewedRow, nextRow, streakRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(userKnownWord)
      .where(
        and(
          eq(userKnownWord.userId, session.user.id),
          lte(userKnownWord.nextReviewAt, now),
        ),
      ),

    db
      .select({ value: count() })
      .from(userKnownWord)
      .where(
        and(
          eq(userKnownWord.userId, session.user.id),
          gte(userKnownWord.lastReviewedAt, startOfDay),
        ),
      ),

    db
      .select({ value: min(userKnownWord.nextReviewAt) })
      .from(userKnownWord)
      .where(
        and(
          eq(userKnownWord.userId, session.user.id),
          isNotNull(userKnownWord.nextReviewAt),
        ),
      ),

    db
      .select({
        reviewDate: sql<string>`DATE(${userKnownWord.lastReviewedAt})`,
      })
      .from(userKnownWord)
      .where(
        and(
          eq(userKnownWord.userId, session.user.id),
          isNotNull(userKnownWord.lastReviewedAt),
        ),
      )
      .groupBy(sql`DATE(${userKnownWord.lastReviewedAt})`)
      .orderBy(sql`DATE(${userKnownWord.lastReviewedAt}) DESC`)
      .limit(365),
  ]);

  const dueToday = dueRow[0]?.value ?? 0;
  const reviewedToday = reviewedRow[0]?.value ?? 0;
  const nextSessionAt = nextRow[0]?.value ?? null;
  const streakDays = calculateStreak(
    streakRows.map((r) => r.reviewDate),
    now,
  );

  return {
    due_today: dueToday,
    reviewed_today: reviewedToday,
    streak_days: streakDays,
    next_session_at: nextSessionAt,
  };
});
