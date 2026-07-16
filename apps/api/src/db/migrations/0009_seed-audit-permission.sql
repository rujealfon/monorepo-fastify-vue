-- Seed the audit.read permission and grant it to the admin role --
INSERT INTO "permissions" ("key", "resource", "action", "description")
VALUES ('audit.read', 'audit', 'read', 'View audit logs')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key = 'audit.read'
WHERE roles.slug = 'admin'
ON CONFLICT DO NOTHING;
