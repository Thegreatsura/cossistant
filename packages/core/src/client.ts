import {
	type AnyRealtimeEvent,
	type DefaultMessage,
	getEventPayload,
	type IdentifyContactResponse,
	type RealtimeEvent,
} from "@cossistant/types";
import type {
	CreateConversationRequestBody,
	CreateConversationResponseBody,
	GetConversationRequest,
	GetConversationResponse,
	ListConversationsRequest,
	ListConversationsResponse,
	MarkConversationSeenRequestBody,
	MarkConversationSeenResponseBody,
	SetConversationTypingResponseBody,
} from "@cossistant/types/api/conversation";
import type {
	SendMessageRequest,
	SendMessageResponse,
} from "@cossistant/types/api/message";
import type {
	GetConversationTimelineItemsRequest,
	GetConversationTimelineItemsResponse,
} from "@cossistant/types/api/timeline-item";
import {
	ConversationStatus,
	MessageType,
	MessageVisibility,
	SenderType,
} from "@cossistant/types/enums";
import type { Conversation, Message } from "@cossistant/types/schemas";
import { CossistantRestClient } from "./rest-client";
import {
	type ConversationsStore,
	createConversationsStore,
} from "./store/conversations-store";
import {
	createTimelineItemsStore,
	type TimelineItemsStore,
} from "./store/timeline-items-store";
import {
	createWebsiteStore,
	type WebsiteState,
	type WebsiteStore,
} from "./store/website-store";
import type {
	CossistantConfig,
	PublicWebsiteResponse,
	VisitorMetadata,
	VisitorResponse,
} from "./types";
import { generateConversationId, generateMessageId } from "./utils";

type PendingConversation = {
	conversation: Conversation;
	initialMessages: Message[];
};

type InitiateConversationParams = {
	conversationId?: string;
	visitorId?: string | null;
	websiteId?: string | null;
	title?: string;
	status?: Conversation["status"];
	defaultMessages?: Array<DefaultMessage | Message>;
};

type InitiateConversationResult = {
	conversationId: string;
	conversation: Conversation;
	defaultMessages: Message[];
};

export class CossistantClient {
	private restClient: CossistantRestClient;
	private config: CossistantConfig;
	private pendingConversations = new Map<string, PendingConversation>();
	private websiteRequest: Promise<PublicWebsiteResponse> | null = null;
	readonly conversationsStore: ConversationsStore;
	readonly timelineItemsStore: TimelineItemsStore;
	readonly websiteStore: WebsiteStore;

