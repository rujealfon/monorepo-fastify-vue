-- Seed RBAC system permissions, roles and role assignments --
INSERT INTO "permissions" ("key", "resource", "action", "description")
VALUES
    ('*', 'system', 'all', 'Full system access'),

    ('users.read', 'users', 'read', 'View users'),
    ('users.create', 'users', 'create', 'Create users'),
    ('users.update', 'users', 'update', 'Update users'),
    ('users.delete', 'users', 'delete', 'Delete users'),
    ('users.assign_roles', 'users', 'assign_roles', 'Assign roles to users'),

    ('roles.read', 'roles', 'read', 'View roles'),
    ('roles.create', 'roles', 'create', 'Create roles'),
    ('roles.update', 'roles', 'update', 'Update roles'),
    ('roles.delete', 'roles', 'delete', 'Delete roles'),
    ('roles.assign_permissions', 'roles', 'assign_permissions', 'Assign permissions to roles'),

    ('permissions.read', 'permissions', 'read', 'View permissions'),

    ('profile.read_own', 'profile', 'read_own', 'View own profile'),
    ('profile.update_own', 'profile', 'update_own', 'Update own profile'),

    ('tasks.read', 'tasks', 'read', 'View own tasks'),
    ('tasks.create', 'tasks', 'create', 'Create tasks'),
    ('tasks.update', 'tasks', 'update', 'Update own tasks'),
    ('tasks.delete', 'tasks', 'delete', 'Delete own tasks')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "roles" ("name", "slug", "description", "is_system")
VALUES
    ('Super Admin', 'super-admin', 'Complete system access', TRUE),
    ('Admin', 'admin', 'Administrative access', TRUE),
    ('Standard User', 'standard-user', 'Default application user', TRUE)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'super-admin'
  AND permissions.key = '*'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
    'users.read',
    'users.create',
    'users.update',
    'users.assign_roles',
    'roles.read',
    'permissions.read',
    'profile.read_own',
    'profile.update_own',
    'tasks.read',
    'tasks.create',
    'tasks.update',
    'tasks.delete'
)
WHERE roles.slug = 'admin'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.key IN (
    'profile.read_own',
    'profile.update_own',
    'tasks.read',
    'tasks.create',
    'tasks.update',
    'tasks.delete'
)
WHERE roles.slug = 'standard-user'
ON CONFLICT DO NOTHING;
