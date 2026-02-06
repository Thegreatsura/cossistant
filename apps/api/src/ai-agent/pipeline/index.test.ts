import { beforeEach, describe, expect, it, mock } from "bun:test";

const intakeMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const decideMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const generateMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const executeMock = mock(
	(async () => null) as (...args: unknown[]) => Promise<unknown>
);
const followupMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);

const emitDecisionMadeMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);
const emitWorkflowCompletedMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);
const emitTypingStopMock = mock((async () => {}) as (
	...args: unknown[]
) => Promise<void>);
const typingHeartbeatStartMock = mock(async () => {});
const typingHeartbeatStopMock = mock(async () => {});

class MockTypingHeartbeat {
	private isRunning = false;

	async start(): Promise<void> {
		this.isRunning = true;
		await typingHeartbeatStartMock();
	}

	async stop(): Promise<void> {
		if (!this.isRunning) {
			return;
		}
		this.isRunning = false;
		await typingHeartbeatStopMock();
	}

	get running(): boolean {
		return this.isRunning;
	}
}

mock.module("./1-intake", () => ({
	intake: intakeMock,
}));

mock.module("./2-decision", () => ({
	decide: decideMock,
}));

mock.module("./3-generation", () => ({
	generate: generateMock,
}));

mock.module("./4-execution", () => ({
	execute: executeMock,
}));

mock.module("./5-followup", () => ({
	followup: followupMock,
}));

mock.module("../events", () => ({
	emitDecisionMade: emitDecisionMadeMock,
	emitTypingStop: emitTypingStopMock,
	emitWorkflowCompleted: emitWorkflowCompletedMock,
	TypingHeartbeat: MockTypingHeartbeat,
}));

mock.module("../actions/send-message", () => ({
	sendMessage: mock(async () => ({
		messageId: "fallback-msg",
		created: true,
		paused: false,
	})),
}));

const pipelineModulePromise = import("./index");

function buildReadyIntakeResult() {
	return {
		status: "ready",
		aiAgent: {
			id: "ai-1",
		},
		conversation: {
			id: "conv-1",
			websiteId: "site-1",
			organizationId: "org-1",
			visitorId: "visitor-1",
		},
		conversationHistory: [],
		visitorContext: null,
		conversationState: {},
		triggerMessage: {
			messageId: "trigger-msg-1",
			content: "hello",
			senderType: "human_agent",
			senderId: "user-1",
			senderName: "Agent",
			timestamp: new Date().toISOString(),
			visibility: "public",
		},
	};
}

function buildDecisionResult() {
	return {
		shouldAct: true,
		reason: "new visitor message",
		mode: "respond_to_visitor",
		humanCommand: null,
		isEscalated: false,
		escalationReason: null,
		smartDecision: null,
	};
}

describe("runAiAgentPipeline retryability and typing cleanup", () => {
	beforeEach(() => {
		intakeMock.mockReset();
		decideMock.mockReset();
		generateMock.mockReset();
		executeMock.mockReset();
		followupMock.mockReset();
		emitDecisionMadeMock.mockReset();
		emitWorkflowCompletedMock.mockReset();
		emitTypingStopMock.mockReset();
		typingHeartbeatStartMock.mockReset();
		typingHeartbeatStopMock.mockReset();

		intakeMock.mockResolvedValue(buildReadyIntakeResult());
		decideMock.mockResolvedValue(buildDecisionResult());
		executeMock.mockResolvedValue({});
		followupMock.mockResolvedValue(undefined);
	});

	it("marks failures before any public send as retryable", async () => {
		const { runAiAgentPipeline } = await pipelineModulePromise;
		generateMock.mockImplementation(async () => {
			throw new Error("generation failed before send");
		});

		const result = await runAiAgentPipeline({
			db: {} as never,
			input: {
				conversationId: "conv-1",
				messageId: "trigger-msg-1",
				messageCreatedAt: new Date().toISOString(),
				websiteId: "site-1",
				organizationId: "org-1",
				visitorId: "visitor-1",
				aiAgentId: "ai-1",
				workflowRunId: "workflow-1",
				jobId: "job-1",
			},
		});

		expect(result.status).toBe("error");
		expect(result.publicMessagesSent).toBe(0);
		expect(result.retryable).toBe(true);
		expect(typingHeartbeatStopMock).toHaveBeenCalledTimes(1);
		expect(emitTypingStopMock).toHaveBeenCalledTimes(1);
	});

	it("marks failures after a public send as non-retryable", async () => {
		const { runAiAgentPipeline } = await pipelineModulePromise;
		generateMock.mockImplementation(async (...args: unknown[]) => {
			const [input] = args as [
				{
					onPublicMessageSent?: (params: {
						messageId: string;
						created: boolean;
					}) => void;
				},
			];
			input.onPublicMessageSent?.({
				messageId: "pub-msg-1",
				created: true,
			});
			throw new Error("generation failed after send");
		});

		const result = await runAiAgentPipeline({
			db: {} as never,
			input: {
				conversationId: "conv-1",
				messageId: "trigger-msg-1",
				messageCreatedAt: new Date().toISOString(),
				websiteId: "site-1",
				organizationId: "org-1",
				visitorId: "visitor-1",
				aiAgentId: "ai-1",
				workflowRunId: "workflow-2",
				jobId: "job-2",
			},
		});

		expect(result.status).toBe("error");
		expect(result.publicMessagesSent).toBe(1);
		expect(result.retryable).toBe(false);
		expect(typingHeartbeatStopMock).toHaveBeenCalledTimes(1);
		expect(emitTypingStopMock).toHaveBeenCalledTimes(1);
	});

	it("always emits final typing stop cleanup on successful runs", async () => {
		const { runAiAgentPipeline } = await pipelineModulePromise;
		generateMock.mockResolvedValue({
			decision: {
				action: "skip",
				reasoning: "nothing to send",
				confidence: 0.8,
			},
			toolCalls: {
				sendMessage: 0,
				sendPrivateMessage: 0,
			},
		});

		const result = await runAiAgentPipeline({
			db: {} as never,
			input: {
				conversationId: "conv-1",
				messageId: "trigger-msg-1",
				messageCreatedAt: new Date().toISOString(),
				websiteId: "site-1",
				organizationId: "org-1",
				visitorId: "visitor-1",
				aiAgentId: "ai-1",
				workflowRunId: "workflow-3",
				jobId: "job-3",
			},
		});

		expect(result.status).toBe("completed");
		expect(result.retryable).toBe(false);
		expect(typingHeartbeatStopMock).toHaveBeenCalledTimes(1);
		expect(emitTypingStopMock).toHaveBeenCalledTimes(1);
	});
});
