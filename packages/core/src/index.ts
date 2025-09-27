export type {
	CossistantConfig,
	CossistantError,
	Message,
	PublicWebsiteResponse,
} from "@cossistant/types";

export { conversationSchema, messageSchema } from "@cossistant/types";
export { CossistantClient, CossistantClient as default } from "./client";
export { CossistantRestClient } from "./rest-client";
export {
        createConversationsStore,
        getConversationById,
        getConversationPagination,
        getConversations,
        type ConversationPagination,
        type ConversationsState,
        type ConversationsStore,
} from "./store/conversations-store";
export {
        createMessagesStore,
        getConversationMessages,
        type ConversationMessagesState,
        type MessagesState,
        type MessagesStore,
} from "./store/messages-store";
export {
        createWebsiteStore,
        getWebsiteState,
        type WebsiteError,
        type WebsiteState,
        type WebsiteStatus,
        type WebsiteStore,
} from "./store/website-store";
// Core-specific exports
export { CossistantAPIError } from "./types";
// Utility exports
export { generateConversationId, generateMessageId } from "./utils";
export { collectVisitorData, type VisitorData } from "./visitor-data";
export {
	clearAllVisitorIds,
	clearVisitorId,
	getVisitorId,
	setVisitorId,
} from "./visitor-tracker";
// WebSocket client removed - use React WebSocket context instead
