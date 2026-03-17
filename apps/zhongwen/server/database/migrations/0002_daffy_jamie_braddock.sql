CREATE TABLE "user_known_word" (
	"user_id" text NOT NULL,
	"hanzi" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "user_known_word_user_id_hanzi_pk" PRIMARY KEY("user_id","hanzi")
);
--> statement-breakpoint
ALTER TABLE "user_known_word" ADD CONSTRAINT "user_known_word_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;