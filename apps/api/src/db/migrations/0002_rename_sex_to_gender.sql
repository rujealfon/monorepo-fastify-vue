ALTER TYPE "public"."sex" RENAME TO "gender";--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "sex" TO "gender";
