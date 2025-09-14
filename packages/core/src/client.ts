import type {
	CreateConversationRequestBody,
	CreateConversationResponseBody,
	GetConversationRequest,
	GetConversationResponse,
	ListConversationsRequest,
	ListConversationsResponse,
} from "@cossistant/types/api/conversation";
import type {
	GetMessagesRequest,
	GetMessagesResponse,
	SendMessageRequest,
	SendMessageResponse,
} from "@cossistant/types/api/message";
import { CossistantRestClient } from "./rest-client";
import type { CossistantConfig, PublicWebsiteResponse } from "./types";

export class CossistantClient {
	private restClient: CossistantRestClient;
	private config: CossistantConfig;

	constructor(config: CossistantConfig) {
		this.config = config;
		this.restClient = new CossistantRestClient(config);
	}

	// Configuration updates
	updateConfiguration(config: Partial<CossistantConfig>): void {
		this.config = { ...this.config, ...config };
		this.restClient.updateConfiguration(config);
	}

	// Utility methods
	getConfiguration(): CossistantConfig {
		return { ...this.config };
	}

	// Website information
	async getWebsite(): Promise<PublicWebsiteResponse> {
		return this.restClient.getWebsite();
	}

	setWebsiteContext(websiteId: string, visitorId?: string): void {
		this.restClient.setWebsiteContext(websiteId, visitorId);
	}

	// Conversation management
	async createConversation(
		params?: Partial<CreateConversationRequestBody>,
	): Promise<CreateConversationResponseBody> {
		return this.restClient.createConversation(params);
	}

	async listConversations(
		params?: Partial<ListConversationsRequest>,
	): Promise<ListConversationsResponse> {
		return this.restClient.listConversations(params);
	}

	async getConversation(
		params: GetConversationRequest,
	): Promise<GetConversationResponse> {
		return this.restClient.getConversation(params);
	}

	// Message management
	async getConversationMessages(
		params: GetMessagesRequest,
	): Promise<GetMessagesResponse> {
		return this.restClient.getConversationMessages(params);
	}

	async sendMessage(params: SendMessageRequest): Promise<SendMessageResponse> {
		return this.restClient.sendMessage(params);
	}

	// Cleanup method
	destroy(): void {
		// No cleanup needed for REST client
	}
}
