CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"subject" varchar(100) NOT NULL,
	"conditions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"rank" integer NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_action_subject_idx" ON "role_permissions" USING btree ("role_id","action","subject");--> statement-breakpoint
INSERT INTO "roles" ("name", "slug", "rank", "is_system") VALUES
	('Standard User', 'user', 10, true),
	('Admin', 'admin', 20, true),
	('Super Admin', 'super_admin', 30, true)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "action", "subject")
SELECT r."id", p."action", p."subject"
FROM "roles" r
JOIN (VALUES
	('super_admin', 'manage', 'all'),
	('admin', 'read', 'User'),
	('admin', 'update', 'User'),
	('admin', 'delete', 'User'),
	('admin', 'read', 'Role')
) AS p("slug", "action", "subject") ON p."slug" = r."slug"
ON CONFLICT ("role_id", "action", "subject") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" uuid;--> statement-breakpoint
UPDATE "users" SET "role_id" = (SELECT "id" FROM "roles" WHERE "slug" = 'user') WHERE "role_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;
