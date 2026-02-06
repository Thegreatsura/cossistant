import { describe, expect, it } from "bun:test";
import { resolvePipelineFailureAction } from "./failure-policy";

describe("resolvePipelineFailureAction", () => {
	it("drops immediately when pipeline result is non-retryable", () => {
		const action = resolvePipelineFailureAction({
			retryable: false,
			failureCount: 1,
			failureThreshold: 3,
		});

		expect(action).toBe("drop");
	});

	it("retries when retryable and below threshold", () => {
		const action = resolvePipelineFailureAction({
			retryable: true,
			failureCount: 2,
			failureThreshold: 3,
		});

		expect(action).toBe("retry");
	});

	it("drops when retryable failures reach threshold", () => {
		const action = resolvePipelineFailureAction({
			retryable: true,
			failureCount: 3,
			failureThreshold: 3,
		});

		expect(action).toBe("drop");
	});
});
