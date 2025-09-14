import type { Database } from "@api/db";
import { user } from "@api/db/schema";
import { eq } from "drizzle-orm";

export async function updateUserLastSeen(
	db: Database,
	userId: string,
): Promise<void> {
	await db
		.update(user)
		.set({
			lastSeenAt: new Date(),
		})
		.where(eq(user.id, userId))
		.execute();
}

export async function getUserLastSeen(
	db: Database,
	userId: string,
): Promise<Date | null> {
	const result = await db
		.select({ lastSeenAt: user.lastSeenAt })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	return result[0]?.lastSeenAt ?? null;
}
