CREATE TABLE "user_read_text" (
	"user_id" text NOT NULL,
	"text_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "user_read_text_user_id_text_id_pk" PRIMARY KEY("user_id","text_id")
);
--> statement-breakpoint
ALTER TABLE "user_read_text" ADD CONSTRAINT "user_read_text_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;