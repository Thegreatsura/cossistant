/**
 * Debounced Job Utility
 *
 * Handles the pattern where we want:
 * - One job per conversation (debouncing rapid messages)
 * - Completed/failed jobs should be replaced with new ones
 * - Delayed/waiting/active jobs should be skipped or superseded
 */

import type { Job, JobsOptions, Queue } from "bullmq";

// Use simpler Job type to avoid BullMQ's complex generic inference
type SimpleJob<T> = Job<T, unknown, string>;

export type DebouncedJobResult<T> =
	| { status: "created"; job: SimpleJob<T> }
	| {
			status: "replaced";
			job: SimpleJob<T>;
			previousState: "completed" | "failed";
	  }
	| {
			status: "skipped";
			reason: "debouncing" | "active" | "unexpected";
			existingState: string;
	  };

export type AddDebouncedJobParams<T> = {
	queue: Queue<T>;
	jobId: string;
	jobName: string;
	data: T;
	options: Omit<JobsOptions, "jobId">;
	logPrefix: string;
};

/**
 * Add a job with debouncing behavior:
 * - If no existing job → create new job
 * - If existing job is completed/failed → remove and create new job
 * - If existing job is delayed/waiting → skip (debouncing)
 * - If existing job is active → create new job with unique ID (will supersede via workflowRunId)
 */
export async function addDebouncedJob<T>(
	params: AddDebouncedJobParams<T>
): Promise<DebouncedJobResult<T>> {
	const { queue, jobId, jobName, data, options, logPrefix } = params;
	const existingJob = await queue.getJob(jobId);

	if (existingJob) {
		const existingState = await existingJob.getState();

		// Completed or failed → remove and replace
		if (existingState === "completed" || existingState === "failed") {
			await existingJob.remove();
			console.log(`${logPrefix} Removed ${existingState} job ${jobId}`);
			// Cast to any to bypass BullMQ's complex generic constraints
			const job = (await (queue as Queue).add(jobName, data, {
				...options,
				jobId,
			})) as SimpleJob<T>;
			return { status: "replaced", job, previousState: existingState };
		}

		// Delayed or waiting → skip (debouncing working correctly)
		if (existingState === "delayed" || existingState === "waiting") {
			console.log(
				`${logPrefix} Job ${jobId} already ${existingState}, skipping (debouncing)`
			);
			return { status: "skipped", reason: "debouncing", existingState };
		}

		// Active → create new job with unique ID, active one will check isWorkflowRunActive
		if (existingState === "active") {
			console.log(
				`${logPrefix} Job ${jobId} currently active, creating superseding job`
			);
			const uniqueJobId = `${jobId}-${Date.now()}`;
			// Cast to any to bypass BullMQ's complex generic constraints
			const job = (await (queue as Queue).add(jobName, data, {
				...options,
				jobId: uniqueJobId,
			})) as SimpleJob<T>;
			return { status: "created", job };
		}

		// Unexpected state → skip to be safe
		console.warn(
			`${logPrefix} Job ${jobId} in unexpected state: ${existingState}, skipping`
		);
		return { status: "skipped", reason: "unexpected", existingState };
	}

	// No existing job → create new one
	// Cast to any to bypass BullMQ's complex generic constraints
	const job = (await (queue as Queue).add(jobName, data, {
		...options,
		jobId,
	})) as SimpleJob<T>;
	return { status: "created", job };
}
