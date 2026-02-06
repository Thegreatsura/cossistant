export function resolvePipelineFailureAction(params: {
	retryable: boolean;
	failureCount: number;
	failureThreshold: number;
}): "drop" | "retry" {
	if (!params.retryable) {
		return "drop";
	}

	return params.failureCount >= params.failureThreshold ? "drop" : "retry";
}
