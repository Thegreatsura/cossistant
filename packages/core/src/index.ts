export type {
	CossistantConfig,
	CossistantError,
	Message,
	PublicWebsiteResponse,
} from "@cossistant/types";

export { conversationSchema, messageSchema } from "@cossistant/types";
export { CossistantClient, CossistantClient as default } from "./client";
export { CossistantRestClient } from "./rest-client";
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
