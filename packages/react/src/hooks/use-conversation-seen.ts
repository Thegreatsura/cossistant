import type { ConversationSeen } from "@cossistant/types/schemas";
import { useEffect, useMemo, useRef } from "react";
import { hydrateConversationSeen, useSeenStore } from "../realtime/seen-store";

type UseConversationSeenOptions = {
	initialData?: ConversationSeen[];
};

function buildSeenId(
	conversationId: string,
	actorType: string,
	actorId: string
) {
	return `${conversationId}-${actorType}-${actorId}`;
}

export function useConversationSeen(
	conversationId: string | null | undefined,
	options: UseConversationSeenOptions = {}
): ConversationSeen[] {
	const { initialData } = options;
	const hydratedKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (!(conversationId && initialData) || initialData.length === 0) {
			return;
		}

		const hydrationKey = `${conversationId}:${initialData
			.map((entry) => `${entry.id}:${entry.updatedAt.getTime()}`)
			.join("|")}`;

		if (hydratedKeyRef.current === hydrationKey) {
			return;
		}

		hydrateConversationSeen(conversationId, initialData);
		hydratedKeyRef.current = hydrationKey;
	}, [conversationId, initialData]);

	const conversationSeen = useSeenStore((state) =>
		conversationId ? (state.conversations[conversationId] ?? null) : null
	);

	return useMemo(() => {
		if (!(conversationId && conversationSeen)) {
			return [];
		}

		return Object.values(conversationSeen).map((entry) => {
			return {
				id: buildSeenId(conversationId, entry.actorType, entry.actorId),
				conversationId,
				userId: entry.actorType === "user" ? entry.actorId : null,
				visitorId: entry.actorType === "visitor" ? entry.actorId : null,
				aiAgentId: entry.actorType === "ai_agent" ? entry.actorId : null,
				lastSeenAt: entry.lastSeenAt,
				createdAt: entry.lastSeenAt,
				updatedAt: entry.lastSeenAt,
				deletedAt: null,
			} satisfies ConversationSeen;
		});
	}, [conversationId, conversationSeen]);
}
