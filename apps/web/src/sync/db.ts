import type { SyncConversation } from "@cossistant/types";
import Dexie, { type EntityTable } from "dexie";

// Database interface with typed tables
interface SyncDatabase extends Dexie {
  conversations: EntityTable<SyncConversation, "id">;
}

// Store database instances per website slug
const databases = new Map<string, SyncDatabase>();

export function getDatabase(websiteSlug: string): SyncDatabase {
  // Return existing database if already created
  const existingDb = databases.get(websiteSlug);
  if (existingDb) {
    return existingDb;
  }

  // Create new database namespaced by website slug
  const db = new Dexie(`cossistant_sync_${websiteSlug}`) as SyncDatabase;

  // Define database schema
  db.version(1).stores({
    conversations: "id, updatedAt, status, visitorId, createdAt",
  });

  // Map the table to the TypeScript type
  // biome-ignore lint/suspicious/noExplicitAny: Dexie requires this for TypeScript mapping
  db.conversations.mapToClass(Object as any);

  // Store the database instance
  databases.set(websiteSlug, db);

  return db;
}

export async function clearDatabase(websiteSlug: string): Promise<void> {
  const db = getDatabase(websiteSlug);
  await db.conversations.clear();
}

export async function getCursorFromDatabase(
  websiteSlug: string
): Promise<string | null> {
  const db = getDatabase(websiteSlug);

  // Get the most recently updated conversation
  const latestConversation = await db.conversations
    .orderBy("updatedAt")
    .reverse()
    .first();

  if (latestConversation?.updatedAt) {
    return latestConversation.updatedAt.toISOString();
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

  // Bulk upsert conversations (update if exists, insert if new)
  await db.conversations.bulkPut(conversations);
}