	constructor(config: CossistantConfig) {
		this.config = config;
		this.restClient = new CossistantRestClient(config);
		this.conversationsStore = createConversationsStore();
		this.timelineItemsStore = createTimelineItemsStore();
		this.websiteStore = createWebsiteStore();
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
	async fetchWebsite(
		params: { force?: boolean } = {}
	): Promise<PublicWebsiteResponse> {
		const { force = false } = params;
		const current: WebsiteState = this.websiteStore.getState();

		if (!force) {
			if (current.status === "success" && current.website) {
				return current.website;
			}
			if (this.websiteRequest) {
				return this.websiteRequest;
			}
		}

		this.websiteStore.setLoading();

		const request = this.restClient
			.getWebsite()
			.then((website) => {
				this.websiteStore.setWebsite(website);
				return website;
			})
			.catch((error) => {
				this.websiteStore.setError(error);
				throw error;
			})
			.finally(() => {
				if (this.websiteRequest === request) {
					this.websiteRequest = null;
				}
			});

		this.websiteRequest = request;

		return request;
	}

	async getWebsite(): Promise<PublicWebsiteResponse> {
		return this.fetchWebsite({ force: true });
	}

	setWebsiteContext(websiteId: string, visitorId?: string): void {
		this.restClient.setWebsiteContext(websiteId, visitorId);
	}

	async updateVisitorMetadata(
		metadata: VisitorMetadata
	): Promise<VisitorResponse> {
		return this.restClient.updateVisitorMetadata(metadata);
	}

	async identify(params: {
		externalId?: string;
		email?: string;
		name?: string;
		image?: string;
		metadata?: Record<string, unknown>;
		contactOrganizationId?: string;
	}): Promise<IdentifyContactResponse> {
		return this.restClient.identify(params);
	}

	async updateContactMetadata(
		metadata: Record<string, unknown>
	): Promise<VisitorResponse> {
		return this.restClient.updateContactMetadata(metadata);
	}

	// Conversation management
	initiateConversation(
		params: InitiateConversationParams = {}
	): InitiateConversationResult {
		const conversationId = params.conversationId ?? generateConversationId();
		const now = new Date().toISOString();
		const messages = (params.defaultMessages ?? []).map((message) =>
			normalizeBootstrapMessage(conversationId, message)
		);
		const existing = this.conversationsStore.getState().byId[conversationId];
		const baseVisitorId =
			params.visitorId ?? this.restClient.getCurrentVisitorId() ?? "";
		const baseWebsiteId =
			params.websiteId ?? this.restClient.getCurrentWebsiteId() ?? "";

		const conversation: Conversation = existing
			? {
					...existing,
					title: params.title ?? existing.title,
					status: params.status ?? existing.status,
					updatedAt: now,
					lastMessage: messages.at(-1) ?? existing.lastMessage,
				}
			: {
					id: conversationId,
					title: params.title,
					createdAt: now,
					updatedAt: now,
					visitorId: baseVisitorId,
					websiteId: baseWebsiteId,
					status: params.status ?? ConversationStatus.OPEN,
					lastMessage: messages.at(-1),
				};

		this.conversationsStore.ingestConversation(conversation);

		if (messages.length > 0) {
			// Convert messages to timeline items
			const timelineItems = messages.map((msg) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				organizationId: "", // Not available at this point
				visibility: msg.visibility,
				type: "message" as const,
				text: msg.bodyMd,
				parts: [{ type: "text" as const, text: msg.bodyMd }],
				userId: msg.userId,
				visitorId: msg.visitorId,
				aiAgentId: msg.aiAgentId,
				createdAt: msg.createdAt,
				deletedAt: msg.deletedAt,
			}));

			this.timelineItemsStore.ingestPage(conversationId, {
				items: timelineItems,
				hasNextPage: false,
				nextCursor: undefined,
			});
		}

		if (!existing || this.pendingConversations.has(conversationId)) {
			this.pendingConversations.set(conversationId, {
				conversation,
				initialMessages: messages,
			});
		}

