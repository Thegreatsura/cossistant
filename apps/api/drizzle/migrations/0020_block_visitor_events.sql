ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'visitor_blocked';
ALTER TYPE "public"."conversation_event_type" ADD VALUE IF NOT EXISTS 'visitor_unblocked';
