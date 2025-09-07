import type { SyncConversation, SyncMessage } from "@cossistant/types";
import Dexie, { type EntityTable } from "dexie";

interface SyncDatabase extends Dexie {
	conversations: EntityTable<SyncConversation, "id">;
	messages: EntityTable<SyncMessage, "id">;
}

const databases = new Map<string, SyncDatabase>();

export function getDatabase(websiteSlug: string): SyncDatabase {
	const existingDb = databases.get(websiteSlug);
	if (existingDb) {
		return existingDb;
	}

	const db = new Dexie(`cossistant_sync_${websiteSlug}`) as SyncDatabase;

	db.version(1).stores({
		conversations: "id, updatedAt, status, visitorId, createdAt",
		messages: "id, conversationId, updatedAt, createdAt",
	});

	// biome-ignore lint/suspicious/noExplicitAny: Dexie requires this for TypeScript mapping
	db.conversations.mapToClass(Object as any);
	// biome-ignore lint/suspicious/noExplicitAny: Dexie requires this for TypeScript mapping
	db.messages.mapToClass(Object as any);

	databases.set(websiteSlug, db);
	return db;
}

export async function clearDatabase(websiteSlug: string): Promise<void> {
	const db = getDatabase(websiteSlug);
	await Promise.all([db.conversations.clear(), db.messages.clear()]);
}

export async function getCursor(
	websiteSlug: string,
	entity: "conversations" | "messages"
): Promise<string | null> {
	const db = getDatabase(websiteSlug);
	const table = entity === "conversations" ? db.conversations : db.messages;

	const latestItem = await table.orderBy("updatedAt").reverse().first();

	if (latestItem?.updatedAt) {
		return latestItem.updatedAt.toISOString();
	}

	return null;
}

export async function saveConversations(
	websiteSlug: string,
	conversations: SyncConversation[]
): Promise<void> {
	if (conversations.length === 0) {
		return;
	}

	const db = getDatabase(websiteSlug);
	await db.conversations.bulkPut(conversations);
}

export async function saveMessages(
	websiteSlug: string,
	messages: SyncMessage[]
): Promise<void> {
	if (messages.length === 0) {
		return;
	}

	const db = getDatabase(websiteSlug);
	await db.messages.bulkPut(messages);
}