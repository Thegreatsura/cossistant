import { beforeEach, describe, expect, it, mock } from "bun:test";

const runSmartDecisionMock = mock((async () => ({
	intent: "observe" as const,
	reasoning: "fallback",
	confidence: "high" as const,
})) as (...args: unknown[]) => Promise<unknown>);

mock.module("./2a-smart-decision", () => ({
	runSmartDecision: runSmartDecisionMock,
}));

const modulePromise = import("./2-decision");

function visitorMessage(
	content: string,
	overrides: Partial<{
		messageId: string;
		visibility: "public" | "private";
		senderType: "visitor" | "human_agent" | "ai_agent";
		senderName: string | null;
	}>
): {
	messageId: string;
	content: string;
	senderType: "visitor" | "human_agent" | "ai_agent";
	senderId: string;
	senderName: string | null;
	timestamp: string;
	visibility: "public" | "private";
} {
	return {
		messageId: overrides.messageId ?? "msg-trigger",
		content,
		senderType: overrides.senderType ?? "visitor",
		senderId: "sender-1",
		senderName: overrides.senderName ?? null,
		timestamp: new Date().toISOString(),
		visibility: overrides.visibility ?? "public",
	};
}

function buildInput(
	overrides: Partial<{
		conversationHistory: ReturnType<typeof visitorMessage>[];
		triggerMessage: ReturnType<typeof visitorMessage> | null;
	}>
) {
	const triggerMessage =
		overrides.triggerMessage ?? visitorMessage("Thanks", {});
	return {
		aiAgent: {
			id: "ai-1",
			name: "Coss",
		},
		conversation: {
			id: "conv-1",
			aiPausedUntil: null,
		},
		conversationHistory: overrides.conversationHistory ?? [triggerMessage],
		conversationState: {
			hasHumanAssignee: false,
			assigneeIds: [],
			participantIds: [],
			isEscalated: false,
			escalationReason: null,
		},
		triggerMessage,
	};
}

describe("decide", () => {
	beforeEach(() => {
		runSmartDecisionMock.mockReset();
		runSmartDecisionMock.mockResolvedValue({
			intent: "observe",
			reasoning: "fallback",
			confidence: "high",
		});
	});

	it("skips non-actionable visitor acknowledgements", async () => {
		const { decide } = await modulePromise;
		const input = buildInput({
			triggerMessage: visitorMessage("thanks", {}),
		});

		const result = await decide(input as never);

		expect(result.shouldAct).toBe(false);
		expect(result.mode).toBe("background_only");
		expect(result.reason).toContain("acknowledgement");
		expect(runSmartDecisionMock).toHaveBeenCalledTimes(0);
	});

	it("skips follow-up greetings after a prior team/AI public reply", async () => {
		const { decide } = await modulePromise;
		const priorTeam = visitorMessage("Happy to help", {
			messageId: "msg-team",
			senderType: "human_agent",
			senderName: "Sarah",
		});
		const trigger = visitorMessage("hi", { messageId: "msg-trigger-2" });
		const input = buildInput({
			conversationHistory: [priorTeam, trigger],
			triggerMessage: trigger,
		});

		const result = await decide(input as never);

		expect(result.shouldAct).toBe(false);
		expect(result.mode).toBe("background_only");
		expect(result.reason).toContain("Greeting-only");
		expect(runSmartDecisionMock).toHaveBeenCalledTimes(0);
	});

	it("still responds when explicitly tagged, even for short acknowledgements", async () => {
		const { decide } = await modulePromise;
		const trigger = visitorMessage("@ai thanks", { messageId: "msg-tagged" });
		const input = buildInput({
			conversationHistory: [trigger],
			triggerMessage: trigger,
		});

		const result = await decide(input as never);

		expect(result.shouldAct).toBe(true);
		expect(result.reason).toContain("explicitly tagged");
	});
});
