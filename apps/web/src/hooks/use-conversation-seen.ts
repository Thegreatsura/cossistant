import { generateULID } from "@api/utils/db/ids";
import type { ConversationSeen } from "@cossistant/types/schemas";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

type UseConversationSeenOptions = {
	initialData?: ConversationSeen[];
};

/**
 * Dashboard-specific hook for managing conversation seen state using React Query.
 * This replaces the widget's Zustand-based useConversationSeen hook.
 */
export function useConversationSeen(
	conversationId: string | null | undefined,
	options: UseConversationSeenOptions = {}
): ConversationSeen[] {
	const { initialData } = options;
	const queryClient = useQueryClient();
	const hasInitializedRef = useRef<string | null>(null);

	// Store seen data in React Query cache
	const queryKey = ["conversation-seen", conversationId];

	// Initialize with data from conversation header only once per conversation
	useEffect(() => {
		if (!conversationId) {
			hasInitializedRef.current = null;
			return;
		}

		// Only initialize once per conversation
		if (hasInitializedRef.current === conversationId) {
			return;
		}

		if (initialData && initialData.length > 0) {
			queryClient.setQueryData(queryKey, initialData);
			hasInitializedRef.current = conversationId;
		}
	}, [conversationId, queryClient]); // Don't include initialData to prevent re-initialization

	// Use useQuery to make the component reactive to cache changes
	const { data } = useQuery({
		queryKey,
		queryFn: () => {
			// Return what's already in cache, never fetch from server
			return (
				queryClient.getQueryData<ConversationSeen[]>(queryKey) ??
				initialData ??
				[]
			);
		},
		enabled: !!conversationId,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	return data ?? initialData ?? [];
}

/**
 * Helper to update conversation seen data in React Query cache.
 * Used by the real-time event handler.
 */
export function updateConversationSeenInCache(
	queryClient: ReturnType<typeof useQueryClient>,
	conversationId: string,
	payload: {
		userId?: string | null;
		visitorId?: string | null;
		aiAgentId?: string | null;
		lastSeenAt: string;
	}
) {
	const queryKey = ["conversation-seen", conversationId];

	// Get current data or empty array
	const currentData =
		queryClient.getQueryData<ConversationSeen[]>(queryKey) ?? [];
	const updated = [...currentData];

	// Find the index of the actor's seen entry
	const index = updated.findIndex((s) => {
		if (payload.userId) {
			return s.userId === payload.userId;
		}
		if (payload.visitorId) {
			return s.visitorId === payload.visitorId;
		}
		if (payload.aiAgentId) {
			return s.aiAgentId === payload.aiAgentId;
		}
		return false;
	});

	const seenEntry: ConversationSeen = {
		id: index >= 0 && updated[index] ? updated[index].id : generateULID(),
		conversationId,
		userId: payload.userId || null,
		visitorId: payload.visitorId || null,
		aiAgentId: payload.aiAgentId || null,
		lastSeenAt: payload.lastSeenAt,
		createdAt:
			index >= 0 && updated[index]
				? updated[index].createdAt
				: payload.lastSeenAt,
		updatedAt: payload.lastSeenAt,
		deletedAt: null,
	};

	if (index >= 0) {
		// Update existing entry
		updated[index] = seenEntry;
	} else {
		// Add new entry
		updated.push(seenEntry);
	}

	// Set the new data and invalidate the query to trigger re-renders
	queryClient.setQueryData(queryKey, updated);

	// Invalidate to ensure all components using this query re-render
	queryClient.invalidateQueries({ queryKey, exact: true });
}
