import { describe, expect, it } from "bun:test";
import { filterSeenByIdsForViewer } from "./conversation-timeline-utils";

describe("filterSeenByIdsForViewer", () => {
	it("returns the original list when viewerId is not provided", () => {
		const ids = ["user-1", "ai-1"];
		expect(filterSeenByIdsForViewer(ids)).toBe(ids);
	});

	it("returns the original list when viewerId is not present", () => {
		const ids = ["user-1", "ai-1"];
		expect(filterSeenByIdsForViewer(ids, "visitor-1")).toBe(ids);
	});

	it("filters out the viewerId when present", () => {
		const ids = ["visitor-1", "user-1"];
		const result = filterSeenByIdsForViewer(ids, "visitor-1");
		expect(result).toEqual(["user-1"]);
	});
});
