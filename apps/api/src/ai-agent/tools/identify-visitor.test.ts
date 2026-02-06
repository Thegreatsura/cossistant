import { beforeEach, describe, expect, it, mock } from "bun:test";

const getCompleteVisitorWithContactMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const identifyContactMock = mock((async () => ({
	id: "contact-1",
	email: "jack@example.com",
	name: "Jack",
})) as (...args: unknown[]) => Promise<unknown>);
const linkVisitorToContactMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);
const updateContactMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const createConversationEventMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);

mock.module("@api/db/queries/visitor", () => ({
	getCompleteVisitorWithContact: getCompleteVisitorWithContactMock,
}));

mock.module("@api/db/queries/contact", () => ({
	identifyContact: identifyContactMock,
	linkVisitorToContact: linkVisitorToContactMock,
	updateContact: updateContactMock,
}));

mock.module("@api/utils/conversation-event", () => ({
	createConversationEvent: createConversationEventMock,
}));

mock.module("ai", () => ({
	tool: (definition: unknown) => definition,
}));

const identifyVisitorModulePromise = import("./identify-visitor");

type TestToolContext = {
	conversationId: string;
	organizationId: string;
	websiteId: string;
	visitorId: string;
	aiAgentId: string;
	db: object;
};

function createToolContext(
	overrides: Partial<TestToolContext> = {}
): TestToolContext {
	return {
		conversationId: "conv-1",
		organizationId: "org-1",
		websiteId: "site-1",
		visitorId: "visitor-1",
		aiAgentId: "ai-1",
		db: {},
		...overrides,
	};
}

describe("createIdentifyVisitorTool", () => {
	beforeEach(() => {
		getCompleteVisitorWithContactMock.mockReset();
		identifyContactMock.mockReset();
		linkVisitorToContactMock.mockReset();
		updateContactMock.mockReset();
		createConversationEventMock.mockReset();

		identifyContactMock.mockResolvedValue({
			id: "contact-1",
			email: "jack@example.com",
			name: "Jack",
		});
		linkVisitorToContactMock.mockResolvedValue(undefined);
		updateContactMock.mockResolvedValue(null);
		createConversationEventMock.mockResolvedValue(undefined);
	});

	it("requires name and email together for first-time identification", async () => {
		const { createIdentifyVisitorTool } = await identifyVisitorModulePromise;
		getCompleteVisitorWithContactMock.mockResolvedValue({
			id: "visitor-1",
			contact: null,
		});

		const tool = createIdentifyVisitorTool(
			createToolContext() as never
		) as unknown as {
			execute: (input: { email?: string; name?: string }) => Promise<{
				success: boolean;
				error?: string;
			}>;
		};

		const result = await tool.execute({ name: "Jack" });

		expect(result.success).toBe(false);
		expect(result.error).toContain("provide both name and email");
		expect(identifyContactMock).toHaveBeenCalledTimes(0);
		expect(linkVisitorToContactMock).toHaveBeenCalledTimes(0);
	});

	it("returns cached result on second call in the same run", async () => {
		const { createIdentifyVisitorTool } = await identifyVisitorModulePromise;
		getCompleteVisitorWithContactMock.mockResolvedValue({
			id: "visitor-1",
			contact: null,
		});
		identifyContactMock.mockResolvedValue({
			id: "contact-1",
			email: "jack@example.com",
			name: "Jack",
		});

		const tool = createIdentifyVisitorTool(
			createToolContext() as never
		) as unknown as {
			execute: (input: { email?: string; name?: string }) => Promise<{
				success: boolean;
				data?: {
					visitorId: string;
					contactId: string;
					eventEmitted: boolean;
				};
			}>;
		};

		const first = await tool.execute({
			name: "Jack",
			email: "jack@example.com",
		});
		const second = await tool.execute({
			name: "Jack Updated",
			email: "updated@example.com",
		});

		expect(first.success).toBe(true);
		expect(second.success).toBe(true);
		expect(second.data).toEqual(first.data);
		expect(identifyContactMock).toHaveBeenCalledTimes(1);
		expect(linkVisitorToContactMock).toHaveBeenCalledTimes(1);
		expect(createConversationEventMock).toHaveBeenCalledTimes(1);
	});

	it("emits the identification event once for first valid identification", async () => {
		const { createIdentifyVisitorTool } = await identifyVisitorModulePromise;
		getCompleteVisitorWithContactMock.mockResolvedValue({
			id: "visitor-1",
			contact: null,
		});

		const tool = createIdentifyVisitorTool(
			createToolContext() as never
		) as unknown as {
			execute: (input: { email?: string; name?: string }) => Promise<unknown>;
		};

		await tool.execute({
			name: "Jack",
			email: "jack@example.com",
		});
		await tool.execute({
			name: "Jack",
			email: "jack@example.com",
		});

		expect(createConversationEventMock).toHaveBeenCalledTimes(1);
	});
});
