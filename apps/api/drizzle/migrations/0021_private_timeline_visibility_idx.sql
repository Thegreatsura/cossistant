DROP INDEX IF EXISTS "conversation_timeline_item_org_conv_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_timeline_item_org_conv_visibility_idx"
    ON "conversation_timeline_item" USING btree ("organization_id","conversation_id","visibility");--> statement-breakpoint
