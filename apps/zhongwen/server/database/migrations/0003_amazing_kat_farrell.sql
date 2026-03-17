CREATE TABLE "challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"hsk_level" integer NOT NULL,
	"mode" text DEFAULT 'vocab_mcq' NOT NULL,
	"question_count" integer DEFAULT 20 NOT NULL,
	"time_limit_sec" integer DEFAULT 15 NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "challenge_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "challenge_answer" (
	"attempt_id" text NOT NULL,
	"question_idx" integer NOT NULL,
	"hanzi" text NOT NULL,
	"selected" text NOT NULL,
	"correct" boolean NOT NULL,
	"time_ms" integer NOT NULL,
	CONSTRAINT "challenge_answer_attempt_id_question_idx_pk" PRIMARY KEY("attempt_id","question_idx")
);
--> statement-breakpoint
CREATE TABLE "challenge_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"time_ms" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "challenge_participant" (
	"challenge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp NOT NULL,
	CONSTRAINT "challenge_participant_challenge_id_user_id_pk" PRIMARY KEY("challenge_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "user_known_word" ADD COLUMN "next_review_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_known_word" ADD COLUMN "ease_factor" real DEFAULT 2.5;--> statement-breakpoint
ALTER TABLE "user_known_word" ADD COLUMN "interval_days" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user_known_word" ADD COLUMN "repetitions" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_known_word" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_answer" ADD CONSTRAINT "challenge_answer_attempt_id_challenge_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."challenge_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_attempt" ADD CONSTRAINT "challenge_attempt_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_attempt" ADD CONSTRAINT "challenge_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participant" ADD CONSTRAINT "challenge_participant_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participant" ADD CONSTRAINT "challenge_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;