		return {
			conversationId,
			conversation,
			defaultMessages: messages,
		};
	}

	async createConversation(
		params?: Partial<CreateConversationRequestBody>
	): Promise<CreateConversationResponseBody> {
		const response = await this.restClient.createConversation(params);
		this.conversationsStore.ingestConversation(response.conversation);
		return response;
	}

	async listConversations(
		params?: Partial<ListConversationsRequest>
	): Promise<ListConversationsResponse> {
		const response = await this.restClient.listConversations(params);
		this.conversationsStore.ingestList(response);
		return response;
	}

	async getConversation(
		params: GetConversationRequest
	): Promise<GetConversationResponse> {
		const response = await this.restClient.getConversation(params);
		this.conversationsStore.ingestConversation(response.conversation);
		return response;
	}

	async markConversationSeen(
		params: {
			conversationId: string;
		} & Partial<MarkConversationSeenRequestBody>
	): Promise<MarkConversationSeenResponseBody> {
		return this.restClient.markConversationSeen(params);
	}

	async getConversationSeenData(params: { conversationId: string }) {
		return this.restClient.getConversationSeenData(params);
	}

	async setVisitorTyping(params: {
		conversationId: string;
		isTyping: boolean;
		visitorPreview?: string | null;
		visitorId?: string;
	}): Promise<SetConversationTypingResponseBody> {
		return this.restClient.setConversationTyping(params);
	}

	// Timeline items management

	async getConversationTimelineItems(
		params: GetConversationTimelineItemsRequest & { conversationId: string }
	): Promise<GetConversationTimelineItemsResponse> {
		const response = await this.restClient.getConversationTimelineItems(params);
		this.timelineItemsStore.ingestPage(params.conversationId, {
			items: response.items,
			hasNextPage: response.hasNextPage,
			nextCursor: response.nextCursor,
		});
		return response;
	}

	async sendMessage(
		params: SendMessageRequest & { createIfPending?: boolean }
	): Promise<
		SendMessageResponse & {
			conversation?: Conversation;
			initialMessages?: Message[];
			wasConversationCreated?: boolean;
		}
	> {
		const { createIfPending, ...rest } = params;
		const optimisticId = rest.message.id ?? generateMessageId();
		const createdAt = rest.message.createdAt
			? rest.message.createdAt
			: new Date().toISOString();

		const optimisticMessage: Message = {
			id: optimisticId,
			bodyMd: rest.message.bodyMd,
			type: (rest.message.type ?? MessageType.TEXT) as Message["type"],
			userId: rest.message.userId ?? null,
			aiAgentId: rest.message.aiAgentId ?? null,
			parentMessageId: null,
			modelUsed: null,
			visitorId: rest.message.visitorId ?? null,
			conversationId: rest.conversationId,
			createdAt,
			updatedAt: createdAt,
			deletedAt: null,
			visibility: (rest.message.visibility ??
				MessageVisibility.PUBLIC) as Message["visibility"],
		};

		// Add optimistic timeline item
		const optimisticTimelineItem = {
			id: optimisticId,
			conversationId: rest.conversationId,
			organizationId: "", // Not available yet
			visibility: optimisticMessage.visibility,
			type: "message" as const,
			text: optimisticMessage.bodyMd,
			parts: [{ type: "text" as const, text: optimisticMessage.bodyMd }],
			userId: optimisticMessage.userId,
			visitorId: optimisticMessage.visitorId,
			aiAgentId: optimisticMessage.aiAgentId,
			createdAt,
			deletedAt: null,
		};

		this.timelineItemsStore.ingestTimelineItem(optimisticTimelineItem);

		const pending = this.pendingConversations.get(rest.conversationId);

		if (pending && createIfPending !== false) {
			try {
				const response = await this.restClient.createConversation({
					conversationId: rest.conversationId,
					defaultMessages: [...pending.initialMessages, optimisticMessage],
				});

				this.conversationsStore.ingestConversation(response.conversation);
				this.timelineItemsStore.removeTimelineItem(
					rest.conversationId,
					optimisticId
				);
				this.timelineItemsStore.clearConversation(rest.conversationId);

				// Convert initial messages to timeline items
				const timelineItems = response.initialMessages.map((msg) => ({
					id: msg.id,
					conversationId: msg.conversationId,
					organizationId: response.conversation.id, // Use conversation data
					visibility: msg.visibility,
					type: "message" as const,
					text: msg.bodyMd,
					parts: [{ type: "text" as const, text: msg.bodyMd }],
					userId: msg.userId,
					visitorId: msg.visitorId,
					aiAgentId: msg.aiAgentId,
					createdAt: msg.createdAt,
					deletedAt: msg.deletedAt,
				}));

				this.timelineItemsStore.ingestPage(rest.conversationId, {
					items: timelineItems,
					hasNextPage: false,
					nextCursor: undefined,
				});

				this.pendingConversations.delete(rest.conversationId);

				const message =
					response.initialMessages.at(-1) ?? response.initialMessages[0];

				return {
					message: message as Message,
					conversation: response.conversation,
					initialMessages: response.initialMessages,
					wasConversationCreated: true,
				} satisfies SendMessageResponse & {
					conversation: Conversation;
					initialMessages: Message[];
					wasConversationCreated: true;
				};
			} catch (error) {
				this.timelineItemsStore.removeTimelineItem(
					rest.conversationId,
					optimisticId
				);
				throw error;
			}
		}

		const { createdAt: _createdAt, ...restMessage } = rest.message;

		const payload: SendMessageRequest = {
			...rest,
			message: {
				...restMessage,
				id: optimisticId,
			},
		};

		try {
			const response = await this.restClient.sendMessage(payload);

			// Convert response message to timeline item and finalize
			const finalTimelineItem = {
				id: response.message.id,
				conversationId: response.message.conversationId,
				organizationId: response.message.organizationId || "",
				visibility: response.message.visibility,
				type: "message" as const,
				text: response.message.bodyMd,
				parts: [{ type: "text" as const, text: response.message.bodyMd }],
				userId: response.message.userId,
				visitorId: response.message.visitorId,
				aiAgentId: response.message.aiAgentId,
				createdAt: response.message.createdAt,
				deletedAt: response.message.deletedAt,
			};

			this.timelineItemsStore.finalizeTimelineItem(
				rest.conversationId,
				optimisticId,
				finalTimelineItem
			);
			return response;
		} catch (error) {
			this.timelineItemsStore.removeTimelineItem(
				rest.conversationId,
				optimisticId
			);
			throw error;
		}
	}

	handleRealtimeEvent(event: AnyRealtimeEvent): void {
		if (event.type === "conversationCreated") {
			const { conversation, header } = event.payload;

			this.conversationsStore.ingestConversation({
				...conversation,
				lastMessage: conversation.lastMessage ?? undefined,
			});
		} else if (event.type === "messageCreated") {
			// Convert message event to timeline item and ingest
			const timelineItem = this.timelineItemsStore.ingestRealtimeMessage(event);

			// Update conversation with last message
			const existingConversation =
				this.conversationsStore.getState().byId[timelineItem.conversationId];

			if (existingConversation) {
				const lastMessage = {
					id: timelineItem.id || "",
					bodyMd: timelineItem.text || "",
					type: "text" as const,
					userId: timelineItem.userId,
					visitorId: timelineItem.visitorId,
					aiAgentId: timelineItem.aiAgentId,
					conversationId: timelineItem.conversationId,
					organizationId: timelineItem.organizationId,
					websiteId: existingConversation.websiteId,
					parentMessageId: null,
					modelUsed: null,
					visibility: timelineItem.visibility,
					createdAt: timelineItem.createdAt,
					updatedAt: timelineItem.createdAt,
					deletedAt: timelineItem.deletedAt,
				};

				const nextConversation = {
					...existingConversation,
					updatedAt: timelineItem.createdAt,
					lastMessage,
				};

				this.conversationsStore.ingestConversation(nextConversation);
			}
		} else if (event.type === "timelineItemCreated") {
			this.timelineItemsStore.ingestRealtimeTimelineItem(event);
		}
	}

	// Cleanup method
	destroy(): void {
		// No cleanup needed for REST client
	}
}

