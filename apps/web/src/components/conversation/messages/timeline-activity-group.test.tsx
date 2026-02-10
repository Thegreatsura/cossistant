import { describe, expect, it } from "bun:test";
import type { RouterOutputs } from "@api/trpc/types";
import type { GroupedActivity } from "@cossistant/next/hooks";
import type { AvailableAIAgent } from "@cossistant/types";
import { SenderType } from "@cossistant/types";
import type { TimelineItem } from "@cossistant/types/api/timeline-item";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ConversationHeader } from "@/contexts/inboxes";
import { TimelineActivityGroup } from "./timeline-activity-group";

function createTimelineItem(overrides: Partial<TimelineItem>): TimelineItem {
	return {
		id: "item-1",
		conversationId: "conv-1",
		organizationId: "org-1",
		visibility: "public",
		type: "event",
		text: null,
		parts: [],
		userId: null,
		visitorId: null,
		aiAgentId: null,
		tool: null,
		createdAt: "2026-01-01T10:00:00.000Z",
		deletedAt: null,
		...overrides,
	};
}

function createEventItem({
	id,
	createdAt,
	eventType = "participant_joined",
	userId = "user-1",
	actorUserId = "user-1",
}: {
	id: string;
	createdAt: string;
	eventType?: "participant_joined" | "status_changed";
	userId?: string | null;
	actorUserId?: string | null;
}): TimelineItem {
	return createTimelineItem({
		id,
		type: "event",
		userId,
		createdAt,
		parts: [
			{
				type: "event",
				eventType,
				actorUserId,
				actorAiAgentId: null,
				targetUserId: null,
				targetAiAgentId: null,
				message: null,
			},
		],
	});
}

function createToolItem({
	id,
	createdAt,
	toolName,
	text,
	userId = "user-1",
	state = "result",
}: {
	id: string;
	createdAt: string;
	toolName: string;
	text: string;
	userId?: string | null;
	state?: "partial" | "result" | "error";
}): TimelineItem {
	return createTimelineItem({
		id,
		type: "tool",
		userId,
		text,
		tool: toolName,
		createdAt,
		parts: [
			{
				type: `tool-${toolName}`,
				toolCallId: `${id}-call`,
				toolName,
				input: {},
				state,
			},
		],
	});
}

function createActivityGroup(items: TimelineItem[]): GroupedActivity {
	const firstItem = items[0];
	const lastItem = items.at(-1);
	const senderId = firstItem?.userId ?? "user-1";

	return {
		type: "activity_group",
		senderId,
		senderType: SenderType.TEAM_MEMBER,
		items,
		firstItemId: firstItem?.id ?? "",
		lastItemId: lastItem?.id ?? "",
		firstItemTime: new Date(firstItem?.createdAt ?? "2026-01-01T10:00:00.000Z"),
		lastItemTime: new Date(lastItem?.createdAt ?? "2026-01-01T10:00:00.000Z"),
		hasEvent: items.some((item) => item.type === "event"),
		hasTool: items.some((item) => item.type === "tool"),
	};
}

const TEAM_MEMBERS = [
	{
		id: "user-1",
		name: "Anthony Riera",
		email: "anthony@example.com",
		image: null,
		lastSeenAt: null,
	},
] as unknown as RouterOutputs["user"]["getWebsiteMembers"];

const AVAILABLE_AI_AGENTS: AvailableAIAgent[] = [];

const VISITOR = {
	id: "visitor-1",
	contact: {
		name: "Marc",
		email: "marc@example.com",
		image: null,
	},
} as unknown as ConversationHeader["visitor"];

function renderActivityGroup(
	group: GroupedActivity,
	isDeveloperModeEnabled = false
): string {
	return renderToStaticMarkup(
		React.createElement(TimelineActivityGroup, {
			group,
			availableAIAgents: AVAILABLE_AI_AGENTS,
			teamMembers: TEAM_MEMBERS,
			currentUserId: "user-1",
			visitor: VISITOR,
			isDeveloperModeEnabled,
		})
	);
}

describe("TimelineActivityGroup", () => {
	it("shows sender avatar for viewer-authored activity groups", () => {
		const group = createActivityGroup([
			createEventItem({
				id: "event-1",
				createdAt: "2026-01-01T10:00:00.000Z",
			}),
		]);

		const html = renderActivityGroup(group);

		expect(html).toContain("Anthony Riera");
		expect(html).toContain('data-slot="avatar"');
		expect(html).not.toContain("flex-row-reverse");
		expect(html).not.toContain("mb-2 px-1 text-muted-foreground text-xs");
	});

	it("renders per-row bullet icons for multi-row activity groups", () => {
		const group = createActivityGroup([
			createEventItem({
				id: "event-1",
				createdAt: "2026-01-01T10:00:00.000Z",
				eventType: "participant_joined",
			}),
			createToolItem({
				id: "tool-1",
				createdAt: "2026-01-01T10:01:00.000Z",
				toolName: "updateSentiment",
				text: "Updated sentiment to positive",
			}),
		]);

		const html = renderActivityGroup(group);

		expect(html).toContain('data-activity-bullet="event"');
		expect(html).toContain('data-activity-bullet="tool"');
		expect(html).toContain('data-event-action-icon="participant_joined"');
		expect(html).toContain('data-tool-action-icon="updateSentiment"');
	});

	it("does not render row-level bullet icons for single-row activity groups", () => {
		const group = createActivityGroup([
			createToolItem({
				id: "tool-1",
				createdAt: "2026-01-01T10:00:00.000Z",
				toolName: "updateSentiment",
				text: "Updated sentiment to positive",
			}),
		]);

		const html = renderActivityGroup(group);

		expect(html).not.toContain("data-activity-bullet=");
		expect(html).not.toContain("data-tool-action-icon=");
		expect(html).not.toContain("data-event-action-icon=");
	});

	it("hides non-customer-facing tools in non-developer mode", () => {
		const group = createActivityGroup([
			createToolItem({
				id: "tool-log-1",
				createdAt: "2026-01-01T10:00:00.000Z",
				toolName: "aiDecision",
				text: "Decision log",
			}),
		]);

		const html = renderActivityGroup(group, false);
		expect(html).toBe("");
	});
});
