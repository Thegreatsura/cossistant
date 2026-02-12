import { describe, expect, it, mock } from "bun:test";
import type { CreateConversationResponseBody } from "@cossistant/types/api/conversation";
import { ConversationStatus } from "@cossistant/types/enums";
import { CossistantClient } from "./client";

describe("CossistantClient.isConversationPending", () => {
	const visitorId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

	it("returns false for null and unknown IDs", () => {
		const client = new CossistantClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});

		expect(client.isConversationPending(null)).toBe(false);
		expect(client.isConversationPending(undefined)).toBe(false);
		expect(client.isConversationPending("conv_unknown")).toBe(false);
	});

	it("returns true after initiateConversation is called", () => {
		const client = new CossistantClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});

		client.setWebsiteContext("site_123", visitorId);
		client.initiateConversation({
			conversationId: "conv_pending",
			visitorId,
			websiteId: "site_123",
		});

		expect(client.isConversationPending("conv_pending")).toBe(true);
	});

	it("returns false after pending conversation is created via sendMessage", async () => {
		const client = new CossistantClient({
			apiUrl: "https://api.example.com",
			publicKey: "pk_test",
		});
		client.setWebsiteContext("site_123", visitorId);

		const originalFetch = globalThis.fetch;
		const createdAt = new Date().toISOString();
		const conversationId = "conv_pending";
		const messageId = "msg_123";

		const fetchMock = mock(async () => {
			const response: CreateConversationResponseBody = {
				conversation: {
					id: conversationId,
					title: "New conversation",
					createdAt,
					updatedAt: createdAt,
					visitorId,
					websiteId: "site_123",
					status: ConversationStatus.OPEN,
					deletedAt: null,
				},
				initialTimelineItems: [
					{
						id: messageId,
						conversationId,
						organizationId: "org_123",
						type: "message",
						text: "Hello",
						parts: [{ type: "text", text: "Hello" }],
						visibility: "public",
						tool: null,
						userId: null,
						visitorId,
						aiAgentId: null,
						createdAt,
						deletedAt: null,
					},
				],
			};

			return new Response(JSON.stringify(response), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		});

		globalThis.fetch = fetchMock as typeof fetch;

		try {
			client.initiateConversation({
				conversationId,
				visitorId,
				websiteId: "site_123",
			});
			expect(client.isConversationPending(conversationId)).toBe(true);

			await client.sendMessage({
				conversationId,
				createIfPending: true,
				item: {
					id: messageId,
					text: "Hello",
					type: "message",
					visibility: "public",
					visitorId,
				},
			});

			expect(client.isConversationPending(conversationId)).toBe(false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
