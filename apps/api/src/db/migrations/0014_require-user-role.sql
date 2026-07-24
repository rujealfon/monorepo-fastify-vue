-- Backfill existing users and enforce at least one role assignment per user. --
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'standard-user') THEN
    RAISE EXCEPTION 'Cannot enforce user roles: the Standard User role is missing';
  END IF;
END $$;--> statement-breakpoint

INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
CROSS JOIN roles
WHERE roles.slug = 'standard-user'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id
  )
ON CONFLICT DO NOTHING;--> statement-breakpoint

CREATE FUNCTION ensure_inserted_user_has_role() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id) THEN
    RAISE EXCEPTION 'Every user must have at least one role'
      USING ERRCODE = '23514', CONSTRAINT = 'users_require_role';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER users_require_role
AFTER INSERT ON users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_inserted_user_has_role();--> statement-breakpoint

CREATE FUNCTION ensure_existing_user_keeps_role() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id)
    AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = OLD.user_id) THEN
    RAISE EXCEPTION 'Every user must have at least one role'
      USING ERRCODE = '23514', CONSTRAINT = 'users_require_role';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER user_roles_require_role
AFTER DELETE OR UPDATE OF user_id ON user_roles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ensure_existing_user_keeps_role();
