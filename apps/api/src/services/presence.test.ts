import { describe, expect, it } from "bun:test";
import { ONLINE_WINDOW_MS, resolvePresenceStatus } from "./presence";

describe("resolvePresenceStatus", () => {
	it("returns online when last seen is within online window", () => {
		const status = resolvePresenceStatus(Date.now() - ONLINE_WINDOW_MS + 1000);
		expect(status).toBe("online");
	});

	it("returns away when last seen is outside online window", () => {
		const status = resolvePresenceStatus(Date.now() - ONLINE_WINDOW_MS - 1000);
		expect(status).toBe("away");
	});
});
