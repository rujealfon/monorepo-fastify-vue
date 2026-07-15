-- Convert serial primary keys to SQL-standard identity columns --
ALTER TABLE "permissions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "permissions_id_seq";--> statement-breakpoint
ALTER TABLE "permissions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval('"permissions_id_seq"', COALESCE((SELECT MAX("id") FROM "permissions"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "roles_id_seq";--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval('"roles_id_seq"', COALESCE((SELECT MAX("id") FROM "roles"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE IF EXISTS "tasks_id_seq";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
SELECT setval('"tasks_id_seq"', COALESCE((SELECT MAX("id") FROM "tasks"), 0) + 1, false);
