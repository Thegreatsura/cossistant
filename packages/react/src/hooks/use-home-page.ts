import type { Conversation } from "@cossistant/types";
import { useCallback, useMemo } from "react";
import { PENDING_CONVERSATION_ID } from "../utils/id";
import { useConversations } from "./use-conversations";

export type UseHomePageOptions = {
  /**
   * Whether to enable conversations fetching.
   * Default: true
   */
  enabled?: boolean;

  /**
   * Callback when user wants to start a new conversation.
   */
  onStartConversation?: (initialMessage?: string) => void;

  /**
   * Callback when user wants to open an existing conversation.
   */
  onOpenConversation?: (conversationId: string) => void;

  /**
   * Callback when user wants to view conversation history.
   */
  onOpenConversationHistory?: () => void;
};

export type UseHomePageReturn = {
  // Conversations data
  conversations: Conversation[];
  isLoading: boolean;
  error: Error | null;

  // Derived state
  lastOpenConversation: Conversation | undefined;
  availableConversationsCount: number;
  hasConversations: boolean;

  // Actions
  startConversation: (initialMessage?: string) => void;
  openConversation: (conversationId: string) => void;
  openConversationHistory: () => void;
};

/**
 * Main hook for the home page of the support widget.
 *
 * This hook:
 * - Fetches and manages conversations list
 * - Derives useful state (last open conversation, conversation counts)
 * - Provides navigation actions for the home page
 *
 * It encapsulates all home page logic, making the component
 * purely presentational.
 *
 * @example
 * ```tsx
 * export function HomePage() {
 *   const home = useHomePage({
 *     onStartConversation: (msg) => {
 *       navigate('conversation', { conversationId: PENDING_CONVERSATION_ID, initialMessage: msg });
 *     },
 *     onOpenConversation: (id) => {
 *       navigate('conversation', { conversationId: id });
 *     },
 *     onOpenConversationHistory: () => {
 *       navigate('conversation-history');
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <h1>How can we help?</h1>
 *
 *       {home.lastOpenConversation && (
 *         <ConversationCard
 *           conversation={home.lastOpenConversation}
 *           onClick={() => home.openConversation(home.lastOpenConversation.id)}
 *         />
 *       )}
 *
 *       <Button onClick={() => home.startConversation()}>
 *         Ask a question
 *       </Button>
 *     </>
 *   );
 * }
 * ```
 */
export function useHomePage(
  options: UseHomePageOptions = {},
): UseHomePageReturn {
  const {
    enabled = true,
    onStartConversation,
    onOpenConversation,
    onOpenConversationHistory,
  } = options;

  // Fetch conversations
  const { conversations, isLoading, error } = useConversations({
    enabled,
    // Fetch most recent conversations first
    orderBy: "updatedAt",
    order: "desc",
  });

  // Derive useful state from conversations
  const { lastOpenConversation, availableConversationsCount } = useMemo(() => {
    // Find the most recent open conversation
    const openConversation = conversations.find(
      (conv) => conv.status === "open",
    );

    // Count other conversations (excluding the one we're showing)
    const otherCount = Math.max((conversations.length || 0) - 1, 0);

    return {
      lastOpenConversation: openConversation,
      availableConversationsCount: otherCount,
    };
  }, [conversations]);

  // Navigation actions
  const startConversation = useCallback(
    (initialMessage?: string) => {
      onStartConversation?.(initialMessage);
    },
    [onStartConversation],
  );

  const openConversation = useCallback(
    (conversationId: string) => {
      onOpenConversation?.(conversationId);
    },
    [onOpenConversation],
  );

  const openConversationHistory = useCallback(() => {
    onOpenConversationHistory?.();
  }, [onOpenConversationHistory]);

  return {
    conversations,
    isLoading,
    error,
    lastOpenConversation,
    availableConversationsCount,
    hasConversations: conversations.length > 0,
    startConversation,
    openConversation,
    openConversationHistory,
  };
}
