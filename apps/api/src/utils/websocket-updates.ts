import type { Database } from "@api/db";
import { updateUserLastSeen } from "@api/db/queries/user";
import { upsertVisitor } from "@api/db/queries/visitor";
import type { WebSocketAuthSuccess as AuthResult } from "@api/ws/socket";

type UpdateTimestampsOptions = {
  db: Database;
  authResult: AuthResult;
};

export async function updateLastSeenTimestamps({
  db,
  authResult,
}: UpdateTimestampsOptions): Promise<void> {
  try {
    // If it's an authenticated user, update their lastSeenAt
    if (authResult.userId) {
      await updateUserLastSeen(db, authResult.userId);
    }

    // If we have a visitor ID and website context, update visitor's lastSeenAt
    if (
      authResult.visitorId &&
      authResult.websiteId &&
      authResult.organizationId
    ) {
      await upsertVisitor(db, {
        websiteId: authResult.websiteId,
        organizationId: authResult.organizationId,
        visitorId: authResult.visitorId,
        isTest: authResult.isTestKey ?? false,
      });
    }
  } catch (error) {
    console.error("[WebSocket] Error updating last seen timestamps:", error);
    // Don't fail the connection if last seen update fails
    // This error is already being handled and logged
  }
}
