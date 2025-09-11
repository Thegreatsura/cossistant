import type { RouterOutputs } from "@api/trpc/types";
import { ConversationStatus } from "@cossistant/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useWebsite } from "@/contexts/website";
import { useConversationHeaders } from "@/data/use-conversation-headers";

type ConversationStatusFilter = ConversationStatus | "archived" | null;

type ConversationHeader =
  RouterOutputs["conversation"]["listConversationsHeaders"]["items"][number];

type FilterResult = {
  conversations: ConversationHeader[];
  conversationMap: Map<string, ConversationHeader>;
  indexMap: Map<string, number>;
  statusCounts: {
    open: number;
    resolved: number;
    spam: number;
    archived: number;
  };
};

/**
 * Count conversations by status
 */
function countStatus(
  conversation: ConversationHeader,
  statusCounts: FilterResult["statusCounts"]
) {
  if (conversation.deletedAt !== null) {
    statusCounts.archived++;
  } else if (conversation.status === ConversationStatus.OPEN) {
    statusCounts.open++;
  } else if (
    conversation.status === ConversationStatus.RESOLVED ||
    conversation.resolvedAt !== null
  ) {
    statusCounts.resolved++;
  } else if (conversation.status === ConversationStatus.SPAM) {
    statusCounts.spam++;
  }
}

/**
 * Check if conversation matches status filter
 */
function matchesStatusFilter(
  conversation: ConversationHeader,
  selectedStatus: ConversationStatusFilter
): boolean {
  if (!selectedStatus) {
    return true;
  }

  switch (selectedStatus) {
    case "open":
      return (
        conversation.status === ConversationStatus.OPEN &&
        !conversation.deletedAt
      );
    case "resolved":
      return (
        (conversation.status === ConversationStatus.RESOLVED ||
          conversation.resolvedAt !== null) &&
        !conversation.deletedAt
      );
    case "spam":
      return (
        conversation.status === ConversationStatus.SPAM &&
        !conversation.deletedAt
      );
    case "archived":
      return conversation.deletedAt !== null;
    default: {
      // Handle enum exhaustiveness
      const _exhaustive: never = selectedStatus;
      return true;
    }
  }
}

/**
 * Single-pass filter and count function optimized for performance
 * This function processes conversations once to:
 * 1. Filter by status and view
 * 2. Count conversations by status
 * 3. Create lookup maps for O(1) access
 */
function filterAndProcessConversations(
  conversations: ConversationHeader[],
  selectedStatus: ConversationStatusFilter,
  selectedViewId: string | null
): FilterResult {
  const statusCounts = { open: 0, resolved: 0, spam: 0, archived: 0 };
  const filteredConversations: ConversationHeader[] = [];
  const conversationMap = new Map<string, ConversationHeader>();
  const indexMap = new Map<string, number>();

  // Single pass through conversations
  for (const conversation of conversations) {
    // Count by status (always count, regardless of filters)
    countStatus(conversation, statusCounts);

    // Check if conversation matches current filters
    const matchesStatus = matchesStatusFilter(conversation, selectedStatus);
    const matchesViewFilter =
      !selectedViewId || conversation.viewIds.includes(selectedViewId);

    // Add to filtered list if matches all filters
    if (matchesStatus && matchesViewFilter) {
      filteredConversations.push(conversation);
    }
  }

  // Sort by lastMessageAt (most recent first) - in-place for efficiency
  filteredConversations.sort((a, b) => {
    const aTime = a.lastMessageAt?.getTime() ?? 0;
    const bTime = b.lastMessageAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  // Build maps after sorting for correct indexes
  for (let i = 0; i < filteredConversations.length; i++) {
    const conversation = filteredConversations[i];
    if (conversation) {
      conversationMap.set(conversation.id, conversation);
      indexMap.set(conversation.id, i);
    }
  }

  return {
    conversations: filteredConversations,
    conversationMap,
    indexMap,
    statusCounts,
  };
}

/**
 * Optimized hook for filtering conversations with O(1) lookups and single-pass computation
 *
 * Performance optimizations:
 * - Single-pass computation for filtering and counting
 * - O(1) lookups using Maps for conversation access
 * - Efficient memoization to prevent unnecessary recalculations
 * - In-place sorting for better memory efficiency
 *
 * @param selectedViewId - The selected view ID
 * @param selectedConversationStatus - The selected conversation status filter
 * @param selectedConversationId - The currently selected conversation ID
 * @param basePath - The base path for navigation
 * @returns Filtered conversations with navigation utilities and O(1) lookup capabilities
 */
export function useFilteredConversations({
  selectedViewId,
  selectedConversationStatus,
  selectedConversationId,
  basePath,
}: {
  selectedViewId: string | null;
  selectedConversationStatus: ConversationStatusFilter;
  selectedConversationId: string | null;
  basePath: string;
}) {
  const website = useWebsite();
  const router = useRouter();

  const { conversations: unfilteredConversations, isLoading } =
    useConversationHeaders(website.slug);

  // Process conversations with single-pass algorithm
  const { conversations, conversationMap, indexMap, statusCounts } = useMemo(
    () =>
      filterAndProcessConversations(
        unfilteredConversations,
        selectedConversationStatus,
        selectedViewId
      ),
    [unfilteredConversations, selectedConversationStatus, selectedViewId]
  );

  // O(1) lookup for current index
  const currentIndex = selectedConversationId
    ? (indexMap.get(selectedConversationId) ?? -1)
    : -1;

  // O(1) navigation helpers
  const nextConversation =
    currentIndex >= 0 && currentIndex < conversations.length - 1
      ? conversations[currentIndex + 1]
      : null;

  const previousConversation =
    currentIndex > 0 ? conversations[currentIndex - 1] : null;

  // Navigation callbacks - only recreate when dependencies change
  const navigateToNextConversation = useCallback(() => {
    if (nextConversation) {
      router.push(`${basePath}/${nextConversation.id}`);
    }
  }, [nextConversation, router, basePath]);

  const navigateToPreviousConversation = useCallback(() => {
    if (previousConversation) {
      router.push(`${basePath}/${previousConversation.id}`);
    }
  }, [previousConversation, router, basePath]);

  // O(1) lookup for checking if conversation is in current filter
  const isConversationInCurrentFilter = useCallback(
    (conversationId: string) => conversationMap.has(conversationId),
    [conversationMap]
  );

  // Get conversation by ID with O(1) lookup
  const getConversationById = useCallback(
    (conversationId: string) => conversationMap.get(conversationId) || null,
    [conversationMap]
  );

  return {
    conversations,
    conversationMap,
    indexMap,
    statusCounts,
    selectedConversationIndex: currentIndex,
    totalCount: conversations.length,
    isLoading,
    // Navigation
    nextConversation,
    previousConversation,
    navigateToNextConversation,
    navigateToPreviousConversation,
    // Utilities
    isConversationInCurrentFilter,
    getConversationById,
  };
}
