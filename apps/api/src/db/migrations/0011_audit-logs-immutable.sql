-- Audit log rows are append-only evidence: block in-place edits at the database level.
-- DELETE stays allowed so retention pruning and test cleanup keep working.
-- pg_trigger_depth() > 1 means the update was cascaded by another trigger — e.g. the
-- ON DELETE SET NULL foreign key on actor_id when a user is deleted; direct updates are depth 1.
CREATE OR REPLACE FUNCTION audit_logs_block_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs rows are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION audit_logs_block_update();
