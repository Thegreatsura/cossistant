export * from "./api";
export * from "./enums";
export * from "./realtime-events";
export type { Conversation, ConversationEvent, Message } from "./schemas";
export {
	conversationEventSchema,
	conversationSchema,
	messageSchema,
} from "./schemas";
export * from "./sync";

export type CossistantConfig = {
	apiUrl: string;
	wsUrl: string;
	apiKey?: string;
	publicKey?: string;
	userId?: string;
	organizationId?: string;
};

export type CossistantError = {
	code: string;
	message: string;
	details?: Record<string, unknown>;
};
