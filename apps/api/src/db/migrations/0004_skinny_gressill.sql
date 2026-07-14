CREATE TYPE "public"."permission_scope" AS ENUM('own', 'all');--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "scope" "permission_scope";--> statement-breakpoint
UPDATE "role_permissions"
SET "scope" = 'own'
FROM "permissions"
WHERE "role_permissions"."permission_id" = "permissions"."id"
	AND "permissions"."key" IN ('tasks.read', 'tasks.update', 'tasks.delete');
