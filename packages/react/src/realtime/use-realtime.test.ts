import { describe, expect, it } from "bun:test";
import type { RealtimeEvent } from "@cossistant/types/realtime-events";
import { shouldDeliverEvent } from "./event-filter";

describe("shouldDeliverEvent", () => {
	const baseEvent: RealtimeEvent<"messageCreated"> = {
		type: "messageCreated",
		payload: {
			websiteId: "site-1",
			organizationId: "org-1",
			userId: "user-1",
			visitorId: "visitor-1",
			conversationId: "conv-1",
			message: {
				id: "msg-1",
				bodyMd: "Hello",
				type: "text",
				userId: "user-1",
				aiAgentId: null,
				visitorId: "visitor-1",
				organizationId: "org-1",
				websiteId: "site-1",
				conversationId: "conv-1",
				parentMessageId: null,
				modelUsed: null,
				visibility: "public",
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-01T00:00:00.000Z",
				deletedAt: null,
			},
		},
	};

	it("allows events that match the website and visitor", () => {
		const result = shouldDeliverEvent(baseEvent, "site-1", "visitor-1");
		expect(result).toBe(true);
	});

	it("blocks events from other websites", () => {
		const result = shouldDeliverEvent(baseEvent, "site-2", "visitor-1");
		expect(result).toBe(false);
	});

	it("falls back to the message visitor when the payload visitor is null", () => {
		const eventWithoutVisitor: RealtimeEvent<"messageCreated"> = {
			...baseEvent,
			payload: {
				...baseEvent.payload,
				visitorId: null,
				message: {
					...baseEvent.payload.message,
					visitorId: "visitor-1",
				},
			},
		};

		expect(shouldDeliverEvent(eventWithoutVisitor, "site-1", "visitor-1")).toBe(
			true
		);
		expect(shouldDeliverEvent(eventWithoutVisitor, "site-1", "visitor-2")).toBe(
			false
		);
	});

	it("delivers events when the client visitor id is not yet known", () => {
		const result = shouldDeliverEvent(baseEvent, "site-1", null);
		expect(result).toBe(true);
	});
});
