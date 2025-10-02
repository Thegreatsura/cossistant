import { beforeEach, describe, expect, it, mock } from "bun:test";

const sendMessagesMock = mock(async () => [
	{
		id: "msg-1",
		bodyMd: "hello there",
		type: "text",
		userId: "user-1",
		aiAgentId: null,
		visitorId: null,
		conversationId: "conv-1",
		organizationId: "org-1",
		websiteId: "site-1",
		parentMessageId: null,
		modelUsed: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		visibility: "public",
	},
]);

const sendToWebsiteMock = mock(() => {});
const sendToVisitorMock = mock(() => {});
const getConversationByIdMock = mock(async () => ({
	visitorId: "visitor-from-db",
}));

mock.module("@api/db/queries/message", () => ({
	sendMessages: sendMessagesMock,
}));

mock.module("@api/db/queries/conversation", () => ({
	getConversationById: getConversationByIdMock,
}));

mock.module("@api/ws/socket", () => ({
	sendEventToConnection: () => {},
	sendEventToVisitor: sendToVisitorMock,
	sendEventToWebsite: sendToWebsiteMock,
}));

describe("createMessage", () => {
	beforeEach(() => {
		sendMessagesMock.mockClear();
		sendToWebsiteMock.mockClear();
		sendToVisitorMock.mockClear();
		getConversationByIdMock.mockClear();
	});

	it("dispatches events to website and visitor", async () => {
		const { createMessage } = await import("./message");

		await createMessage({
			db: {} as never,
			organizationId: "org-1",
			websiteId: "site-1",
			conversationId: "conv-1",
			conversationOwnerVisitorId: "visitor-123",
			message: {
				bodyMd: "agent reply",
				type: "text",
				userId: "user-1",
			},
		});

		expect(sendMessagesMock).toHaveBeenCalledTimes(1);
		expect(sendToWebsiteMock).toHaveBeenCalledTimes(1);
		expect(sendToVisitorMock).toHaveBeenCalledTimes(1);
		expect(sendToVisitorMock.mock.calls[0][0]).toBe("visitor-123");
	});

	it("falls back to conversation lookup when visitorId missing", async () => {
		getConversationByIdMock.mockClear();
		sendToVisitorMock.mockClear();
		sendToWebsiteMock.mockClear();

		const { createMessage } = await import("./message");

		await createMessage({
			db: {} as never,
			organizationId: "org-1",
			websiteId: "site-1",
			conversationId: "conv-1",
			message: {
				bodyMd: "agent reply",
				type: "text",
				userId: "user-1",
			},
		});

		expect(getConversationByIdMock).toHaveBeenCalledTimes(1);
		expect(sendToVisitorMock).toHaveBeenCalledTimes(1);
		expect(sendToVisitorMock.mock.calls[0][0]).toBe("visitor-from-db");
	});
});
