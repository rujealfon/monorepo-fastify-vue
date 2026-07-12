CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'intersex', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"sex" "sex",
	"birth_date" date,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "profiles" ("user_id") SELECT "id" FROM "users";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "display_name";
