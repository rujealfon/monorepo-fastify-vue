-- Additive CASL v7 ABAC cutover. Legacy RBAC tables intentionally remain for rollback. --
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM permissions
    WHERE key NOT IN (
      '*', 'users.read', 'users.create', 'users.update', 'users.delete', 'users.assign_roles',
      'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.assign_permissions',
      'permissions.read', 'profile.read_own', 'profile.update_own',
      'tasks.read', 'tasks.create', 'tasks.update', 'tasks.delete', 'audit.read'
    )
  ) THEN
    RAISE EXCEPTION 'CASL migration aborted: unknown legacy permission keys require an explicit mapping';
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE "ability_rules" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "key" varchar(150) NOT NULL UNIQUE,
  "description" text,
  "effect" varchar(10) NOT NULL,
  "action" varchar(20) NOT NULL,
  "subject" varchar(50) NOT NULL,
  "fields" jsonb,
  "actor_conditions" jsonb,
  "resource_conditions" jsonb,
  "denial_reason" text,
  "priority" integer DEFAULT 0 NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "condition_schema_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "role_ability_rules" (
  "role_id" integer NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "ability_rule_id" integer NOT NULL REFERENCES "ability_rules"("id") ON DELETE CASCADE,
  "assigned_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "role_ability_rules_role_id_ability_rule_id_pk" PRIMARY KEY("role_id", "ability_rule_id")
);--> statement-breakpoint
CREATE INDEX "role_ability_rules_ability_rule_id_idx" ON "role_ability_rules" ("ability_rule_id");--> statement-breakpoint

INSERT INTO ability_rules
  (key, description, effect, action, subject, resource_conditions, priority, is_system)
VALUES
  ('system.manage_all', 'Full system access', 'allow', 'manage', 'all', NULL, 1000000, TRUE),
  ('users.read', 'View users', 'allow', 'read', 'User', NULL, 0, TRUE),
  ('users.create', 'Create users', 'allow', 'create', 'User', NULL, 0, TRUE),
  ('users.update', 'Update users', 'allow', 'update', 'User', NULL, 0, TRUE),
  ('users.delete', 'Delete users', 'allow', 'delete', 'User', NULL, 0, TRUE),
  ('roles.read', 'View roles', 'allow', 'read', 'Role', NULL, 0, TRUE),
  ('roles.create', 'Create roles', 'allow', 'create', 'Role', NULL, 0, TRUE),
  ('roles.update', 'Update roles', 'allow', 'update', 'Role', NULL, 0, TRUE),
  ('roles.delete', 'Delete roles', 'allow', 'delete', 'Role', NULL, 0, TRUE),
  ('ability_rules.read', 'View ability rules', 'allow', 'read', 'AbilityRule', NULL, 0, TRUE),
  ('profile.read_own', 'View own profile', 'allow', 'read', 'Profile', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('profile.update_own', 'Update own profile', 'allow', 'update', 'Profile', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('tasks.read_own', 'View own tasks', 'allow', 'read', 'Task', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('tasks.create_own', 'Create own tasks', 'allow', 'create', 'Task', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('tasks.update_own', 'Update own tasks', 'allow', 'update', 'Task', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('tasks.delete_own', 'Delete own tasks', 'allow', 'delete', 'Task', '{"userId":{"$eq":{"$ref":"actor.id"}}}', 0, TRUE),
  ('audit_logs.read', 'View audit logs', 'allow', 'read', 'AuditLog', NULL, 0, TRUE),
  ('users.assign_roles', 'Update user role assignments', 'allow', 'update', 'User', NULL, 0, TRUE),
  ('roles.assign_standard', 'Assign non-privileged roles', 'allow', 'assign', 'Role', '{"slug":{"$in":["admin","standard-user"]}}', 0, TRUE)
ON CONFLICT (key) DO NOTHING;--> statement-breakpoint

INSERT INTO role_ability_rules (role_id, ability_rule_id)
SELECT r.id, ar.id
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
JOIN ability_rules ar ON ar.key = CASE p.key
  WHEN '*' THEN 'system.manage_all'
  WHEN 'permissions.read' THEN 'ability_rules.read'
  WHEN 'tasks.read' THEN 'tasks.read_own'
  WHEN 'tasks.create' THEN 'tasks.create_own'
  WHEN 'tasks.update' THEN 'tasks.update_own'
  WHEN 'tasks.delete' THEN 'tasks.delete_own'
  WHEN 'audit.read' THEN 'audit_logs.read'
  ELSE p.key
END
WHERE p.key <> 'roles.assign_permissions'
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO role_ability_rules (role_id, ability_rule_id)
SELECT r.id, ar.id
FROM roles r
CROSS JOIN ability_rules ar
WHERE r.slug = 'admin' AND ar.key = 'roles.assign_standard'
ON CONFLICT DO NOTHING;--> statement-breakpoint

UPDATE users SET authorization_version = authorization_version + 1;
