import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AiAgentJobData } from "../types";

const addUniqueJobMock = mock(async () => ({
	status: "created" as const,
	job: {
		id: "wake-job-1",
		getState: async () => "waiting",
	},
}));

const waitUntilReadyMock = mock(async () => {});
const getJobCountsMock = mock(async () => ({
	delayed: 0,
	waiting: 0,
	active: 0,
}));
const closeMock = mock(async () => {});

class MockQueue<T> {
	waitUntilReady = waitUntilReadyMock;
	getJobCounts = getJobCountsMock;
	close = closeMock;
}

mock.module("bullmq", () => ({
	Queue: MockQueue,
}));

mock.module("../utils/unique-job", () => ({
	addUniqueJob: addUniqueJobMock,
}));

const triggerModulePromise = import("./ai-agent");

function buildJobData(overrides: Partial<AiAgentJobData> = {}): AiAgentJobData {
	return {
		conversationId: "conv-1",
		websiteId: "site-1",
		organizationId: "org-1",
		aiAgentId: "ai-1",
		...overrides,
	};
}

describe("createAiAgentTriggers", () => {
	beforeEach(() => {
		addUniqueJobMock.mockReset();
		waitUntilReadyMock.mockReset();
		getJobCountsMock.mockReset();
		closeMock.mockReset();

		addUniqueJobMock.mockResolvedValue({
			status: "created",
			job: {
				id: "wake-job-1",
				getState: async () => "waiting",
			},
		});
		waitUntilReadyMock.mockResolvedValue(undefined);
		getJobCountsMock.mockResolvedValue({ delayed: 0, waiting: 0, active: 0 });
		closeMock.mockResolvedValue(undefined);
	});

	it("builds wake job IDs with triggerMessageId", async () => {
		const { createAiAgentTriggers } = await triggerModulePromise;
		const triggers = createAiAgentTriggers({
			connection: {} as never,
			redisUrl: "redis://localhost:6379",
		});

		const result = await triggers.enqueueAiAgentJob(
			buildJobData({ triggerMessageId: "msg-42" })
		);

		expect(result.status).toBe("created");
		expect(addUniqueJobMock).toHaveBeenCalledTimes(1);
		expect(addUniqueJobMock.mock.calls[0]?.[0]).toMatchObject({
			jobId: "ai-agent-conv-1-msg-42",
			jobName: "ai-agent",
		});

		await triggers.close();
	});

	it("returns skipped when an equivalent wake job already exists", async () => {
		addUniqueJobMock.mockResolvedValue({
			status: "skipped",
			reason: "debouncing",
			existingState: "waiting",
			existingJob: { id: "wake-job-1" },
			existingJobData: buildJobData({ triggerMessageId: "msg-42" }),
		});

		const { createAiAgentTriggers } = await triggerModulePromise;
		const triggers = createAiAgentTriggers({
			connection: {} as never,
			redisUrl: "redis://localhost:6379",
		});

		const result = await triggers.enqueueAiAgentJob(
			buildJobData({ triggerMessageId: "msg-42" })
		);

		expect(result).toEqual({
			status: "skipped",
			existingState: "waiting",
		});
		expect(addUniqueJobMock.mock.calls[0]?.[0]).toMatchObject({
			jobId: "ai-agent-conv-1-msg-42",
		});

		await triggers.close();
	});
});
