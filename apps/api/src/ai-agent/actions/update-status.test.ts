import { beforeEach, describe, expect, it, mock } from "bun:test";

const realtimeEmitMock = mock((async () => {}) as (
	eventType: string,
	payload: unknown
) => Promise<void>);
const createConversationEventMock = mock((async () => {}) as (
	params: unknown
) => Promise<void>);
const eqMock = mock((left: unknown, right: unknown) => ({ left, right }));

mock.module("@api/realtime/emitter", () => ({
	realtime: {
		emit: realtimeEmitMock,
	},
}));

mock.module("@api/utils/conversation-event", () => ({
	createConversationEvent: createConversationEventMock,
}));

mock.module("@api/db/schema/conversation", () => ({
	conversation: {
		id: "conversation.id",
	},
}));

mock.module("drizzle-orm", () => ({
	eq: eqMock,
}));

const updateStatusModulePromise = import("./update-status");

type DbHarness = {
	db: {
		update: (...args: unknown[]) => {
			set: (...args: unknown[]) => {
				where: (...args: unknown[]) => {
					returning: () => Promise<unknown[]>;
				};
			};
		};
	};
	updateMock: ReturnType<typeof mock>;
	setMock: ReturnType<typeof mock>;
	whereMock: ReturnType<typeof mock>;
};

function createDbHarness(returningRows: unknown[]): DbHarness {
	const returningMock = mock(
		(async () => returningRows) as () => Promise<unknown[]>
	);
	const whereMock = mock((() => ({ returning: returningMock })) as (
		...args: unknown[]
	) => { returning: () => Promise<unknown[]> });
	const setMock = mock((() => ({ where: whereMock })) as (
		...args: unknown[]
	) => {
		where: (...args: unknown[]) => { returning: () => Promise<unknown[]> };
	});
	const updateMock = mock((() => ({ set: setMock })) as (
		...args: unknown[]
	) => {
		set: (...args: unknown[]) => {
			where: (...args: unknown[]) => { returning: () => Promise<unknown[]> };
		};
	});

	return {
		db: {
			update: updateMock,
		},
		updateMock,
		setMock,
		whereMock,
	};
}

describe("updateStatus", () => {
	beforeEach(() => {
		realtimeEmitMock.mockReset();
		createConversationEventMock.mockReset();
		eqMock.mockReset();
	});

	it("updates resolved status, emits structured event, and broadcasts conversationUpdated", async () => {
		const now = Date.now();
		const startedAt = new Date(now - 45_000).toISOString();
		const conv = {
			id: "conv-1",
			status: "open",
			visitorId: "visitor-1",
			startedAt,
			resolutionTime: null,
		} as const;

		const updatedConversation = {
			status: "resolved",
			resolvedAt: new Date(now).toISOString(),
			resolvedByUserId: null,
			resolvedByAiAgentId: "ai-1",
			resolutionTime: 45,
		};

		const dbHarness = createDbHarness([updatedConversation]);
		const { updateStatus } = await updateStatusModulePromise;

		await updateStatus({
			db: dbHarness.db as never,
			conversation: conv as never,
			organizationId: "org-1",
			websiteId: "site-1",
			aiAgentId: "ai-1",
			newStatus: "resolved",
		});

		expect(dbHarness.updateMock).toHaveBeenCalledTimes(1);
		expect(dbHarness.setMock).toHaveBeenCalledTimes(1);
		const setArg = dbHarness.setMock.mock.calls[0]?.[0] as Record<
			string,
			unknown
		>;
		expect(setArg.status).toBe("resolved");
		expect(setArg.resolvedByAiAgentId).toBe("ai-1");
		expect(setArg.resolvedByUserId).toBeNull();
		expect(typeof setArg.resolvedAt).toBe("string");
		expect(typeof setArg.resolutionTime).toBe("number");
		expect((setArg.resolutionTime as number) > 0).toBe(true);

		expect(createConversationEventMock).toHaveBeenCalledTimes(1);
		const eventArgs = createConversationEventMock.mock.calls[0]?.[0] as {
			event: { type: string; metadata: Record<string, unknown> };
		};
		expect(eventArgs.event.type).toBe("resolved");
		expect(eventArgs.event.metadata).toEqual({
			previousStatus: "open",
			newStatus: "resolved",
		});

		expect(realtimeEmitMock).toHaveBeenCalledTimes(1);
		expect(realtimeEmitMock.mock.calls[0]?.[0]).toBe("conversationUpdated");
		expect(realtimeEmitMock.mock.calls[0]?.[1]).toEqual({
			websiteId: "site-1",
			organizationId: "org-1",
			visitorId: "visitor-1",
			userId: null,
			conversationId: "conv-1",
			updates: {
				status: "resolved",
				resolvedAt: updatedConversation.resolvedAt,
				resolvedByUserId: null,
				resolvedByAiAgentId: "ai-1",
				resolutionTime: 45,
			},
			aiAgentId: "ai-1",
		});
	});

	it("clears resolution fields for spam and emits status_changed event", async () => {
		const conv = {
			id: "conv-2",
			status: "open",
			visitorId: "visitor-2",
			startedAt: null,
			resolutionTime: 88,
		} as const;

		const updatedConversation = {
			status: "spam",
			resolvedAt: null,
			resolvedByUserId: null,
			resolvedByAiAgentId: null,
			resolutionTime: null,
		};

		const dbHarness = createDbHarness([updatedConversation]);
		const { updateStatus } = await updateStatusModulePromise;

		await updateStatus({
			db: dbHarness.db as never,
			conversation: conv as never,
			organizationId: "org-1",
			websiteId: "site-1",
			aiAgentId: "ai-1",
			newStatus: "spam",
		});

		const setArg = dbHarness.setMock.mock.calls[0]?.[0] as Record<
			string,
			unknown
		>;
		expect(setArg.status).toBe("spam");
		expect(setArg.resolvedAt).toBeNull();
		expect(setArg.resolvedByUserId).toBeNull();
		expect(setArg.resolvedByAiAgentId).toBeNull();
		expect(setArg.resolutionTime).toBeNull();

		const eventArgs = createConversationEventMock.mock.calls[0]?.[0] as {
			event: { type: string; metadata: Record<string, unknown> };
		};
		expect(eventArgs.event.type).toBe("status_changed");
		expect(eventArgs.event.metadata).toEqual({
			previousStatus: "open",
			newStatus: "spam",
		});

		expect(realtimeEmitMock.mock.calls[0]?.[1]).toMatchObject({
			updates: {
				status: "spam",
				resolvedAt: null,
				resolvedByUserId: null,
				resolvedByAiAgentId: null,
				resolutionTime: null,
			},
		});
	});

	it("is a no-op when status is unchanged", async () => {
		const conv = {
			id: "conv-3",
			status: "resolved",
			visitorId: "visitor-3",
			startedAt: null,
			resolutionTime: null,
		} as const;

		const dbHarness = createDbHarness([]);
		const { updateStatus } = await updateStatusModulePromise;

		await updateStatus({
			db: dbHarness.db as never,
			conversation: conv as never,
			organizationId: "org-1",
			websiteId: "site-1",
			aiAgentId: "ai-1",
			newStatus: "resolved",
		});

		expect(dbHarness.updateMock).toHaveBeenCalledTimes(0);
		expect(createConversationEventMock).toHaveBeenCalledTimes(0);
		expect(realtimeEmitMock).toHaveBeenCalledTimes(0);
	});
});
