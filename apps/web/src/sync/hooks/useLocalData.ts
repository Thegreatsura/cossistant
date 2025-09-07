import type { SyncConversation, SyncMessage } from "@cossistant/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { getDatabase } from "../db";

interface UseLocalConversationsOptions {
  websiteSlug: string;
  limit?: number;
}

interface UseLocalMessagesOptions {
  websiteSlug: string;
  conversationId?: string;
  limit?: number;
}

interface UseLocalDataReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
}

export function useLocalConversations({
  websiteSlug,
  limit,
}: UseLocalConversationsOptions): UseLocalDataReturn<SyncConversation> {
  const [error, setError] = useState<Error | null>(null);

  const conversations = useLiveQuery(
    async () => {
      try {
        const db = getDatabase(websiteSlug);
        let query = db.conversations.orderBy("updatedAt").reverse();

        if (limit) {
          query = query.limit(limit);
        }

        const results = await query.toArray();
        setError(null);
        return results;
      } catch (err) {
        setError(err as Error);
        return [];
      }
    },
    [websiteSlug, limit],
    []
  );

  return {
    data: conversations,
    isLoading: conversations === undefined,
    error,
  };
}

export function useLocalMessages({
  websiteSlug,
  conversationId,
  limit,
}: UseLocalMessagesOptions): UseLocalDataReturn<SyncMessage> {
  const [error, setError] = useState<Error | null>(null);

  const messages = useLiveQuery(
    async () => {
      try {
        const db = getDatabase(websiteSlug);
        let query = conversationId
          ? db.messages.where("conversationId").equals(conversationId)
          : db.messages.toCollection();

        if (limit) {
          query = query.limit(limit);
        }

        const results = await query.toArray();
        setError(null);
        return results;
      } catch (err) {
        setError(err as Error);
        return [];
      }
    },
    [websiteSlug, conversationId, limit],
    []
  );

  return {
    data: messages,
    isLoading: messages === undefined,
    error,
  };
}
