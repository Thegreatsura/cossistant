import type { RouterOutputs } from "@api/trpc/types";
import { ConversationStatus } from "@cossistant/types";
import type { InboxView } from "@cossistant/types/schemas";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useWebsite } from "@/contexts/dashboard/website-context";
import { useConversationHeaders } from "@/data/use-conversation-headers";

type ConversationStatusFilter = ConversationStatus | "archived" | null;

type ConversationHeader =
  RouterOutputs["conversation"]["listConversationsHeaders"]["items"][number];

/**
 * Filter functions for different conversation statuses
 */
const filterByStatus = {
  open: (conversation: ConversationHeader) =>
    conversation.status === ConversationStatus.OPEN && !conversation.deletedAt,

  resolved: (conversation: ConversationHeader) =>
    (conversation.status === ConversationStatus.RESOLVED ||
      conversation.resolvedAt !== null) &&
    !conversation.deletedAt,

  spam: (conversation: ConversationHeader) =>
    conversation.status === ConversationStatus.SPAM && !conversation.deletedAt,

  archived: (conversation: ConversationHeader) =>
    conversation.deletedAt !== null,
};

/**
 * Filter conversations by view
 */
const filterByView = (
  conversations: ConversationHeader[],
  viewId: string | null
) => {
  if (!viewId) {
    return conversations;
  }

  return conversations.filter((conversation) =>
    conversation.viewIds.includes(viewId)
  );
};

/**
 * Sort conversations by lastMessageAt (most recent first)
 */
const sortByLastMessage = (conversations: ConversationHeader[]) => {
  return [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() ?? 0;
    const bTime = b.lastMessageAt?.getTime() ?? 0;
    return bTime - aTime; // Descending order (most recent first)
  });
};

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
  selectedConversationStatus: ConversationStatusFilter;
  selectedConversationId: string | null;
}) {
  const website = useWebsite();
  const router = useRouter();

  const { conversations: unfilteredConversations } = useConversationHeaders(
    website.slug
  );

  // Apply filters and sorting
  const filteredConversations = useMemo(() => {
    let result = unfilteredConversations;

    // Filter by status
    if (selectedConversationStatus) {
      const statusFilter = filterByStatus[selectedConversationStatus];
      if (statusFilter) {
        result = result.filter(statusFilter);
      }
    }

    // Filter by view
    result = filterByView(result, selectedView?.id ?? null);

    // Sort by last message
    result = sortByLastMessage(result);

    return result;
  }, [unfilteredConversations, selectedConversationStatus, selectedView]);

  const currentIndex = useMemo(() => {
    if (!selectedConversationId) {
      return -1;
    }

    return filteredConversations.findIndex(
      (c) => c.id === selectedConversationId
    );
  }, [filteredConversations, selectedConversationId]);

  const nextConversation = useMemo(() => {
    if (
      currentIndex === -1 ||
      currentIndex >= filteredConversations.length - 1
    ) {
      return null;
    }
    return filteredConversations[currentIndex + 1];
  }, [currentIndex, filteredConversations]);

  const previousConversation = useMemo(() => {
    if (currentIndex <= 0) {
      return null;
    }
    return filteredConversations[currentIndex - 1];
  }, [currentIndex, filteredConversations]);

  const navigateToNextConversation = useCallback(() => {
    if (nextConversation) {
      router.push(`/${website.slug}/inbox/${nextConversation.id}`);
    }
  }, [nextConversation, router, website.slug]);

  const navigateToPreviousConversation = useCallback(() => {
    if (previousConversation) {
      router.push(`/${website.slug}/inbox/${previousConversation.id}`);
    }
  }, [previousConversation, router, website.slug]);

  const isConversationInCurrentFilter = useCallback(
    (conversationId: string) => {
      return filteredConversations.some((c) => c.id === conversationId);
    },
    [filteredConversations]
  );

  const statusCounts = useMemo(() => {
    return {
      open: unfilteredConversations.filter(filterByStatus.open).length,
      resolved: unfilteredConversations.filter(filterByStatus.resolved).length,
      spam: unfilteredConversations.filter(filterByStatus.spam).length,
      archived: unfilteredConversations.filter(filterByStatus.archived).length,
    };
  }, [unfilteredConversations]);

  return {
    conversations: filteredConversations,
    nextConversation,
    previousConversation,
    navigateToNextConversation,
    navigateToPreviousConversation,
    isConversationInCurrentFilter,
    statusCounts,
    currentIndex,
    totalCount: filteredConversations.length,
  };
}