function normalizeBootstrapMessage(
	conversationId: string,
	message: DefaultMessage | Message
): Message {
	if (isDefaultMessage(message)) {
		const createdAt = new Date().toISOString();

		return {
			id: generateMessageId(),
			bodyMd: message.content,
			type: MessageType.TEXT,
			userId:
				message.senderType === SenderType.TEAM_MEMBER
					? (message.senderId ?? null)
					: null,
			aiAgentId:
				message.senderType === SenderType.AI
					? (message.senderId ?? null)
					: null,
			visitorId:
				message.senderType === SenderType.VISITOR
					? (message.senderId ?? null)
					: null,
			conversationId,
			createdAt,
			updatedAt: createdAt,
			deletedAt: null,
			parentMessageId: null,
			modelUsed: null,
			visibility: MessageVisibility.PUBLIC,
		} satisfies Message;
	}

	const createdAt = message.createdAt
		? message.createdAt
		: new Date().toISOString();
	const updatedAt = message.updatedAt ? message.updatedAt : createdAt;

	return {
		...message,
		id: message.id ?? generateMessageId(),
		conversationId,
		type: (message.type ?? MessageType.TEXT) as Message["type"],
		createdAt,
		updatedAt,
		deletedAt: message.deletedAt ?? null,
		parentMessageId: message.parentMessageId ?? null,
		modelUsed: message.modelUsed ?? null,
		userId: message.userId ?? null,
		aiAgentId: message.aiAgentId ?? null,
		visitorId: message.visitorId ?? null,
		visibility: message.visibility ?? MessageVisibility.PUBLIC,
	} satisfies Message;
}

function isDefaultMessage(
	message: DefaultMessage | Message
): message is DefaultMessage {
	return (message as DefaultMessage).content !== undefined;
}
