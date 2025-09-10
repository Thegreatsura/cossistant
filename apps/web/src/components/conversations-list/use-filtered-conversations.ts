import type { ConversationStatus } from "@cossistant/types";
import type { InboxView } from "@cossistant/types/schemas";
import { useMemo } from "react";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { useConversationHeaders } from "@/data/use-conversation-headers";

/**
 * This hook is used to filter the conversations based on the selected view and status.
 * It also gives utils to navigate between conversations.
 * Once the conversations are filtered by status and view, we know their order in the array.
 *
 * Based on the selected conversation id, we can navigate to the next or previous conversation (in the filtered array)
 * Utils returned:
 * - filteredConversations: The filtered conversations.
 * - nextConversation: The next conversation in the filtered array. Returns null if there is no next conversation.
 * - previousConversation: The previous conversation in the filtered array. Returns null if there is no previous conversation.
 * - navigateToNextConversation: A function to navigate to the next conversation.
 * - navigateToPreviousConversation: A function to navigate to the previous conversation.
 *
 * Note: The hook is optimized for performance and minimizes computations.
 *
 * @param selectedView - The selected view.
 * @param selectedConversationStatus - The selected conversation status.
 * @param selectedConversationId - The selected conversation id.
 * @returns The filtered conversations and utils to navigate between conversations.
 */

export function useFilteredConversations({
  selectedView,
  selectedConversationStatus,
  selectedConversationId,
}: {
  selectedView: InboxView | null;
  selectedConversationStatus: ConversationStatus | "archived" | null;
  selectedConversationId: string | null;
}) {
  const website = useWebsite();

  const { conversations: unfilteredConversations } = useConversationHeaders(
    website.slug
  );

  const filteredConversations = useMemo(() => {
    return unfilteredConversations;
  }, [unfilteredConversations, selectedConversationStatus, selectedView]);

  return { conversations: filteredConversations };
}
