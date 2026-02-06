import { describe, expect, it } from "bun:test";
import { resolveCoalescedVisitorBatch } from "./coalescing";

type MessageMetadata = Parameters<
	typeof resolveCoalescedVisitorBatch
>[0]["headMessage"];

function buildMetadata(
	overrides: Partial<MessageMetadata> & Pick<MessageMetadata, "id">
): MessageMetadata {
	return {
		id: overrides.id,
		userId: overrides.userId ?? null,
		visitorId: overrides.visitorId ?? null,
	};
}

describe("resolveCoalescedVisitorBatch", () => {
	it("coalesces leading contiguous visitor messages and selects the latest as effective trigger", () => {
		const first = buildMetadata({ id: "m-1", visitorId: "visitor-1" });
		const second = buildMetadata({ id: "m-2", visitorId: "visitor-1" });
		const third = buildMetadata({ id: "m-3", userId: "user-1" });
		const metadataById = new Map([
			[first.id, first],
			[second.id, second],
			[third.id, third],
		]);

		const result = resolveCoalescedVisitorBatch({
			headMessage: first,
			orderedMessageIds: [first.id, second.id, third.id],
			metadataById,
		});

		expect(result.effectiveMessage.id).toBe("m-2");
		expect(result.coalescedMessageIds).toEqual(["m-1", "m-2"]);
	});

	it("does not coalesce when the head message is not visitor-authored", () => {
		const head = buildMetadata({ id: "m-10", userId: "user-1" });
		const visitor = buildMetadata({ id: "m-11", visitorId: "visitor-1" });
		const metadataById = new Map([
			[head.id, head],
			[visitor.id, visitor],
		]);

		const result = resolveCoalescedVisitorBatch({
			headMessage: head,
			orderedMessageIds: [head.id, visitor.id],
			metadataById,
		});

		expect(result.effectiveMessage.id).toBe("m-10");
		expect(result.coalescedMessageIds).toEqual(["m-10"]);
	});

	it("stops coalescing at first non-triggerable entry", () => {
		const first = buildMetadata({ id: "m-20", visitorId: "visitor-1" });
		const second = buildMetadata({ id: "m-21", visitorId: null, userId: null });
		const third = buildMetadata({ id: "m-22", visitorId: "visitor-1" });
		const metadataById = new Map([
			[first.id, first],
			[second.id, second],
			[third.id, third],
		]);

		const result = resolveCoalescedVisitorBatch({
			headMessage: first,
			orderedMessageIds: [first.id, second.id, third.id],
			metadataById,
		});

		expect(result.effectiveMessage.id).toBe("m-20");
		expect(result.coalescedMessageIds).toEqual(["m-20"]);
	});
});
