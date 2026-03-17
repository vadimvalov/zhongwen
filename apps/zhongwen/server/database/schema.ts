import { boolean, integer, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const userReadText = pgTable(
  "user_read_text",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    textId: text("text_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.textId] }),
  }),
);

export const userKnownWord = pgTable(
  "user_known_word",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hanzi: text("hanzi").notNull(),
    createdAt: timestamp("created_at").notNull(),
    nextReviewAt: timestamp("next_review_at"),
    easeFactor: real("ease_factor").default(2.5),
    intervalDays: integer("interval_days").default(1),
    repetitions: integer("repetitions").default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.hanzi] }),
  }),
);

export const challenge = pgTable("challenge", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  hskLevel: integer("hsk_level").notNull(),
  mode: text("mode").notNull().default("vocab_mcq"),
  questionCount: integer("question_count").notNull().default(20),
  timeLimitSec: integer("time_limit_sec").notNull().default(15),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
});

export const challengeParticipant = pgTable(
  "challenge_participant",
  {
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenge.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.challengeId, table.userId] }),
  }),
);

export const challengeAttempt = pgTable("challenge_attempt", {
  id: text("id").primaryKey(),
  challengeId: text("challenge_id")
    .notNull()
    .references(() => challenge.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  timeMs: integer("time_ms").notNull().default(0),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
});

export const challengeAnswer = pgTable(
  "challenge_answer",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => challengeAttempt.id, { onDelete: "cascade" }),
    questionIdx: integer("question_idx").notNull(),
    hanzi: text("hanzi").notNull(),
    selected: text("selected").notNull(),
    correct: boolean("correct").notNull(),
    timeMs: integer("time_ms").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.attemptId, table.questionIdx] }),
  }),
);
