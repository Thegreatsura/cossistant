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

const updatePriorityModulePromise = import("./update-priority");

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
	};
}

describe("updatePriority", () => {
	beforeEach(() => {
		realtimeEmitMock.mockReset();
		createConversationEventMock.mockReset();
		eqMock.mockReset();
	});

	it("updates priority, emits structured event, and broadcasts dashboard-only realtime update", async () => {
		const conv = {
			id: "conv-1",
			priority: "normal",
			visitorId: "visitor-1",
		} as const;

		const updatedConversation = {
			priority: "urgent",
		};

		const dbHarness = createDbHarness([updatedConversation]);
		const { updatePriority } = await updatePriorityModulePromise;

		await updatePriority({
			db: dbHarness.db as never,
			conversation: conv as never,
			organizationId: "org-1",
			websiteId: "site-1",
			aiAgentId: "ai-1",
			newPriority: "urgent",
		});

		expect(dbHarness.updateMock).toHaveBeenCalledTimes(1);
		expect(dbHarness.setMock).toHaveBeenCalledTimes(1);
		const setArg = dbHarness.setMock.mock.calls[0]?.[0] as Record<
			string,
			unknown
		>;
		expect(setArg.priority).toBe("urgent");
		expect(typeof setArg.updatedAt).toBe("string");

		expect(createConversationEventMock).toHaveBeenCalledTimes(1);
		const eventArgs = createConversationEventMock.mock.calls[0]?.[0] as {
			event: { type: string; metadata: Record<string, unknown> };
		};
		expect(eventArgs.event.type).toBe("priority_changed");
		expect(eventArgs.event.metadata).toEqual({
			previousPriority: "normal",
			newPriority: "urgent",
		});

		expect(realtimeEmitMock).toHaveBeenCalledTimes(1);
		expect(realtimeEmitMock.mock.calls[0]?.[0]).toBe("conversationUpdated");
		expect(realtimeEmitMock.mock.calls[0]?.[1]).toEqual({
			websiteId: "site-1",
			organizationId: "org-1",
			visitorId: null,
			userId: null,
			conversationId: "conv-1",
			updates: {
				priority: "urgent",
			},
			aiAgentId: "ai-1",
		});
	});

	it("is a no-op when priority is unchanged", async () => {
		const conv = {
			id: "conv-2",
			priority: "high",
			visitorId: "visitor-2",
		} as const;

		const dbHarness = createDbHarness([]);
		const { updatePriority } = await updatePriorityModulePromise;

		await updatePriority({
			db: dbHarness.db as never,
			conversation: conv as never,
			organizationId: "org-1",
			websiteId: "site-1",
			aiAgentId: "ai-1",
			newPriority: "high",
		});

		expect(dbHarness.updateMock).toHaveBeenCalledTimes(0);
		expect(createConversationEventMock).toHaveBeenCalledTimes(0);
		expect(realtimeEmitMock).toHaveBeenCalledTimes(0);
	});
});
