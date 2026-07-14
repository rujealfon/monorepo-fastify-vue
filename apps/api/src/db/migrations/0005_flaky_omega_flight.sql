CREATE TYPE "public"."policy_effect" AS ENUM('allow', 'deny');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"outcome" varchar(16) NOT NULL,
	"permission" varchar(64),
	"resource_type" varchar(64),
	"resource_id" varchar(128),
	"matched_allow_policy_ids" uuid[] DEFAULT '{}' NOT NULL,
	"matched_deny_policy_ids" uuid[] DEFAULT '{}' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"effect" "policy_effect" NOT NULL,
	"condition" jsonb,
	CONSTRAINT "role_policies_role_permission_effect_unique" UNIQUE("role_id","permission_id","effect")
);
--> statement-breakpoint
INSERT INTO "permissions" ("key", "description") VALUES
	('audit.read', 'View authorization and access-control audit history');--> statement-breakpoint
INSERT INTO "role_policies" ("role_id", "permission_id", "effect", "condition")
SELECT
	"role_id",
	"permission_id",
	'allow',
	CASE WHEN "scope" = 'own' THEN
		'{"type":"compare","field":"task.ownerId","operator":"eq","value":{"type":"field","field":"actor.id"}}'::jsonb
	ELSE NULL END
FROM "role_permissions";--> statement-breakpoint
DROP TABLE "role_permissions" CASCADE;--> statement-breakpoint
ALTER TABLE "role_policies" ADD CONSTRAINT "role_policies_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_policies" ADD CONSTRAINT "role_policies_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_event_type_created_at_idx" ON "audit_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_id_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_permission_idx" ON "audit_events" USING btree ("permission");--> statement-breakpoint
CREATE INDEX "role_policies_permission_id_idx" ON "role_policies" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "role_policies_role_id_idx" ON "role_policies" USING btree ("role_id");--> statement-breakpoint
DROP TYPE "public"."permission_scope";--> statement-breakpoint
CREATE FUNCTION prevent_audit_event_updates() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'audit events are immutable';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_updates();
