import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { AuthResult } from "./websocket-connection";

mock.module("@api/lib/pubsub", () => ({
	pubsub: {
		getServerId: () => "server-1",
		updatePresence: async () => {},
	},
}));

mock.module("@api/ws/socket", () => ({
	generateConnectionId: () => "generated-connection-id",
}));

const modulePromise = import("./websocket-connection");

let createConnectionEvent: (
	authResult: AuthResult,
	connectionId: string
) => unknown;

beforeEach(async () => {
	const module = await modulePromise;
	createConnectionEvent = module.createConnectionEvent;
});

describe("createConnectionEvent", () => {
	it("creates a USER_CONNECTED event when a user id is present", () => {
		const authResult: AuthResult = {
			userId: "user-123",
			websiteId: "site-001",
			organizationId: "org-002",
		};

		const event = createConnectionEvent(authResult, "conn-abc") as {
			type: string;
			data: Record<string, unknown>;
			timestamp: number;
		};

		expect(event.type).toBe("USER_CONNECTED");
		expect(event.data).toMatchObject({
			userId: "user-123",
			connectionId: "conn-abc",
		});
		expect(typeof event.data.timestamp).toBe("number");
		expect(typeof event.timestamp).toBe("number");
	});

	it("creates a VISITOR_CONNECTED event when a visitor id is present", () => {
		const authResult: AuthResult = {
			visitorId: "visitor-456",
			websiteId: "site-001",
			organizationId: "org-002",
		};

		const event = createConnectionEvent(authResult, "conn-def") as {
			type: string;
			data: Record<string, unknown>;
			timestamp: number;
		};

		expect(event.type).toBe("VISITOR_CONNECTED");
		expect(event.data).toMatchObject({
			visitorId: "visitor-456",
			connectionId: "conn-def",
		});
		expect(typeof event.data.timestamp).toBe("number");
		expect(typeof event.timestamp).toBe("number");
	});

	it("throws when neither user nor visitor identifiers are provided", () => {
		const authResult = {} as AuthResult;

		expect(() => createConnectionEvent(authResult, "conn-ghi")).toThrow(
			"No visitorId available for visitor connection"
		);
	});
});
