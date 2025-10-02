import type {
  CreateConversationRequestBody,
  CreateConversationResponseBody,
  GetConversationRequest,
  GetConversationResponse,
  ListConversationsRequest,
  ListConversationsResponse,
  MarkConversationSeenRequestBody,
  MarkConversationSeenResponseBody,
} from "@cossistant/types/api/conversation";
import type {
  GetMessagesRequest,
  GetMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "@cossistant/types/api/message";
import type { Conversation, Message } from "@cossistant/types/schemas";
import {
  CossistantAPIError,
  type CossistantConfig,
  type PublicWebsiteResponse,
  type UpdateVisitorRequest,
  type VisitorMetadata,
  type VisitorResponse,
} from "./types";
import { generateConversationId } from "./utils";
import { collectVisitorData } from "./visitor-data";
import {
  getExistingVisitorId,
  getVisitorId,
  setVisitorId,
} from "./visitor-tracker";

type VisitorResponsePayload = Omit<
  VisitorResponse,
  "createdAt" | "updatedAt" | "lastSeenAt"
> & {
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
};

export class CossistantRestClient {
  private config: CossistantConfig;
  private baseHeaders: Record<string, string>;
  private publicKey: string;
  private websiteId: string | null = null;
  private visitorId: string | null = null;

  constructor(config: CossistantConfig) {
    this.config = config;

    // Get public key from config or environment variables
    this.publicKey =
      config.publicKey ||
      (typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_COSSISTANT_KEY
        : undefined) ||
      (typeof process !== "undefined"
        ? process.env.COSSISTANT_PUBLIC_KEY
        : undefined) ||
      "";

    if (!this.publicKey) {
      throw new Error(
        "Public key is required. Please provide it in the config or set NEXT_PUBLIC_COSSISTANT_KEY or COSSISTANT_PUBLIC_KEY environment variable."
      );
    }

    this.baseHeaders = {
      "Content-Type": "application/json",
      "X-Public-Key": this.publicKey,
    };

    if (config.userId) {
      this.baseHeaders["X-User-ID"] = config.userId;
    }

    if (config.organizationId) {
      this.baseHeaders["X-Organization-ID"] = config.organizationId;
    }
  }

  private normalizeVisitorResponse(
    payload: VisitorResponsePayload
  ): VisitorResponse {
    return {
      ...payload,
      createdAt: new Date(payload.createdAt),
      updatedAt: new Date(payload.updatedAt),
      lastSeenAt: payload.lastSeenAt ? new Date(payload.lastSeenAt) : null,
    };
  }

  private resolveVisitorId(): string {
    if (this.visitorId) {
      return this.visitorId;
    }

    if (this.websiteId) {
      const storedVisitorId = getVisitorId(this.websiteId);
      if (storedVisitorId) {
        this.visitorId = storedVisitorId;
        return storedVisitorId;
      }
    }

    throw new Error("Visitor ID is required");
  }

  private async syncVisitorSnapshot(visitorId: string): Promise<void> {
    try {
      const visitorData = await collectVisitorData();
      if (!visitorData) {
        return;
      }

      const payload = Object.entries(visitorData).reduce<
        Partial<UpdateVisitorRequest>
      >((acc, [key, value]) => {
        if (value === null || value === undefined) {
          return acc;
        }
        (acc as Record<string, unknown>)[key] = value;
        return acc;
      }, {});

      if (Object.keys(payload).length === 0) {
        return;
      }

      await this.request<VisitorResponsePayload>(`/visitors/${visitorId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: {
          "X-Visitor-Id": visitorId,
        },
      });
    } catch (error) {
      if (
        typeof console !== "undefined" &&
        typeof console.warn === "function"
      ) {
        console.warn("Failed to sync visitor data", error);
      }
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.baseHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new CossistantAPIError({
        code: errorData.code || `HTTP_${response.status}`,
        message: errorData.message || response.statusText,
        details: errorData.details,
      });
    }

    return response.json();
  }

  async getWebsite(): Promise<PublicWebsiteResponse> {
    // Make the request with visitor ID if we have one stored
    const headers: Record<string, string> = {};

    // First, check if we already know the website ID and have a visitor ID for it
    if (this.websiteId) {
      const storedVisitorId = getVisitorId(this.websiteId);
      if (storedVisitorId) {
        headers["X-Visitor-Id"] = storedVisitorId;
      }
    } else {
      // We don't know the website ID yet, but check if we have any existing visitor
      // This prevents creating duplicate visitors on page refresh
      const existingVisitor = getExistingVisitorId(this.publicKey);
      if (existingVisitor) {
        headers["X-Visitor-Id"] = existingVisitor.visitorId;
        // Pre-populate our local state
        this.websiteId = existingVisitor.websiteId;
        this.visitorId = existingVisitor.visitorId;
      }
    }

    const response = await this.request<PublicWebsiteResponse>("/websites", {
      headers,
    });

    // Store the website ID for future requests
    this.websiteId = response.id;

    // Store the visitor ID if we got one
    if (response.visitor?.id) {
      this.visitorId = response.visitor.id;
      setVisitorId(response.id, response.visitor.id);
      this.syncVisitorSnapshot(response.visitor.id);
    }

    return response;
  }

  // Manually prime website and visitor context when the caller already has it
  setWebsiteContext(websiteId: string, visitorId?: string): void {
    this.websiteId = websiteId;
    if (visitorId) {
      this.visitorId = visitorId;
      setVisitorId(websiteId, visitorId);
    }
  }

  getCurrentWebsiteId(): string | null {
    return this.websiteId;
  }

  getCurrentVisitorId(): string | null {
    if (this.visitorId) {
      return this.visitorId;
    }

    if (!this.websiteId) {
      return null;
    }

    return getVisitorId(this.websiteId) ?? null;
  }

  async updateVisitorMetadata(
    metadata: VisitorMetadata
  ): Promise<VisitorResponse> {
    const visitorId = this.resolveVisitorId();
    const response = await this.request<VisitorResponsePayload>(
      `/visitors/${visitorId}/metadata`,
      {
        method: "PATCH",
        body: JSON.stringify({ metadata }),
        headers: {
          "X-Visitor-Id": visitorId,
        },
      }
    );

    return this.normalizeVisitorResponse(response);
  }

  async createConversation(
    params: Partial<CreateConversationRequestBody> = {}
  ): Promise<CreateConversationResponseBody> {
    const conversationId = params.conversationId || generateConversationId();

    // Get visitor ID from storage if we have the website ID, or use the provided one
    const storedVisitorId = this.websiteId
      ? getVisitorId(this.websiteId)
      : undefined;
    const visitorId = params.visitorId || storedVisitorId;

    if (!visitorId) {
      throw new Error("Visitor ID is required");
    }

    const body: CreateConversationRequestBody = {
      conversationId,
      visitorId,
      externalVisitorId: params.externalVisitorId,
      defaultMessages: params.defaultMessages || [],
      channel: params.channel || "widget",
    };

    // Add visitor ID header if available
    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const response = await this.request<{
      conversation: {
        id: string;
        title?: string;
        createdAt: string;
        updatedAt: string;
        visitorId: string;
        websiteId: string;
        status: string;
      };
      initialMessages: Array<{
        id: string;
        bodyMd: string;
        type: string;
        userId: string | null;
        aiAgentId: string | null;
        visitorId: string | null;
        conversationId: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        visibility: string;
      }>;
    }>("/conversations", {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    // Convert date strings to Date objects and ensure proper typing
    return {
      conversation: {
        ...response.conversation,
        createdAt: new Date(response.conversation.createdAt),
        updatedAt: new Date(response.conversation.updatedAt),
      } as Conversation,
      initialMessages: response.initialMessages.map((msg) => ({
        ...msg,
        type: msg.type as Message["type"],
        visibility: msg.visibility as Message["visibility"],
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : null,
      })) as Message[],
    };
  }

  async updateConfiguration(config: Partial<CossistantConfig>): Promise<void> {
    if (config.publicKey) {
      this.publicKey = config.publicKey;
      this.baseHeaders["X-Public-Key"] = config.publicKey;
    }

    if (config.userId) {
      this.baseHeaders["X-User-ID"] = config.userId;
    } else if (config.userId === null) {
      const { "X-User-ID": _, ...rest } = this.baseHeaders;
      this.baseHeaders = rest;
    }

    if (config.organizationId) {
      this.baseHeaders["X-Organization-ID"] = config.organizationId;
    } else if (config.organizationId === null) {
      const { "X-Organization-ID": _, ...rest } = this.baseHeaders;
      this.baseHeaders = rest;
    }

    this.config = { ...this.config, ...config };
  }

  async listConversations(
    params: Partial<ListConversationsRequest> = {}
  ): Promise<ListConversationsResponse> {
    // Get visitor ID from storage if we have the website ID, or use the provided one
    const storedVisitorId = this.websiteId
      ? getVisitorId(this.websiteId)
      : undefined;
    const visitorId = params.visitorId || storedVisitorId;

    if (!(visitorId || params.externalVisitorId)) {
      throw new Error("Visitor ID or external visitor ID is required");
    }

    // Create query parameters
    const queryParams = new URLSearchParams();

    if (visitorId) {
      queryParams.set("visitorId", visitorId);
    }

    if (params.externalVisitorId) {
      queryParams.set("externalVisitorId", params.externalVisitorId);
    }

    if (params.page) {
      queryParams.set("page", params.page.toString());
    }

    if (params.limit) {
      queryParams.set("limit", params.limit.toString());
    }

    if (params.status) {
      queryParams.set("status", params.status);
    }

    if (params.orderBy) {
      queryParams.set("orderBy", params.orderBy);
    }

    if (params.order) {
      queryParams.set("order", params.order);
    }

    // Add visitor ID header if available
    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const response = await this.request<{
      conversations: Array<{
        id: string;
        title?: string;
        createdAt: string;
        updatedAt: string;
        visitorId: string;
        websiteId: string;
        status: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
      };
    }>(`/conversations?${queryParams.toString()}`, {
      headers,
    });

    // Convert date strings to Date objects and ensure proper typing
    return {
      conversations: response.conversations.map((conv) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
      })) as Conversation[],
      pagination: response.pagination,
    };
  }

  async getConversation(
    params: GetConversationRequest
  ): Promise<GetConversationResponse> {
    // Get visitor ID from storage if we have the website ID
    const visitorId = this.websiteId ? getVisitorId(this.websiteId) : undefined;

    // Add visitor ID header if available
    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const response = await this.request<{
      conversation: {
        id: string;
        title?: string;
        createdAt: string;
        updatedAt: string;
        visitorId: string;
        websiteId: string;
        status: string;
      };
    }>(`/conversations/${params.conversationId}`, {
      headers,
    });

    // Convert date strings to Date objects and ensure proper typing
    return {
      conversation: {
        ...response.conversation,
        createdAt: new Date(response.conversation.createdAt),
        updatedAt: new Date(response.conversation.updatedAt),
      } as Conversation,
    };
  }

  async markConversationSeen(
    params: {
      conversationId: string;
    } & Partial<MarkConversationSeenRequestBody>
  ): Promise<MarkConversationSeenResponseBody> {
    const storedVisitorId = this.websiteId
      ? getVisitorId(this.websiteId)
      : undefined;
    const visitorId = params.visitorId || storedVisitorId;

    if (!(visitorId || params.externalVisitorId)) {
      throw new Error(
        "Visitor ID or external visitor ID is required to mark a conversation as seen"
      );
    }

    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const body: MarkConversationSeenRequestBody = {};
    if (params.visitorId) {
      body.visitorId = params.visitorId;
    }

    if (params.externalVisitorId) {
      body.externalVisitorId = params.externalVisitorId;
    }

    const response = await this.request<{
      conversationId: string;
      lastSeenAt: string;
    }>(`/conversations/${params.conversationId}/seen`, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });

    return {
      conversationId: response.conversationId,
      lastSeenAt: new Date(response.lastSeenAt),
    };
  }

  async getConversationMessages(
    params: GetMessagesRequest
  ): Promise<GetMessagesResponse> {
    // Get visitor ID from storage if we have the website ID
    const visitorId = this.websiteId ? getVisitorId(this.websiteId) : undefined;

    // Create query parameters
    const queryParams = new URLSearchParams();
    queryParams.set("conversationId", params.conversationId);

    if (params.limit) {
      queryParams.set("limit", params.limit.toString());
    }

    if (params.cursor) {
      queryParams.set("cursor", params.cursor);
    }

    // Add visitor ID header if available
    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const response = await this.request<{
      messages: Array<{
        id: string;
        bodyMd: string;
        type: string;
        userId: string | null;
        aiAgentId: string | null;
        visitorId: string | null;
        conversationId: string;
        organizationId: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        visibility: string;
      }>;
      nextCursor?: string;
      hasNextPage: boolean;
    }>(`/messages?${queryParams.toString()}`, {
      headers,
    });

    // Convert date strings to Date objects and ensure proper typing
    return {
      messages: response.messages.map((msg) => ({
        ...msg,
        type: msg.type as Message["type"],
        visibility: msg.visibility as Message["visibility"],
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : null,
        parentMessageId: null,
        modelUsed: null,
      })) as Message[],
      nextCursor: response.nextCursor,
      hasNextPage: response.hasNextPage,
    };
  }

  async sendMessage(params: SendMessageRequest): Promise<SendMessageResponse> {
    // Get visitor ID from storage if we have the website ID
    const visitorId = this.websiteId ? getVisitorId(this.websiteId) : undefined;

    // Add visitor ID header if available
    const headers: Record<string, string> = {};
    if (visitorId) {
      headers["X-Visitor-Id"] = visitorId;
    }

    const response = await this.request<{
      message: {
        id: string;
        bodyMd: string;
        type: string;
        userId: string | null;
        aiAgentId: string | null;
        visitorId: string | null;
        conversationId: string;
        organizationId: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        visibility: string;
      };
    }>("/messages", {
      method: "POST",
      body: JSON.stringify(params),
      headers,
    });

    // Convert date strings to Date objects and ensure proper typing
    return {
      message: {
        ...response.message,
        type: response.message.type as Message["type"],
        visibility: response.message.visibility as Message["visibility"],
        createdAt: new Date(response.message.createdAt),
        updatedAt: new Date(response.message.updatedAt),
        deletedAt: response.message.deletedAt
          ? new Date(response.message.deletedAt)
          : null,
        parentMessageId: null,
        modelUsed: null,
      } as Message,
    };
  }
}
