import type { ConversationStatus, SyncConversation } from "@cossistant/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { getDatabase } from "../db";

interface UseLocalConversationsOptions {
  websiteSlug: string;
  status?: ConversationStatus;
  limit?: number;
}

interface UseLocalConversationsReturn {
  conversations: SyncConversation[];
  isLoading: boolean;
  error: Error | null;
}

export function useLocalConversations({
  websiteSlug,
  status,
  limit,
}: UseLocalConversationsOptions): UseLocalConversationsReturn {
  const [error, setError] = useState<Error | null>(null);

  const conversations = useLiveQuery(
    async () => {
      try {
        const db = getDatabase(websiteSlug);

        const results = await db.conversations.toArray();

        setError(null);
        return results;
      } catch (err) {
        setError(err as Error);
        return [];
      }
    },
    [websiteSlug],
    []
  );

  return {
    conversations,
    isLoading: conversations === undefined,
    error,
  };
}
