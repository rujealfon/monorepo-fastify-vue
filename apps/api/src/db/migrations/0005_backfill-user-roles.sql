-- Give every existing user without any role the default Standard User role --
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT users.id, roles.id
FROM users
CROSS JOIN roles
WHERE roles.slug = 'standard-user'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id
  )
ON CONFLICT DO NOTHING;
