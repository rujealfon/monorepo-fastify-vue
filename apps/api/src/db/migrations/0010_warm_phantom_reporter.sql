ALTER TABLE "audit_logs" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "request_id" varchar(64);