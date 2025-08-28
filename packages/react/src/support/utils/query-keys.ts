export const QUERY_KEYS = {
	conversations: () => ["cossistant-conversations"] as const,
	conversation: (conversationId: string | null) => 
		["cossistant-conversation", conversationId] as const,
	messages: (conversationId: string | null) => 
		["cossistant-messages", conversationId] as const,
} as const;