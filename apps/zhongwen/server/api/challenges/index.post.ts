import { eq } from "drizzle-orm";

import { db } from "../../database";
import { challenge, challengeParticipant } from "../../database/schema";
import { auth } from "../../lib/auth";
import { generateInviteCode } from "../../lib/generateInviteCode";

type Body = {
  title: string;
  description?: string;
  hskLevel: number;
  mode?: string;
  questionCount?: number;
  timeLimitSec?: number;
  startsAt: string;
  endsAt: string;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as HeadersInit,
  });

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<Body>(event);

  if (!body.title?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Title is required" });
  }

  const hskLevel = body.hskLevel;
  if (!Number.isInteger(hskLevel) || hskLevel < 1 || hskLevel > 6) {
    throw createError({ statusCode: 400, statusMessage: "hskLevel must be 1–6" });
  }

  const questionCount = body.questionCount ?? 20;
  if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 50) {
    throw createError({ statusCode: 400, statusMessage: "questionCount must be 5–50" });
  }

  const timeLimitSec = body.timeLimitSec ?? 15;
  if (!Number.isInteger(timeLimitSec) || timeLimitSec < 5 || timeLimitSec > 60) {
    throw createError({ statusCode: 400, statusMessage: "timeLimitSec must be 5–60" });
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: "Invalid date format" });
  }

  if (startsAt >= endsAt) {
    throw createError({ statusCode: 400, statusMessage: "startsAt must be before endsAt" });
  }

  if (endsAt <= new Date()) {
    throw createError({ statusCode: 400, statusMessage: "endsAt must be in the future" });
  }

  let inviteCode = generateInviteCode();
  const MAX_RETRIES = 10;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const existing = await db
      .select({ id: challenge.id })
      .from(challenge)
      .where(eq(challenge.inviteCode, inviteCode))
      .limit(1);
    if (existing.length === 0) {
      break;
    }
    inviteCode = generateInviteCode();
    if (i === MAX_RETRIES - 1) {
      throw createError({
        statusCode: 500,
        statusMessage: "Could not generate unique invite code",
      });
    }
  }

  const now = new Date();
  const id = crypto.randomUUID();

  await db.insert(challenge).values({
    id,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    hskLevel,
    mode: body.mode ?? "vocab_mcq",
    questionCount,
    timeLimitSec,
    startsAt,
    endsAt,
    createdBy: session.user.id,
    inviteCode,
    createdAt: now,
  });

  await db.insert(challengeParticipant).values({
    challengeId: id,
    userId: session.user.id,
    joinedAt: now,
  });

  return { id, inviteCode };
});
