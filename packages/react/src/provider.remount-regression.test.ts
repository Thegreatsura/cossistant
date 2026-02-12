import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("provider remount regressions", () => {
	it("keeps websocket identity changes from remounting the provider subtree", () => {
		const providerSource = readFileSync(
			new URL("./provider.tsx", import.meta.url),
			"utf8"
		);

		expect(providerSource).not.toContain("const webSocketKey");
		expect(providerSource).not.toContain("key={webSocketKey}");
	});

	it("keeps realtime provider wrapper stable across hydration", () => {
		const realtimeSource = readFileSync(
			new URL("./realtime/provider.tsx", import.meta.url),
			"utf8"
		);

		expect(realtimeSource).not.toContain("if (!isBrowser)");
		expect(realtimeSource).not.toContain("setIsBrowser(");
		expect(realtimeSource).toContain("function RealtimeProviderInternal");
		expect(realtimeSource).toContain("<RealtimeProviderInternal");
	});
	it("resets connection metadata when auth identity changes", () => {
		const realtimeSource = readFileSync(
			new URL("./realtime/provider.tsx", import.meta.url),
			"utf8"
		);

		expect(realtimeSource).toContain("function toRealtimeAuthIdentity");
		expect(realtimeSource).toContain("function hasRealtimeAuthIdentityChanged");
		expect(realtimeSource).toContain("setConnectionId(null)");
		expect(realtimeSource).toContain("setLastEvent(null)");
		expect(realtimeSource).toContain("setConnectionError(null)");
		expect(realtimeSource).toContain("hasRealtimeAuthIdentityChanged(");
		expect(realtimeSource).toContain("authIdentity");
	});
});
